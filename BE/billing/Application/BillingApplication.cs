using System.Reflection;

namespace Caps.Billing.Application;

/// <summary>
/// Assembly anchor: use cases go under Features/&lt;Group&gt;/ and their handlers register automatically.
/// </summary>
public static class BillingApplication
{
    public static Assembly Assembly => typeof(BillingApplication).Assembly;
}
