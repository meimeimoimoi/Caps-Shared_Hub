using Caps.Workflow.Api.Realtime;
using Caps.Workflow.Application.Abstractions;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Workflow.Api.Configuration;

/// <summary>SignalR hub that pushes review case chat messages to the parties.</summary>
public static class WorkflowRealtimeSetup
{
    // Under /api/v1/review-cases so the gateway's review-cases route already proxies it
    public const string CaseChatHubPath = "/api/v1/review-cases/hubs/chat";

    // shortcut: in-memory SignalR, one workflow instance only; add a Redis backplane before scaling out
    public static IServiceCollection AddWorkflowRealtime(this IServiceCollection services)
    {
        services.AddSignalR();
        services.AddSingleton<IUserIdProvider, SubUserIdProvider>();
        services.AddSingleton<ICaseChatNotifier, SignalRCaseChatNotifier>();
        return services;
    }
}
