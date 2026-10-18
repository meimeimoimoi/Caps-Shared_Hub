namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>Whether the expert takes new cases, how many at once, and how many are running now.</summary>
public sealed record AvailabilityResponse(bool Accepting, int Capacity, int ActiveCases);
