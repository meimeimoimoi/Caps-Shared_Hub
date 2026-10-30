using Caps.Common.Api;
using Caps.Workflow.Application;
using Caps.Workflow.Application.Common;

namespace Caps.Workflow.Api;

/// <summary>Registers the workflow Application layer (every use-case handler).</summary>
public static class DependencyInjection
{
    /// <summary>Every command/query handler found in the Application assembly, plus the shared refund step.</summary>
    public static IServiceCollection AddWorkflowApplication(this IServiceCollection services) =>
        services
            .AddHandlersFromAssembly(WorkflowApplication.Assembly)
            .AddScoped<WaitingRequestRefunds>();
}
