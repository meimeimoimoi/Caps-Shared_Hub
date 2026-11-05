using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.Templates;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

public sealed class AdminTemplateQueryTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 1, 0, 0, TimeSpan.Zero);
    private static readonly Guid Admin = Guid.NewGuid();
    private const string Fields = """[{"id":"taxYear","label":"Tax year","type":"year"}]""";

    // v1 published, then a v2 draft started a day later
    private static Template PublishedWithDraft()
    {
        var template = Template.Create("03/TNDN", "Tax return", null, Now);
        var v1 = TemplateVersion.SaveDraft(template, null, Fields, Admin, Now);
        v1.Publish(null);
        var v2 = TemplateVersion.SaveDraft(template, v1, Fields, Admin, Now.AddDays(1));
        template.Versions.Add(v1);
        template.Versions.Add(v2);
        return template;
    }

    [Fact]
    public async Task The_list_shows_the_open_draft_and_the_version_users_see()
    {
        var handler = new ListAdminTemplatesHandler(new OneTemplate(PublishedWithDraft()));

        var item = Assert.Single(await handler.HandleAsync(new(), CancellationToken.None));

        Assert.Equal(2, item.LatestVersionNo);
        Assert.Equal(TemplateVersionStatus.Draft, item.LatestStatus);
        Assert.Equal(1, item.PublishedVersionNo);
        Assert.Equal(Now.AddDays(1), item.UpdatedAt);
    }

    [Fact]
    public async Task The_detail_lists_versions_newest_first_with_their_fields()
    {
        var template = PublishedWithDraft();
        var handler = new GetAdminTemplateHandler(new OneTemplate(template));

        var detail = await handler.HandleAsync(new(template.Id), CancellationToken.None);

        Assert.Equal(new[] { 2, 1 }, detail.Versions.Select(v => v.VersionNo).ToArray());
        Assert.Equal(TemplateVersionStatus.Published, detail.Versions[1].Status);
        Assert.Equal("taxYear", detail.Versions[0].FieldSchema[0].GetProperty("id").GetString());
    }

    [Fact]
    public async Task An_unknown_template_is_not_found()
    {
        var handler = new GetAdminTemplateHandler(new OneTemplate(PublishedWithDraft()));

        var e = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new(Guid.NewGuid()), CancellationToken.None)
        );

        Assert.Equal("TEMPLATE_NOT_FOUND", e.Code);
    }

    private sealed class OneTemplate(Template template) : ITemplateRepository
    {
        public Task<IReadOnlyList<Template>> ListWithVersionsAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<Template>>([template]);

        public Task<Template?> FindWithVersionsAsync(Guid templateId, CancellationToken ct) =>
            Task.FromResult(templateId == template.Id ? template : null);

        public Task<IReadOnlyList<TemplateVersion>> ListPublishedAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<TemplateVersion?> FindPublishedAsync(Guid templateId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<Template?> FindByCodeAsync(string code, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<TemplateVersion?> FindLatestVersionAsync(
            Guid templateId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<TemplateVersion?> FindPublishedVersionAsync(
            Guid templateId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(Template newTemplate) => throw new NotSupportedException();

        public void Add(TemplateVersion version) => throw new NotSupportedException();
    }
}
