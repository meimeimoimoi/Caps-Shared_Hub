namespace Caps.Ingestion.DTOs.Responses;

/// <summary>A legal source in the catalog, with the validity of its approved version and its amendment links.</summary>
/// <param name="LatestEffectiveFrom">From the newest APPROVED or INDEXED version; null while none is approved.</param>
/// <param name="Amends">Sources this one amends.</param>
/// <param name="AmendedBy">Sources that amend this one.</param>
public sealed record LegalSourceResponse(
    Guid Id,
    string DocumentNumber,
    string DocType,
    string? IssuingAuthority,
    string Title,
    DateOnly? LatestEffectiveFrom,
    DateOnly? LatestEffectiveTo,
    IReadOnlyList<AmendmentLinkResponse> Amends,
    IReadOnlyList<AmendmentLinkResponse> AmendedBy
);

/// <summary>The other source of one amendment link.</summary>
/// <param name="RelationType">For example AMENDS or REPLACES.</param>
public sealed record AmendmentLinkResponse(Guid Id, string DocumentNumber, string RelationType);
