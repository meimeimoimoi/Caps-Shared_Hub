using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Infrastructure.Ai;

/// <summary>HTTP adapter for the Python ai-service CV extraction endpoint.</summary>
public sealed class AiCvScreeningClient(HttpClient httpClient) : IAiCvScreeningClient
{
    private static readonly JsonSerializerOptions SnakeCaseJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public async Task<EvidenceExtraction> ExtractAsync(
        byte[] content,
        string fileName,
        string contentType,
        string evidenceType,
        bool visionEnabled,
        CancellationToken ct
    )
    {
        using var fileContent = new ByteArrayContent(content);
        if (MediaTypeHeaderValue.TryParse(contentType, out var mediaType))
            fileContent.Headers.ContentType = mediaType;

        using var form = new MultipartFormDataContent
        {
            { fileContent, "file", string.IsNullOrWhiteSpace(fileName) ? "evidence" : fileName },
            { new StringContent(evidenceType), "evidence_type" },
            { new StringContent(visionEnabled ? "true" : "false"), "vision_enabled" },
        };

        using var response = await httpClient.PostAsync("/api/v1/cv/extract", form, ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"AI screening service returned HTTP {(int)response.StatusCode}.",
                null,
                response.StatusCode
            );
        }

        var dto =
            await response.Content.ReadFromJsonAsync<AiExtractResponseDto>(SnakeCaseJson, ct)
            ?? throw new InvalidOperationException("Empty response from AI screening service.");

        var extracted = dto.Extracted;
        return new EvidenceExtraction(
            dto.Status,
            dto.IsImage,
            dto.IsScanned,
            dto.IsUnreadable,
            dto.UnreadableReason,
            extracted?.FullName,
            extracted?.DocumentType,
            extracted?.FieldCodes ?? [],
            (extracted?.WorkMilestones ?? [])
                .Select(m => new ExtractedWorkMilestone(
                    m.Company,
                    m.Role,
                    m.StartYear,
                    m.StartMonth,
                    m.EndYear,
                    m.EndMonth,
                    m.IsCurrent,
                    m.IsTaxAccounting
                ))
                .ToArray(),
            (extracted?.Certificates ?? [])
                .Select(c => new ExtractedCertificate(c.Name, c.Issuer, c.IssuedDate, c.ExpiryDate))
                .ToArray()
        );
    }

    private sealed record AiExtractResponseDto(
        string Status,
        bool IsImage,
        bool IsScanned,
        bool IsUnreadable,
        string? UnreadableReason,
        AiExtractedDataDto? Extracted
    );

    private sealed record AiExtractedDataDto(
        string? FullName,
        string? DocumentType,
        string[]? FieldCodes,
        AiWorkMilestoneDto[]? WorkMilestones,
        AiCertificateDto[]? Certificates
    );

    private sealed record AiWorkMilestoneDto(
        string? Company,
        string? Role,
        int? StartYear,
        int? StartMonth,
        int? EndYear,
        int? EndMonth,
        bool IsCurrent,
        bool IsTaxAccounting
    );

    private sealed record AiCertificateDto(
        string? Name,
        string? Issuer,
        DateOnly? IssuedDate,
        DateOnly? ExpiryDate
    );
}
