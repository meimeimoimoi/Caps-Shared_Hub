using Caps.Common.Domain;

namespace Caps.Workflow.UnitTests;

internal static class Errors
{
    /// <summary>Runs the action and returns the code of the business error it throws.</summary>
    public static string CodeOf(Action action) => Assert.Throws<AppException>(action).Code;
}
