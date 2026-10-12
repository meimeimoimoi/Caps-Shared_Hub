using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Abstractions.Security;

public sealed record AccessToken(string Value, int ExpiresInSeconds);

public interface IAccessTokenIssuer
{
    AccessToken Issue(
        User user,
        IReadOnlyCollection<string> roles,
        IReadOnlyCollection<string> permissions
    );
}
