using System.ComponentModel.DataAnnotations;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.Features.Applications;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>
/// Save an expert application draft: every field may be empty; required fields are only checked on submit.
/// </summary>
public sealed record SaveExpertApplicationRequest(
    [MaxLength(128)] string? DisplayName,
    [Phone, MaxLength(32)] string? Phone,
    DateOnly? BirthDate,
    [MaxLength(128)] string? Title,
    [MaxLength(256)] string? Company,
    [MaxLength(128)] string? Location,
    [MaxLength(1000)] string? Bio,
    [Range(0, 80)] int? YearsExperience,
    [MaxLength(10)] string[]? Fields,
    [MaxLength(2000)] string? Highlights
)
{
    public SaveDraftCommand ToCommand(Applicant applicant) =>
        new(
            applicant,
            DisplayName,
            Phone,
            BirthDate,
            Title,
            Company,
            Location,
            Bio,
            YearsExperience,
            Fields,
            Highlights
        );
}

/// <summary>Resubmits an application after more information was requested, with an optional note.</summary>
public sealed record SupplementExpertApplicationRequest([MaxLength(2000)] string? Note);
