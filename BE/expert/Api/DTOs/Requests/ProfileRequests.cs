using System.ComponentModel.DataAnnotations;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.Features.Profiles;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>Change the professional name and contact phone; neither may be blank.</summary>
public sealed record UpdateExpertProfileRequest(
    [Required, MaxLength(128)] string? DisplayName,
    [Required, Phone, MaxLength(32)] string? Phone
)
{
    public UpdateMyProfileCommand ToCommand(Applicant applicant) =>
        new(applicant, DisplayName, Phone);
}

/// <summary>The expert's public profile; blank values clear a field.</summary>
public sealed record UpdateMyBioRequest(
    [MaxLength(128)] string? Title,
    [MaxLength(128)] string? Location,
    [MaxLength(1000)] string? Bio,
    [MaxLength(10)] string[]? Fields,
    [MaxLength(2000)] string? Highlights
)
{
    public UpdateMyBioCommand ToCommand(Applicant applicant) =>
        new(applicant, Title, Location, Bio, Fields ?? [], Highlights);
}
