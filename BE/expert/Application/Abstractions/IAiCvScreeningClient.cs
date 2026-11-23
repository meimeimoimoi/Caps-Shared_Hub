using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Client calling the internal Python ai-service CV extraction endpoint.</summary>
public interface IAiCvScreeningClient
{
    /// <summary>Extracts Section 1 fields from one non-EV-01 evidence file using local Ollama models.</summary>
    Task<EvidenceExtraction> ExtractAsync(
        byte[] content,
        string fileName,
        string contentType,
        string evidenceType,
        bool visionEnabled,
        CancellationToken ct
    );
}
