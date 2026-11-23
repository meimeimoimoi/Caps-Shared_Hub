using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.UnitTests;

// The expert edits what clients read; the years reviewed at Gate 1 stay as they were
public sealed class PublicProfileTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 23, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void The_expert_edits_the_public_profile_but_not_the_reviewed_years()
    {
        var profile = ExpertProfile.Create(Guid.NewGuid(), "expert", Now);
        profile.UpdateDetails(
            new(
                "Expert",
                "0901234567",
                null,
                "Tax adviser",
                null,
                "Ha Noi",
                "Old",
                7,
                ["CIT"],
                null
            ),
            Now
        );

        profile.UpdatePublicProfile(
            "  Senior tax adviser ",
            "HCMC",
            "  Ten years of CIT returns  ",
            [" CIT ", "VAT", "CIT", " "],
            "Audit\nTraining",
            Now.AddDays(1)
        );

        Assert.Equal(
            ("Senior tax adviser", "HCMC", "Ten years of CIT returns", "Audit\nTraining"),
            (profile.Title, profile.Location, profile.Bio, profile.Highlights)
        );
        Assert.Equal(["CIT", "VAT"], profile.Fields);
        Assert.Equal(7, profile.YearsExperience);
        Assert.Equal(Now.AddDays(1), profile.UpdatedAt);
    }
}
