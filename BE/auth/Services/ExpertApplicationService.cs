using auth.Data;
using auth.DTOs.Requests;
using auth.DTOs.Responses;
using auth.Entities;
using auth.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Status = auth.Entities.ExpertApplicationStatus;

namespace auth.Services;

public sealed class ExpertApplicationService(
    AuthDbContext db,
    IObjectStorage storage,
    TimeProvider clock,
    ILogger<ExpertApplicationService> logger
) : IExpertApplicationService
{
    private DateTimeOffset Now => clock.GetUtcNow();

    // Lock the user row so the same applicant's actions (save draft, upload, submit) never overlap.
    private async Task<User> LockUser(Guid id, CancellationToken ct) =>
        await db
            .Users.FromSqlInterpolated($"SELECT * FROM identity.users WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct)
        ?? throw new AuthFailure(401, "INVALID_SESSION", "Invalid session.");

    private Task<ExpertProfile?> Profile(Guid userId, CancellationToken ct) =>
        db.ExpertProfiles.SingleOrDefaultAsync(x => x.UserId == userId, ct);

    private Task<ExpertApplication?> Latest(Guid profileId, CancellationToken ct) =>
        db
            .ExpertApplications.Where(x => x.ExpertProfileId == profileId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

    private static AuthFailure NotFound() =>
        new(404, "APPLICATION_NOT_FOUND", "Expert application not found.");

    private static AuthFailure Locked(string status) =>
        new(409, "APPLICATION_LOCKED", $"Application cannot be changed while {status}.");

    private void Transition(
        ExpertApplication app,
        ExpertProfile profile,
        Guid actor,
        string to,
        string? note
    )
    {
        db.ExpertApplicationEvents.Add(
            new ExpertApplicationEvent
            {
                ApplicationId = app.Id,
                ActorUserId = actor,
                FromStatus = app.Status,
                ToStatus = to,
                Note = note,
                CreatedAt = Now,
            }
        );
        app.Status = to;
        app.UpdatedAt = Now;
        // expert_profile.status mirrors the latest application for expert-level filtering/display
        profile.Status = to;
        profile.UpdatedAt = Now;
    }

    /// <summary>Get the open application, creating one if none exists or the previous one is closed.</summary>
    private async Task<(ExpertProfile, ExpertApplication)> OpenApplication(
        User user,
        CancellationToken ct
    )
    {
        var profile = await Profile(user.Id, ct);
        if (profile == null)
        {
            profile = new ExpertProfile
            {
                UserId = user.Id,
                Status = Status.Draft,
                CreatedAt = Now,
                UpdatedAt = Now,
            };
            db.ExpertProfiles.Add(profile);
        }
        var latest =
            db.Entry(profile).State == EntityState.Added ? null : await Latest(profile.Id, ct);
        if (latest != null && !ExpertApplicationRules.IsClosed(latest.Status))
            return (profile, latest);
        if (latest?.EarliestReapplyAt > Now)
            throw new AuthFailure(
                409,
                "REAPPLY_TOO_EARLY",
                $"A new application is allowed from {latest.EarliestReapplyAt:O}."
            );
        var app = new ExpertApplication
        {
            ExpertProfileId = profile.Id,
            Status = Status.Draft,
            PreviousApplicationId = latest?.Id,
            CreatedAt = Now,
            UpdatedAt = Now,
        };
        db.ExpertApplications.Add(app);
        db.ExpertApplicationEvents.Add(
            new ExpertApplicationEvent
            {
                ApplicationId = app.Id,
                ActorUserId = user.Id,
                ToStatus = Status.Draft,
                CreatedAt = Now,
            }
        );
        profile.Status = Status.Draft;
        return (profile, app);
    }

    private static string[] Missing(
        User user,
        ExpertProfile p,
        IEnumerable<ExpertEvidence> evidence
    )
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(user.Phone))
            missing.Add("phone");
        if (p.YearsExperience == null)
            missing.Add("yearsExperience");
        if (p.Fields.Length == 0)
            missing.Add("fields");
        if (!evidence.Any(x => x.EvidenceType == "CV"))
            missing.Add("CV");
        return missing.ToArray();
    }

    // Only files added after the latest submission (while supplementing) can be removed; submitted files are historical evidence.
    private static bool Removable(ExpertApplication app, ExpertEvidence e) =>
        app.Status == Status.Draft
        || (app.Status == Status.NeedMoreInformation && e.CreatedAt > app.SubmittedAt);

    private async Task<ExpertApplicationResponse> Describe(
        User user,
        ExpertProfile p,
        ExpertApplication app,
        CancellationToken ct
    )
    {
        var evidence = await db
            .ExpertEvidences.AsNoTracking()
            .Where(x => x.ApplicationId == app.Id)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);
        var history = await db
            .ExpertApplicationEvents.AsNoTracking()
            .Where(x => x.ApplicationId == app.Id)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);
        var missing = Missing(user, p, evidence);
        var verified = user.Status == "ACTIVE";
        var editable = app.Status == Status.Draft;
        var uploadable =
            (editable || app.Status == Status.NeedMoreInformation)
            && evidence.Count < ExpertApplicationRules.MaxFilesPerApplication;
        return new(
            app.Id.ToString(),
            app.Status,
            app.SubmittedAt,
            app.DecidedAt,
            app.DecisionNote,
            app.EarliestReapplyAt,
            app.CreatedAt,
            app.UpdatedAt,
            new(
                user.FullName,
                user.Email,
                user.Phone,
                p.BirthDate,
                p.Title,
                p.Company,
                p.Location,
                p.Bio,
                p.YearsExperience,
                p.Fields,
                p.Highlights
            ),
            evidence
                .Select(x => new ExpertEvidenceResponse(
                    x.Id.ToString(),
                    x.EvidenceType,
                    x.FileName ?? "file",
                    x.ContentType ?? "application/octet-stream",
                    x.SizeBytes ?? 0,
                    x.CreatedAt,
                    Removable(app, x)
                ))
                .ToArray(),
            history
                .Select(x => new ExpertApplicationEventResponse(
                    x.FromStatus,
                    x.ToStatus,
                    x.Note,
                    x.CreatedAt,
                    x.ActorUserId == user.Id
                ))
                .ToArray(),
            missing,
            verified,
            editable,
            uploadable,
            editable && verified && missing.Length == 0,
            app.Status == Status.NeedMoreInformation && verified
        );
    }

    public async Task<ExpertApplicationResponse?> GetAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Users.SingleAsync(x => x.Id == userId, ct);
        var profile = await Profile(userId, ct);
        if (profile == null)
            return null;
        var app = await Latest(profile.Id, ct);
        return app == null ? null : await Describe(user, profile, app, ct);
    }

    public async Task<ExpertApplicationResponse> SaveDraftAsync(
        Guid userId,
        SaveExpertApplicationRequest r,
        CancellationToken ct
    )
    {
        var fields = (r.Fields ?? []).Select(x => x.Trim()).Distinct().ToArray();
        var unknown = fields.Except(ExpertApplicationRules.FieldCodes).ToArray();
        if (unknown.Length > 0)
            throw new AuthFailure(400, "INVALID_FIELD", $"Unknown expertise field: {unknown[0]}.");
        if (
            r.BirthDate is { } birth
            && (birth > DateOnly.FromDateTime(Now.UtcDateTime) || birth.Year < 1900)
        )
            throw new AuthFailure(400, "INVALID_BIRTH_DATE", "Birth date is invalid.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await LockUser(userId, ct);
        var (profile, app) = await OpenApplication(user, ct);
        if (app.Status != Status.Draft)
            throw Locked(app.Status);

        if (!string.IsNullOrWhiteSpace(r.DisplayName))
            user.FullName = r.DisplayName.Trim();
        user.Phone = string.IsNullOrWhiteSpace(r.Phone) ? null : r.Phone.Trim();
        user.UpdatedAt = Now;
        profile.BirthDate = r.BirthDate;
        profile.Title = Clean(r.Title);
        profile.Company = Clean(r.Company);
        profile.Location = Clean(r.Location);
        profile.Bio = Clean(r.Bio);
        profile.YearsExperience = r.YearsExperience;
        profile.Fields = fields;
        profile.Highlights = Clean(r.Highlights);
        profile.UpdatedAt = Now;
        app.UpdatedAt = Now;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await Describe(user, profile, app, ct);
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public async Task<ExpertApplicationResponse> AddEvidenceAsync(
        Guid userId,
        string code,
        string fileName,
        byte[] content,
        CancellationToken ct
    )
    {
        var supplementFile = code == ExpertApplicationRules.SupplementCode;
        if (!supplementFile && !ExpertApplicationRules.EvidenceCodes.Contains(code))
            throw new AuthFailure(400, "INVALID_EVIDENCE_CODE", "Unknown evidence category.");
        if (content.Length == 0)
            throw new AuthFailure(400, "EVIDENCE_REQUIRED", "File is required.");
        if (content.Length > ExpertApplicationRules.MaxFileBytes)
            throw new AuthFailure(400, "EVIDENCE_TOO_LARGE", "File must be 10 MB or smaller.");
        var type =
            ExpertApplicationRules.DetectContentType(content)
            ?? throw new AuthFailure(
                400,
                "EVIDENCE_INVALID_TYPE",
                "Only PDF, PNG or JPG files are allowed."
            );

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await LockUser(userId, ct);
        var (profile, app) = await OpenApplication(user, ct);
        if (app.Status is not (Status.Draft or Status.NeedMoreInformation))
            throw Locked(app.Status);
        if (supplementFile && app.Status != Status.NeedMoreInformation)
            throw new AuthFailure(
                400,
                "INVALID_EVIDENCE_CODE",
                "Supplementary files are only accepted when more information is requested."
            );
        var count =
            db.Entry(app).State == EntityState.Added
                ? 0
                : await db.ExpertEvidences.CountAsync(x => x.ApplicationId == app.Id, ct);
        if (count >= ExpertApplicationRules.MaxFilesPerApplication)
            throw new AuthFailure(
                409,
                "EVIDENCE_LIMIT",
                $"An application can hold at most {ExpertApplicationRules.MaxFilesPerApplication} files."
            );

        var evidence = new ExpertEvidence
        {
            ExpertProfileId = profile.Id,
            ApplicationId = app.Id,
            EvidenceType = code,
            FileName = Path.GetFileName(fileName).Trim() is { Length: > 0 } name
                ? name[..Math.Min(name.Length, 255)]
                : "file",
            ContentType = type,
            SizeBytes = content.Length,
            CreatedAt = Now,
        };
        evidence.FileUrl = $"experts/{user.Id}/{app.Id}/{evidence.Id}";
        await storage.PutAsync(evidence.FileUrl, content, type, ct);
        db.ExpertEvidences.Add(evidence);
        app.UpdatedAt = Now;
        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            await DeleteQuietly(evidence.FileUrl);
            throw;
        }
        return await Describe(user, profile, app, ct);
    }

    private async Task DeleteQuietly(string key)
    {
        try
        {
            await storage.DeleteAsync(key, CancellationToken.None);
        }
        catch (Exception e)
        {
            // An orphaned file only wastes space and leaks nothing; log it for later cleanup.
            logger.LogWarning(e, "Could not delete orphan evidence object {Key}", key);
        }
    }

    public async Task<ExpertApplicationResponse> RemoveEvidenceAsync(
        Guid userId,
        Guid evidenceId,
        CancellationToken ct
    )
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await LockUser(userId, ct);
        var profile = await Profile(userId, ct) ?? throw NotFound();
        var app = await Latest(profile.Id, ct) ?? throw NotFound();
        var evidence =
            await db.ExpertEvidences.SingleOrDefaultAsync(
                x => x.Id == evidenceId && x.ApplicationId == app.Id,
                ct
            ) ?? throw new AuthFailure(404, "EVIDENCE_NOT_FOUND", "File not found.");
        if (!Removable(app, evidence))
            throw new AuthFailure(409, "EVIDENCE_LOCKED", "Submitted files cannot be removed.");
        db.ExpertEvidences.Remove(evidence);
        app.UpdatedAt = Now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await DeleteQuietly(evidence.FileUrl);
        return await Describe(user, profile, app, ct);
    }

    public async Task<ExpertEvidenceFile> OpenEvidenceAsync(
        Guid userId,
        Guid evidenceId,
        CancellationToken ct
    )
    {
        // Owner only; other people's files return 404 so their existence is not revealed.
        var evidence =
            await db
                .ExpertEvidences.AsNoTracking()
                .SingleOrDefaultAsync(
                    x => x.Id == evidenceId && x.ExpertProfile.UserId == userId,
                    ct
                )
            ?? throw new AuthFailure(404, "EVIDENCE_NOT_FOUND", "File not found.");
        var stream = await storage.OpenAsync(evidence.FileUrl, ct);
        return new(
            stream,
            evidence.ContentType ?? "application/octet-stream",
            evidence.FileName ?? "file"
        );
    }

    private static void RequireVerified(User user)
    {
        if (user.Status != "ACTIVE")
            throw new AuthFailure(
                403,
                "EMAIL_NOT_VERIFIED",
                "Verify your email address before submitting."
            );
    }

    public async Task<ExpertApplicationResponse> SubmitAsync(Guid userId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await LockUser(userId, ct);
        var profile = await Profile(userId, ct) ?? throw NotFound();
        var app = await Latest(profile.Id, ct) ?? throw NotFound();
        if (app.Status != Status.Draft)
            throw Locked(app.Status);
        RequireVerified(user);
        var evidence = await db
            .ExpertEvidences.Where(x => x.ApplicationId == app.Id)
            .ToListAsync(ct);
        var missing = Missing(user, profile, evidence);
        if (missing.Length > 0)
            throw new AuthFailure(
                400,
                "APPLICATION_INCOMPLETE",
                $"Missing required information: {string.Join(", ", missing)}."
            );
        Transition(app, profile, user.Id, Status.Submitted, null);
        app.SubmittedAt = Now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await Describe(user, profile, app, ct);
    }

    public async Task<ExpertApplicationResponse> SupplementAsync(
        Guid userId,
        SupplementExpertApplicationRequest r,
        CancellationToken ct
    )
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await LockUser(userId, ct);
        var profile = await Profile(userId, ct) ?? throw NotFound();
        var app = await Latest(profile.Id, ct) ?? throw NotFound();
        if (app.Status != Status.NeedMoreInformation)
            throw Locked(app.Status);
        RequireVerified(user);
        var note = Clean(r.Note);
        var added = await db.ExpertEvidences.AnyAsync(
            x => x.ApplicationId == app.Id && x.CreatedAt > app.SubmittedAt,
            ct
        );
        if (note == null && !added)
            throw new AuthFailure(
                400,
                "SUPPLEMENT_EMPTY",
                "Add an explanation or at least one new file."
            );
        // BR-E05: after supplementing, return to the pending step (Gate 1 after submission)
        Transition(app, profile, user.Id, Status.Submitted, note);
        app.SubmittedAt = Now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await Describe(user, profile, app, ct);
    }
}
