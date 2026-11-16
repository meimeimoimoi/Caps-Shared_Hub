using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions.Documents;

/// <summary>Renders a structured document version (AI draft or expert review) into downloadable PDF or DOCX bytes.</summary>
public interface IDocumentFileExporter
{
    /// <summary>Exports the document and version content in the requested format (<c>pdf</c> or <c>docx</c>).</summary>
    byte[] Export(Document document, DocumentVersion version, string format);
}
