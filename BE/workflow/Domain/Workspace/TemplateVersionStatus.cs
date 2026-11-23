namespace Caps.Workflow.Domain.Workspace;

/// <summary>Lifecycle of a template version: a draft is edited, a published one is what users draft from.</summary>
public static class TemplateVersionStatus
{
    public const string Draft = "DRAFT";
    public const string Published = "PUBLISHED";
    public const string Deprecated = "DEPRECATED";
}
