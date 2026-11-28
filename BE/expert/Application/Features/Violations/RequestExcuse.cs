using Caps.Common.Application;
using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>The signed-in expert asks for a force-majeure excuse of one violation.</summary>
/// <param name="Files">Name and bytes of each evidence file, at most 5.</param>
public sealed record RequestExcuseCommand(
    Guid UserId,
    Guid ReviewCaseId,
    string? Reason,
    IReadOnlyList<(string FileName, byte[] Content)> Files
);

/// <summary>
/// Validates each file by its bytes, stores them, records the request and tells the operations inbox.
/// Files stored for a request that fails to save are deleted again.
/// </summary>
public sealed class RequestExcuseHandler(
    IExpertProfileRepository profiles,
    IExpertViolations violations,
    IObjectStorage storage,
    IExpertNotificationOutbox outbox,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RequestExcuseCommand>
{
    public async Task HandleAsync(RequestExcuseCommand command, CancellationToken ct)
    {
        // Reject a bad file before touching anything: PDF, JPEG or PNG up to 10MB, judged by its bytes
        var uploads = command
            .Files.Select(f =>
                (f.FileName, f.Content, Type: ApplicationRules.ValidateContent(f.Content))
            )
            .ToList();
        var profile =
            await profiles.FindByUserAsync(command.UserId, ct)
            ?? throw ExpertErrors.ViolationNotFound();
        var violation =
            await violations.FindAsync(profile.Id, command.ReviewCaseId, ct)
            ?? throw ExpertErrors.ViolationNotFound();
        var files = uploads.ConvertAll(u =>
            ExcuseFile.Create(command.ReviewCaseId, u.FileName, u.Type, u.Content.Length)
        );
        var now = clock.GetUtcNow();
        var excused = await violations.CountExcusedAsync(
            profile.Id,
            now.AddDays(-ViolationRules.WindowDays),
            ct
        );
        violation.RequestExcuse(command.Reason, files, excused, now);
        foreach (var (file, upload) in files.Zip(uploads))
        {
            await storage.PutAsync(file.StorageKey, upload.Content, file.ContentType, ct);
        }
        outbox.Enqueue(
            new ExpertExcuseRequestedEvent(
                Guid.NewGuid(),
                command.ReviewCaseId,
                profile.Id,
                profile.DisplayName,
                violation.Kind,
                violation.ExcuseRequest!,
                files.Count,
                now
            ),
            now
        );
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch
        {
            // The request was not saved, so its files would be reachable
            foreach (var file in files)
            {
                await storage.DeleteQuietlyAsync(file.StorageKey);
            }
            throw;
        }
    }
}
