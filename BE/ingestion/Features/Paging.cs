namespace Caps.Ingestion.Features;

/// <summary>Paging rules of the list endpoints: page starts at 1, pageSize is between 1 and 100.</summary>
public static class Paging
{
    public const int MaxPageSize = 100;

    public static void Ensure(int page, int pageSize)
    {
        if (page < 1 || pageSize < 1 || pageSize > MaxPageSize)
            throw IngestionErrors.InvalidPaging(MaxPageSize);
    }
}
