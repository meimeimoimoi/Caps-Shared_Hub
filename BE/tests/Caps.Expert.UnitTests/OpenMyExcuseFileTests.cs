using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Violations;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.UnitTests;

public sealed class OpenMyExcuseFileTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 25, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Opens_the_file_through_the_experts_own_profile()
    {
        var userId = Guid.NewGuid();
        var profile = ExpertProfile.Create(userId, "Mai", Now);
        var open = new FakeOpen();
        var handler = new OpenMyExcuseFileHandler(new FakeProfiles(profile), open);
        var caseId = Guid.NewGuid();
        var fileId = Guid.NewGuid();

        var file = await handler.HandleAsync(new(userId, caseId, fileId), default);

        Assert.Equal(new OpenExcuseFileQuery(profile.Id, caseId, fileId), open.Asked);
        Assert.Equal("evidence.pdf", file.FileName);
    }

    [Fact]
    public async Task A_user_without_a_profile_finds_no_violation()
    {
        var open = new FakeOpen();
        var handler = new OpenMyExcuseFileHandler(new FakeProfiles(null), open);

        var error = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()), default)
        );

        Assert.Equal("VIOLATION_NOT_FOUND", error.Code);
        Assert.Null(open.Asked);
    }

    private sealed class FakeProfiles(ExpertProfile? profile) : IExpertProfileRepository
    {
        public Task<ExpertProfile?> FindByUserAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult(profile?.UserId == userId ? profile : null);

        public Task<ExpertProfile?> FindAsync(Guid profileId, CancellationToken ct) =>
            Task.FromResult(profile?.Id == profileId ? profile : null);

        public void Add(ExpertProfile profile) { }
    }

    private sealed class FakeOpen : IQueryHandler<OpenExcuseFileQuery, ExpertEvidenceFile>
    {
        public OpenExcuseFileQuery? Asked { get; private set; }

        public Task<ExpertEvidenceFile> HandleAsync(OpenExcuseFileQuery query, CancellationToken ct)
        {
            Asked = query;
            return Task.FromResult(
                new ExpertEvidenceFile(new MemoryStream([1]), "application/pdf", "evidence.pdf")
            );
        }
    }
}
