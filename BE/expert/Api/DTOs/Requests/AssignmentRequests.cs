using System.ComponentModel.DataAnnotations;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>Hands a review to another reviewer; the reason is required and kept in the claim history.</summary>
/// <param name="ReviewerUserId">A known reviewer (one who opened the review queue), not the expert.</param>
public sealed record ReassignReviewRequest(
    [Required] Guid ReviewerUserId,
    [MaxLength(ReviewClaimRules.MaxReasonLength)] string? Reason
);
