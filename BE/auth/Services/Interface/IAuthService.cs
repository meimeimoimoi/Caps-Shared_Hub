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
    Task ResendAsync(Guid userId, CancellationToken ct);
    Task ForgotAsync(string email, CancellationToken ct);
    Task ResetAsync(ResetPasswordRequest request, CancellationToken ct);
    Task<MeResponse> MeAsync(Guid userId, CancellationToken ct);
    Task<MeResponse> UpdateAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct);
    Task<BusinessResponse?> BusinessAsync(Guid userId, CancellationToken ct);
    Task<BusinessResponse> UpdateBusinessAsync(Guid userId, BusinessProfileRequest request, CancellationToken ct);
}
