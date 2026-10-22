using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

public sealed class TemplateTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 22, 1, 0, 0, TimeSpan.Zero);
    private static readonly Guid Admin = Guid.NewGuid();
    private const string Fields = """[{"id":"taxYear","label":"Tax year","type":"year"}]""";

    private static Template NewTemplate() =>
        Template.Create(" 03/TNDN ", " Tax return ", "  ", Now);

    [Fact]
    public void A_new_template_starts_at_draft_version_1()
    {
        var template = NewTemplate();

        var version = TemplateVersion.SaveDraft(template, null, Fields, Admin, Now);

        Assert.Equal("03/TNDN", template.Code);
        Assert.Equal("Tax return", template.Name);
        Assert.Null(template.Description);
        Assert.Equal(1, version.VersionNo);
        Assert.Equal(TemplateVersionStatus.Draft, version.Status);
        Assert.Equal(template.Id, version.TemplateId);
    }

    [Fact]
    public void Saving_again_overwrites_the_open_draft()
    {
        var template = NewTemplate();
        var draft = TemplateVersion.SaveDraft(template, null, Fields, Admin, Now);
        const string changed = """[{"id":"revenue","type":"money"}]""";

        var saved = TemplateVersion.SaveDraft(template, draft, changed, Admin, Now);

        Assert.Same(draft, saved);
        Assert.Equal(1, saved.VersionNo);
        Assert.Equal(changed, saved.FieldSchema);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not json")]
    [InlineData("{}")]
    [InlineData("[]")]
    [InlineData("[1, 2]")]
    public void The_schema_must_be_a_non_empty_array_of_fields(string? schema) =>
        Assert.Equal(
            "FIELD_SCHEMA_INVALID",
            Errors.CodeOf(() => TemplateVersion.SaveDraft(NewTemplate(), null, schema, Admin, Now))
        );

    [Theory]
    [InlineData(null, "Name")]
    [InlineData(" ", "Name")]
    [InlineData("CODE", null)]
    [InlineData("CODE", "")]
    public void Code_and_name_are_required(string? code, string? name) =>
        Assert.Equal(
            "TEMPLATE_INVALID",
            Errors.CodeOf(() => Template.Create(code, name, null, Now))
        );
}
