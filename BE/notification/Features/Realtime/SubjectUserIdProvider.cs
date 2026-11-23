using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Notification.Features.Realtime;

/// <summary>Groups connections by the token's "sub" claim (inbound claims are not mapped to NameIdentifier).</summary>
public sealed class SubjectUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
}
