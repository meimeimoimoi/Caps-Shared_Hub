using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Workflow.Api.Realtime;

/// <summary>
/// Server-to-client only: messages are sent through the REST API, then pushed here to the case's two
/// parties (by user id), so a connection needs no join step.
/// </summary>
[Authorize]
public sealed class CaseChatHub : Hub;
