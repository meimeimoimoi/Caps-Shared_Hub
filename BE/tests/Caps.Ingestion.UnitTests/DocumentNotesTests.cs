using System.Text.Json.Nodes;
using Caps.Ingestion.Features.Documents;

namespace Caps.Ingestion.UnitTests;

public sealed class DocumentNotesTests
{
    private static readonly DateTimeOffset At = new(2026, 11, 26, 9, 0, 0, TimeSpan.Zero);
    private static readonly Guid AdminId = Guid.Parse("0195f0a0-0000-7000-8000-000000000001");

    [Fact]
    public void Note_is_added_next_to_the_crawler_metadata()
    {
        var json = DocumentNotes.Add(
            """{"ingest":{"docType":"Thông tư"}}""",
            "retire",
            "Replaced by a newer circular",
            AdminId,
            At
        );

        var root = JsonNode.Parse(json)!;
        Assert.Equal("Thông tư", root["ingest"]!["docType"]!.GetValue<string>());
        Assert.Equal("Replaced by a newer circular", root["retire"]!["reason"]!.GetValue<string>());
        Assert.Equal(AdminId.ToString(), root["retire"]!["by"]!.GetValue<string>());
        Assert.Equal(At.ToString("O"), root["retire"]!["at"]!.GetValue<string>());
    }

    [Fact]
    public void A_second_note_replaces_the_first()
    {
        var first = DocumentNotes.Add("{}", "reprocess", "first", AdminId, At);
        var second = DocumentNotes.Add(first, "reprocess", "second", AdminId, At);

        Assert.Equal("second", JsonNode.Parse(second)!["reprocess"]!["reason"]!.GetValue<string>());
    }
}
