using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Document templates and their versions.</summary>
public interface ITemplateRepository
{
    /// <summary>The published version of every active template, with its template, untracked.</summary>
    Task<IReadOnlyList<TemplateVersion>> ListPublishedAsync(CancellationToken ct);

    /// <summary>The published version of an active template, with its template, untracked.</summary>
    Task<TemplateVersion?> FindPublishedAsync(Guid templateId, CancellationToken ct);

    /// <summary>The template with this code, tracked.</summary>
    Task<Template?> FindByCodeAsync(string code, CancellationToken ct);

    /// <summary>The template's highest version, tracked.</summary>
    Task<TemplateVersion?> FindLatestVersionAsync(Guid templateId, CancellationToken ct);

    void Add(Template newTemplate);

    void Add(TemplateVersion version);
}
