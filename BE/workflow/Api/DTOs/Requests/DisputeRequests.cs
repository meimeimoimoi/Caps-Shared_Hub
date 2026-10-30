namespace Caps.Workflow.Api.DTOs.Requests;

/// <summary>
/// Why the client disputes the delivery (DELIVERABLE_INCOMPLETE, SLA_BREACH, OBLIGATION_NOT_MET or
/// PROFESSIONAL_JUDGMENT) and what went wrong, up to 4000 characters.
/// </summary>
public sealed record OpenDisputeRequest(string? Reason, string? Description);

/// <summary>The admin's decision: the share of the fee returned to the client (0–100) and why.</summary>
public sealed record ResolveDisputeRequest(short RefundPct, string? Note);
