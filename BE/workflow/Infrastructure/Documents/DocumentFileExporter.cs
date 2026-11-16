using System.Globalization;
using System.Text.Json;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Workspace;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using DomainDocument = Caps.Workflow.Domain.Workspace.Document;
using PdfDocument = QuestPDF.Fluent.Document;
using WordBody = DocumentFormat.OpenXml.Wordprocessing.Body;
using WordDocument = DocumentFormat.OpenXml.Wordprocessing.Document;

namespace Caps.Workflow.Infrastructure.Documents;

/// <summary>Renders structured document versions (AI drafts and expert reviews) into PDF and DOCX files.</summary>
public sealed class DocumentFileExporter : IDocumentFileExporter
{
    static DocumentFileExporter()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Export(DomainDocument document, DocumentVersion version, string format)
    {
        var model = BuildExportModel(document, version);
        return string.Equals(format, "docx", StringComparison.OrdinalIgnoreCase)
            ? RenderDocx(model)
            : RenderPdf(model);
    }

    private static ExportModel BuildExportModel(DomainDocument document, DocumentVersion version)
    {
        var entries = new List<ExportEntry>();
        AppendJsonEntries(version.Content, entries);
        var citations = ParseCitations(version.Citations);

        return new ExportModel(
            Title: document.Title,
            Period: $"{document.PeriodStart:yyyy-MM-dd} to {document.PeriodEnd:yyyy-MM-dd}",
            VersionLabel: $"v{version.VersionNo} ({version.VersionType})",
            Assessment: version.DraftAssessment,
            ContentHash: version.ContentHash,
            CreatedAt: version.CreatedAt.ToString(
                "yyyy-MM-dd HH:mm 'UTC'",
                CultureInfo.InvariantCulture
            ),
            Entries: entries,
            Citations: citations
        );
    }

    private static void AppendJsonEntries(string rawJson, List<ExportEntry> entries)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            return;
        }

        try
        {
            using var jsonDoc = JsonDocument.Parse(rawJson);
            WalkElement(jsonDoc.RootElement, null, entries, depth: 0);
        }
        catch (JsonException)
        {
            entries.Add(new ExportEntry(0, null, rawJson));
        }
    }

    private static void WalkElement(
        JsonElement element,
        string? label,
        List<ExportEntry> entries,
        int depth
    )
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                if (!string.IsNullOrWhiteSpace(label))
                {
                    entries.Add(new ExportEntry(depth, FormatLabel(label), null));
                }

                foreach (var prop in element.EnumerateObject())
                {
                    WalkElement(prop.Value, prop.Name, entries, depth + 1);
                }
                break;

            case JsonValueKind.Array:
                if (!string.IsNullOrWhiteSpace(label))
                {
                    entries.Add(new ExportEntry(depth, FormatLabel(label), null));
                }

                var index = 1;
                foreach (var item in element.EnumerateArray())
                {
                    if (item.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
                    {
                        WalkElement(item, $"Item {index}", entries, depth + 1);
                    }
                    else
                    {
                        entries.Add(new ExportEntry(depth + 1, $"{index}.", FormatScalar(item)));
                    }

                    index++;
                }
                break;

            default:
                entries.Add(
                    new ExportEntry(
                        depth,
                        string.IsNullOrWhiteSpace(label) ? null : FormatLabel(label),
                        FormatScalar(element)
                    )
                );
                break;
        }
    }

    private static List<string> ParseCitations(string? citationsJson)
    {
        var result = new List<string>();
        if (string.IsNullOrWhiteSpace(citationsJson))
        {
            return result;
        }

        try
        {
            using var doc = JsonDocument.Parse(citationsJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
            {
                return result;
            }

            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var docNo = ReadString(item, "document_number") ?? ReadString(item, "doc_number");
                var title = ReadString(item, "doc_title") ?? ReadString(item, "document_title");
                var article = ReadString(item, "article");
                var clause = ReadString(item, "clause");
                var point = ReadString(item, "point");

                var parts = new[] { docNo, title, article, clause, point }
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .ToArray();
                if (parts.Length > 0)
                {
                    result.Add(string.Join(" — ", parts));
                }
            }
        }
        catch (JsonException)
        {
            // Ignore malformed optional citation metadata during export
        }

        return result;
    }

    private static byte[] RenderPdf(ExportModel model)
    {
        return PdfDocument
            .Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(36);
                    page.DefaultTextStyle(style => style.FontSize(10));

                    page.Header()
                        .Column(col =>
                        {
                            col.Item().Text(model.Title).FontSize(16).Bold();
                            col.Item()
                                .Text($"Period: {model.Period}  |  Version: {model.VersionLabel}")
                                .FontSize(9)
                                .FontColor(Colors.Grey.Darken1);
                            if (!string.IsNullOrWhiteSpace(model.Assessment))
                            {
                                col.Item()
                                    .Text($"Assessment: {model.Assessment}")
                                    .FontSize(9)
                                    .FontColor(Colors.Grey.Darken1);
                            }

                            col.Item()
                                .PaddingTop(6)
                                .LineHorizontal(1)
                                .LineColor(Colors.Grey.Lighten2);
                        });

                    page.Content()
                        .PaddingVertical(10)
                        .Column(col =>
                        {
                            col.Spacing(4);
                            foreach (var entry in model.Entries)
                            {
                                var indent = Math.Min(entry.Depth, 4) * 10;
                                if (entry.Value is null && entry.Label is not null)
                                {
                                    col.Item()
                                        .PaddingLeft(indent)
                                        .PaddingTop(4)
                                        .Text(entry.Label)
                                        .Bold()
                                        .FontSize(11);
                                }
                                else if (entry.Label is not null)
                                {
                                    col.Item()
                                        .PaddingLeft(indent)
                                        .Text(text =>
                                        {
                                            text.Span($"{entry.Label}: ").SemiBold();
                                            text.Span(entry.Value ?? string.Empty);
                                        });
                                }
                                else if (!string.IsNullOrWhiteSpace(entry.Value))
                                {
                                    col.Item().PaddingLeft(indent).Text(entry.Value);
                                }
                            }

                            if (model.Citations.Count > 0)
                            {
                                col.Item()
                                    .PaddingTop(10)
                                    .LineHorizontal(1)
                                    .LineColor(Colors.Grey.Lighten2);
                                col.Item()
                                    .PaddingTop(4)
                                    .Text("Legal Citations")
                                    .Bold()
                                    .FontSize(11);
                                foreach (var citation in model.Citations)
                                {
                                    col.Item().PaddingLeft(8).Text($"• {citation}").FontSize(9);
                                }
                            }
                        });

                    page.Footer()
                        .AlignCenter()
                        .Text(text =>
                        {
                            text.DefaultTextStyle(s => s.FontSize(8).FontColor(Colors.Grey.Medium));
                            text.Span(
                                $"Hash: {model.ContentHash}  |  Generated {model.CreatedAt}  |  Page "
                            );
                            text.CurrentPageNumber();
                            text.Span(" / ");
                            text.TotalPages();
                        });
                });
            })
            .GeneratePdf();
    }

    private static byte[] RenderDocx(ExportModel model)
    {
        using var stream = new MemoryStream();
        using (
            var wordDoc = WordprocessingDocument.Create(
                stream,
                WordprocessingDocumentType.Document,
                autoSave: true
            )
        )
        {
            var mainPart = wordDoc.AddMainDocumentPart();
            var body = new WordBody();
            mainPart.Document = new WordDocument(body);

            body.Append(CreateParagraph(model.Title, bold: true, fontSizeHalfPoints: "32"));
            body.Append(
                CreateParagraph(
                    $"Period: {model.Period} | Version: {model.VersionLabel}",
                    bold: false,
                    fontSizeHalfPoints: "18"
                )
            );
            if (!string.IsNullOrWhiteSpace(model.Assessment))
            {
                body.Append(
                    CreateParagraph(
                        $"Assessment: {model.Assessment}",
                        bold: false,
                        fontSizeHalfPoints: "18"
                    )
                );
            }

            foreach (var entry in model.Entries)
            {
                var prefix = new string(' ', Math.Min(entry.Depth, 4) * 2);
                if (entry.Value is null && entry.Label is not null)
                {
                    body.Append(
                        CreateParagraph(
                            $"{prefix}{entry.Label}",
                            bold: true,
                            fontSizeHalfPoints: "22"
                        )
                    );
                }
                else if (entry.Label is not null)
                {
                    body.Append(
                        CreateKeyValueParagraph(
                            $"{prefix}{entry.Label}: ",
                            entry.Value ?? string.Empty
                        )
                    );
                }
                else if (!string.IsNullOrWhiteSpace(entry.Value))
                {
                    body.Append(
                        CreateParagraph(
                            $"{prefix}{entry.Value}",
                            bold: false,
                            fontSizeHalfPoints: "20"
                        )
                    );
                }
            }

            if (model.Citations.Count > 0)
            {
                body.Append(
                    CreateParagraph("Legal Citations", bold: true, fontSizeHalfPoints: "22")
                );
                foreach (var citation in model.Citations)
                {
                    body.Append(
                        CreateParagraph($"• {citation}", bold: false, fontSizeHalfPoints: "18")
                    );
                }
            }

            body.Append(
                CreateParagraph(
                    $"Content Hash: {model.ContentHash} | Created: {model.CreatedAt}",
                    bold: false,
                    fontSizeHalfPoints: "16"
                )
            );
            mainPart.Document.Save();
        }

        return stream.ToArray();
    }

    private static Paragraph CreateParagraph(string text, bool bold, string fontSizeHalfPoints)
    {
        var runProps = new RunProperties(new FontSize { Val = fontSizeHalfPoints });
        if (bold)
        {
            runProps.Append(new Bold());
        }

        var run = new Run(runProps, new Text(text) { Space = SpaceProcessingModeValues.Preserve });
        return new Paragraph(run);
    }

    private static Paragraph CreateKeyValueParagraph(string keyPrefix, string value)
    {
        var keyRun = new Run(
            new RunProperties(new Bold(), new FontSize { Val = "20" }),
            new Text(keyPrefix) { Space = SpaceProcessingModeValues.Preserve }
        );
        var valueRun = new Run(
            new RunProperties(new FontSize { Val = "20" }),
            new Text(value) { Space = SpaceProcessingModeValues.Preserve }
        );
        return new Paragraph(keyRun, valueRun);
    }

    private static string FormatLabel(string raw) => raw.Replace('_', ' ').Trim();

    private static string FormatScalar(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.Null => "-",
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => element.ToString(),
        };

    private static string? ReadString(JsonElement element, string property)
    {
        if (
            element.TryGetProperty(property, out var value)
            && value.ValueKind == JsonValueKind.String
        )
        {
            return value.GetString();
        }

        return null;
    }

    private sealed record ExportEntry(int Depth, string? Label, string? Value);

    private sealed record ExportModel(
        string Title,
        string Period,
        string VersionLabel,
        string? Assessment,
        string ContentHash,
        string CreatedAt,
        IReadOnlyList<ExportEntry> Entries,
        IReadOnlyList<string> Citations
    );
}
