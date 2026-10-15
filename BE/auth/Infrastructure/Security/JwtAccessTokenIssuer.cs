using System.IdentityModel.Tokens.Jwt;
using Caps.Auth.Application;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Domain.Users;
using Caps.Common.Security;

namespace Caps.Auth.Infrastructure.Security;

/// <summary>Signs RS256 access tokens; unverified accounts get no roles or permissions.</summary>
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
        // The payload keeps insertion order, so claims are written grouped as below
        var payload = new JwtPayload
        {
            // Registered claims (RFC 7519): issuer, subject, audience, lifetime and token id
            { JwtRegisteredClaimNames.Iss, jwt.Issuer },
            { JwtRegisteredClaimNames.Sub, user.Id.ToString() },
            { JwtRegisteredClaimNames.Aud, jwt.Audience },
            { JwtRegisteredClaimNames.Iat, now.ToUnixTimeSeconds() },
            { JwtRegisteredClaimNames.Nbf, now.ToUnixTimeSeconds() },
            {
                JwtRegisteredClaimNames.Exp,
                now.AddMinutes(options.AccessMinutes).ToUnixTimeSeconds()
            },
            { JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString() },
            // Profile
            { JwtRegisteredClaimNames.Email, user.Email },
            // Session state checked on every request (status policy, revocation)
            { "account_status", user.Status },
            { "token_version", user.TokenVersion },
        };
        // Accounts that are not active yet get a restricted token without business rights
        if (user.Status == UserStatus.Active)
        {
            // Always arrays, even with a single value, so readers see one shape
            payload.Add("role", roles.ToArray());
            payload.Add("permission", permissions.ToArray());
        }
        // RS256 with the key id in the header, so services can pick the right public key
        var token = new JwtSecurityToken(new JwtHeader(keys.Signing), payload);
        return new(new JwtSecurityTokenHandler().WriteToken(token), options.AccessMinutes * 60);
    }
}
