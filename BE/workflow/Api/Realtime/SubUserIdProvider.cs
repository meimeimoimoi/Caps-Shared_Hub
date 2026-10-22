using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Workflow.Api.Realtime;

/// <summary>Claims keep their JWT names (MapInboundClaims = false), so the user id is "sub", not NameIdentifier.</summary>
public sealed class SubUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
}
