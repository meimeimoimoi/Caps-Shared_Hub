namespace Caps.Expert.Application.Abstractions;

/// <summary>Client ratings of finished review cases; safe to repeat.</summary>
public interface IExpertCaseRatings
{
    /// <summary>Counts the case's rating into the expert's average; a case already counted is ignored.</summary>
    Task AddAsync(
        Guid profileId,
        Guid reviewCaseId,
        short stars,
        DateTimeOffset now,
        CancellationToken ct
    );
}
