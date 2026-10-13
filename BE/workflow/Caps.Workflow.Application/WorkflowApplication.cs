using System.Reflection;

namespace Caps.Workflow.Application;

/// <summary>
/// Assembly anchor: use cases go under Features/&lt;Group&gt;/ and their handlers register automatically.
/// </summary>
public static class WorkflowApplication
{
    public static Assembly Assembly => typeof(WorkflowApplication).Assembly;
}
