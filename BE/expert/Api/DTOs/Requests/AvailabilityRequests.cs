namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>Take new cases or pause, and how many cases to handle at once (1-20).</summary>
public sealed record SetAvailabilityRequest(bool Accepting, int Capacity);
