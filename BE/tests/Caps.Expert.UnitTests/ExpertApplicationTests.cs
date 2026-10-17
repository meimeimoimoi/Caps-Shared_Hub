using Caps.Expert.Domain.Applications;

namespace Caps.Expert.UnitTests;

public sealed class ExpertApplicationTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 13, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Applicant = Guid.NewGuid();

    private static ExpertApplication OpenDraft(ExpertApplication? previous = null) =>
        ExpertApplication.Open(Guid.NewGuid(), previous, Applicant, Now).Application;

    [Fact]
    public void A_new_application_is_an_editable_draft_with_an_opening_event()
    {
        var (application, opened) = ExpertApplication.Open(Guid.NewGuid(), null, Applicant, Now);

        Assert.Equal(ExpertApplicationStatus.Draft, application.Status);
        Assert.True(application.CanEdit);
        Assert.True(application.AcceptsFiles);
        Assert.Equal(application.Id, opened.ApplicationId);
        Assert.Null(opened.FromStatus);
        Assert.Equal(ExpertApplicationStatus.Draft, opened.ToStatus);
    }

    [Fact]
    public void Submitting_locks_the_application_and_records_the_transition()
    {
        var application = OpenDraft();

        var submitted = application.Submit(Applicant, Now);

        Assert.Equal(ExpertApplicationStatus.Submitted, application.Status);
        Assert.Equal(Now, application.SubmittedAt);
        Assert.False(application.CanEdit);
        Assert.Equal(ExpertApplicationStatus.Draft, submitted.FromStatus);
        Assert.Equal(ExpertApplicationStatus.Submitted, submitted.ToStatus);
    }

    [Fact]
    public void A_submitted_application_can_neither_be_edited_nor_submitted_again()
    {
        var application = OpenDraft();
        application.Submit(Applicant, Now);

        Assert.Equal("APPLICATION_LOCKED", Errors.CodeOf(application.EnsureEditable));
        Assert.Equal("APPLICATION_LOCKED", Errors.CodeOf(() => application.Submit(Applicant, Now)));
        Assert.Equal(
            "APPLICATION_LOCKED",
            Errors.CodeOf(() => application.EnsureAcceptsFile(supplement: false))
        );
    }

    [Fact]
    public void Supplementary_files_are_refused_unless_more_information_was_requested()
    {
        var draft = OpenDraft();

        var error = Errors.CodeOf(() => draft.EnsureAcceptsFile(supplement: true));

        Assert.Equal("SUPPLEMENT_NOT_REQUESTED", error);
    }

    [Fact]
    public void Resubmitting_requires_a_request_for_more_information()
    {
        var draft = OpenDraft();

        var error = Errors.CodeOf(() => draft.Resubmit(Applicant, null, Now));

        Assert.Equal("APPLICATION_LOCKED", error);
    }

    [Fact]
    public void A_draft_can_remove_any_of_its_files()
    {
        var draft = OpenDraft();
        var evidence = ExpertEvidence.Create(
            draft,
            Applicant,
            "CV",
            "cv.pdf",
            "application/pdf",
            10,
            Now
        );

        Assert.True(draft.CanRemove(evidence));
    }
}
