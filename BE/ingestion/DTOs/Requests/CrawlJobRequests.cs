using System.ComponentModel.DataAnnotations;
using Caps.Ingestion.Features.CrawlJobs;

namespace Caps.Ingestion.DTOs.Requests;

/// <summary>Starts a manual crawl of vbpl (vbpl.vn) and/or mof (vbpq.mof.gov.vn).</summary>
/// <param name="TopN">Newest documents per document type; the crawler default (3) when omitted.</param>
/// <param name="All">Crawl every matching result (slow, for the first load); TopN is then ignored.</param>
public sealed record TriggerCrawlRequest(
    [Required, MinLength(1), MaxLength(2)] string[] Sources,
    [Range(1, 50)] int? TopN,
    bool All = false
)
{
    public TriggerCrawlCommand ToCommand(Guid userId) => new(userId, Sources, TopN, All);
}
