namespace Caps.Ingestion.DTOs.Responses;

/// <summary>One page of a list with the total number of matching items.</summary>
public sealed record PageResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);
