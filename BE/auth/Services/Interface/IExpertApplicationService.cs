using auth.DTOs.Requests;
using auth.DTOs.Responses;

namespace auth.Services.Interface;

/// <summary>Applicant side of the Expert Eligibility Application (Flow 1, Step 1–2).</summary>
public interface IExpertApplicationService
{
    Task<ExpertApplicationResponse?> GetAsync(Guid userId, CancellationToken ct);
    Task<ExpertApplicationResponse> SaveDraftAsync(
        Guid userId,
        SaveExpertApplicationRequest request,
        CancellationToken ct
    );
    Task<ExpertApplicationResponse> AddEvidenceAsync(
        Guid userId,
        string code,
        string fileName,
        byte[] content,
        CancellationToken ct
    );
    Task<ExpertApplicationResponse> RemoveEvidenceAsync(
        Guid userId,
        Guid evidenceId,
        CancellationToken ct
    );
    Task<ExpertEvidenceFile> OpenEvidenceAsync(Guid userId, Guid evidenceId, CancellationToken ct);
    Task<ExpertApplicationResponse> SubmitAsync(Guid userId, CancellationToken ct);
    Task<ExpertApplicationResponse> SupplementAsync(
        Guid userId,
        SupplementExpertApplicationRequest request,
        CancellationToken ct
    );
}
