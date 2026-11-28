namespace Caps.Ingestion.Constants;

/// <summary>Values of knowledge_document.status.</summary>
public static class DocumentStatuses
{
    public const string Pending = "PENDING";
    public const string Approved = "APPROVED";
    public const string Rejected = "REJECTED";
    public const string Indexed = "INDEXED";
    public const string IndexFailed = "INDEX_FAILED";
    public const string Expired = "EXPIRED";
    public const string Revoked = "REVOKED";
    public const string Archived = "ARCHIVED";

    public static readonly string[] All =
    [
        Pending,
        Approved,
        Rejected,
        Indexed,
        IndexFailed,
        Expired,
        Revoked,
        Archived,
    ];

    public static bool HasVectorLifecycle(string status) =>
        status is Indexed or Expired or Revoked or Archived;
}
