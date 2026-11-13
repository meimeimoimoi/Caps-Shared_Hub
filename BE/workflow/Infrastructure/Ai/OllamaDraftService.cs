using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Caps.Workflow.Infrastructure.Ai;
public sealed class OllamaDraftService(HttpClient httpClient) : IOllamaDraftService
{
    private readonly string targetModel = "qwen2.5:7b";
    public async Task<string> GenerateDraftAsync(
        string title,
        DateOnly periodStart,
        DateOnly periodEnd,
        string snapshotData,
        string? templateSchema,
        string? citations,
        CancellationToken ct = default)
    {
        var prompt = $$"""
        You are an expert tax, accounting, and legal document drafter in Vietnam.
        Draft a formal legal document based on the following input parameters:
        - Document Title: {{title}}
        - Tax/Accounting Period: From {{periodStart:yyyy-MM-dd}} To {{periodEnd:yyyy-MM-dd}}
        - Input Form Snapshot Data (JSON): {{snapshotData}}
        - Target Template Field Schema (JSON): {{templateSchema ?? "Default Standard Structure"}}
        - Legal Citations & Articles: {{citations ?? "Standard Vietnamese Tax Regulations"}}

        Respond ONLY with a valid JSON object representing the document content with structured sections, facts, legal grounds, explanations, and conclusion.
        """;

        var requestPayload = new OllamaGenerateRequest(
            Model: targetModel,
            Prompt: prompt,
            Format: "json",
            Stream: false
            );

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync("/api/generate", requestPayload, ct);
        }
        catch ( Exception ex )
        {
            throw WorkflowErrors.OllamaGenerationFailed($"Connection error to Ollama at {httpClient.BaseAddress}: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(ct);
            throw WorkflowErrors.OllamaGenerationFailed($"Ollama returned status {(int)response.StatusCode}: {errorContent}");
        }

        var result = await response.Content.ReadFromJsonAsync<OllamaGenerateResponse>(ct);
        if(result is null || string.IsNullOrWhiteSpace(result.Response)){
            throw WorkflowErrors.OllamaGenerationFailed("Ollama returned an empty response body.");
        }

        return result.Response;
    }

    private sealed record OllamaGenerateRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("prompt")] string Prompt,
        [property: JsonPropertyName("format")] string Format,
        [property: JsonPropertyName("stream")] bool Stream
        );

    private sealed record OllamaGenerateResponse(
        [property: JsonPropertyName("model")] string? Model,
        [property: JsonPropertyName("response")] string Response,
        [property: JsonPropertyName("done")] bool Done
        );
}
