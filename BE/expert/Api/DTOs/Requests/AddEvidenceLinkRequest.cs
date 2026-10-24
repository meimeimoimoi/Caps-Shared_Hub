namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>A public CV or supporting evidence URL, stored without downloading its content.</summary>
public sealed record AddEvidenceLinkRequest(string? Code, string? SourceUrl);
