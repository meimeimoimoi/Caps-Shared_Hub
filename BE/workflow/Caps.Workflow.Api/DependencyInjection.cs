using Caps.Common.Api;
using Caps.Workflow.Application;

namespace Caps.Workflow.Api;

public static class DependencyInjection
{
    /// <summary>Every command/query handler found in the Application assembly.</summary>
    public static IServiceCollection AddWorkflowApplication(this IServiceCollection services) =>
        services.AddHandlersFromAssembly(WorkflowApplication.Assembly);
}
