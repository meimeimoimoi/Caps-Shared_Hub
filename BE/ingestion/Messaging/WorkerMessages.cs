namespace Caps.Ingestion.Messaging;

// Read by the Python crawler worker (crawler/worker.py) from the "message" field of the MassTransit envelope,
// on the exchange named after the type (Caps.Ingestion.Messaging:<Type>). Only add optional fields.

/// <summary>Asks the crawler worker to run one crawl job and post what it finds back to ingestion.</summary>
/// <param name="TopN">Newest documents per document type; null uses the crawler default.</param>
/// <param name="All">Crawl every matching result; TopN is then ignored.</param>
public sealed record CrawlRequested(
    Guid CrawlJobId,
    IReadOnlyList<string> Sources,
    int? TopN,
    bool All
);
