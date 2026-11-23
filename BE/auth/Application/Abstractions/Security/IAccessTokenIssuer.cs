using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Abstractions.Security;

/// <summary>A signed access token and how long it lives.</summary>
public sealed record AccessToken(string Value, int ExpiresInSeconds);

/// <summary>Signs access tokens; the key and algorithm stay in Infrastructure.</summary>
public interface IAccessTokenIssuer
{
    AccessToken Issue(
        User user,
        IReadOnlyCollection<string> roles,
        IReadOnlyCollection<string> permissions
    );
}
