namespace Caps.Workflow.Api.DTOs.Requests;

/// <summary>
/// Why the client disputes the delivery (DELIVERABLE_INCOMPLETE, SLA_BREACH, OBLIGATION_NOT_MET or
/// PROFESSIONAL_JUDGMENT) and what went wrong, up to 4000 characters.
/// </summary>
public sealed record OpenDisputeRequest(string? Reason, string? Description);
