namespace Caps.Workflow.Application.Abstractions;

/// <summary>The client's own documents, checked before a version is sent for review.</summary>
public interface IDocumentRepository
{
    /// <summary>True when the version belongs to the document and the document belongs to the user.</summary>
    Task<bool> OwnsVersionAsync(Guid userId, Guid documentId, Guid versionId, CancellationToken ct);
}
