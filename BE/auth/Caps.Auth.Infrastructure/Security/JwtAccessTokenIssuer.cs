using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Caps.Auth.Application;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Domain.Users;
using Caps.Common.Security;

namespace Caps.Auth.Infrastructure.Security;

public sealed class JwtAccessTokenIssuer(
    JwtOptions jwt,
    JwtSigningKeys keys,
    AuthOptions options,
    TimeProvider clock
) : IAccessTokenIssuer
{
    public AccessToken Issue(
        User user,
        IReadOnlyCollection<string> roles,
        IReadOnlyCollection<string> permissions
    )
    {
        var now = clock.GetUtcNow();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("account_status", user.Status),
            new("token_version", user.TokenVersion.ToString(CultureInfo.InvariantCulture)),
        };
        // Accounts that are not active yet get a restricted token without business rights
        if (user.Status == UserStatus.Active)
        {
            claims.AddRange(roles.Select(x => new Claim("role", x)));
            claims.AddRange(permissions.Select(x => new Claim("permission", x)));
        }
        var token = new JwtSecurityToken(
            jwt.Issuer,
            jwt.Audience,
            claims,
            now.UtcDateTime,
            now.AddMinutes(options.AccessMinutes).UtcDateTime,
            // RS256 with the key id in the header, so services can pick the right public key
            keys.Signing
        );
        return new(new JwtSecurityTokenHandler().WriteToken(token), options.AccessMinutes * 60);
    }
}
