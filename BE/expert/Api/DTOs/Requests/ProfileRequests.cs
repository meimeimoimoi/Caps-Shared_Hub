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
