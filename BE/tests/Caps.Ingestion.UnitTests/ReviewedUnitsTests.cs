using System.Text.Json.Nodes;
using Caps.Ingestion.Features.Documents;

namespace Caps.Ingestion.UnitTests;

public sealed class ReviewedUnitsTests
{
    private const string Content = """
        {"chapters":[
          {"number":"I","title":"Chung","articles":[
            {"number":"1","title":"Phạm vi","units":[
              {"id":"d1-0","label":"Mở đầu","text":"...","status":"AUTO"},
              {"id":"d1-1","label":"Khoản 1","text":"...","status":"WARNING","warning":"OCR"}]}]},
          {"number":null,"title":"","articles":[
            {"number":"2","title":"Hiệu lực","units":[{"id":"d2-0","label":"Mở đầu","text":"...","status":"AUTO"}]}]}],
         "metadata":{"vbhn_effective_from":"2024-01-01"}}
        """;

    private static JsonNode Unit(string json, int chapter, int unit) =>
        JsonNode.Parse(json)!["chapters"]![chapter]!["articles"]![0]!["units"]![unit]!;

    [Fact]
    public void Only_the_matching_unit_is_marked_and_the_rest_is_kept()
    {
        var marked = ReviewedUnits.Mark(Content, "d1-1")!;

        Assert.True(Unit(marked, 0, 1)["reviewed"]!.GetValue<bool>());
        Assert.Equal("OCR", Unit(marked, 0, 1)["warning"]!.GetValue<string>());
        Assert.Null(Unit(marked, 0, 0)["reviewed"]);
        Assert.Equal(
            "2024-01-01",
            JsonNode.Parse(marked)!["metadata"]!["vbhn_effective_from"]!.GetValue<string>()
        );
    }

    [Fact]
    public void Units_in_a_later_chapter_are_found()
    {
        var marked = ReviewedUnits.Mark(Content, "d2-0")!;

        Assert.True(Unit(marked, 1, 0)["reviewed"]!.GetValue<bool>());
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("")]
    public void Unknown_unit_returns_null(string unitId) =>
        Assert.Null(ReviewedUnits.Mark(Content, unitId));

    [Fact]
    public void Document_without_content_returns_null() =>
        Assert.Null(ReviewedUnits.Mark(null, "d1-0"));
}
