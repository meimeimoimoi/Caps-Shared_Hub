using auth.DTOs.Requests;
using auth.DTOs.Responses;

namespace auth.Services.Interface;

public interface IAuthService
{
    Task<SessionResult> RegisterAsync(RegisterRequest request, CancellationToken ct);
    Task<SessionResult> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<SessionResult> RefreshAsync(string token, CancellationToken ct);
    Task LogoutAsync(Guid userId, string? token, CancellationToken ct);
    Task VerifyAsync(string token, CancellationToken ct);
    Task<SessionResult> VerifyCodeAsync(Guid userId, string code, CancellationToken ct);
    Task ResendAsync(Guid userId, CancellationToken ct);
    Task ForgotAsync(string email, CancellationToken ct);
    Task ResetAsync(ResetPasswordRequest request, CancellationToken ct);
    Task<SessionResult> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken ct
    );
    Task<MeResponse> MeAsync(Guid userId, CancellationToken ct);
    Task<MeResponse> UpdateAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct);
    Task<MeResponse> UpdateAvatarAsync(
        Guid userId,
        string contentType,
        byte[] data,
        CancellationToken ct
    );
    Task<MeResponse> RemoveAvatarAsync(Guid userId, CancellationToken ct);
    Task<AvatarFile?> AvatarAsync(Guid userId, CancellationToken ct);
    Task<BusinessResponse?> BusinessAsync(Guid userId, CancellationToken ct);
    Task<BusinessResponse> UpdateBusinessAsync(
        Guid userId,
        BusinessProfileRequest request,
        CancellationToken ct
    );
}
