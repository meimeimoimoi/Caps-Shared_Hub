namespace Caps.Expert.Domain.Profiles;

/// <summary>One evidence file of an excuse request (hospital note, outage notice); kept in private storage.</summary>
public sealed class ExcuseFile
{
    private ExcuseFile() { }

    public Guid Id { get; private set; }
    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long SizeBytes { get; private set; }

    /// <summary>Key in object storage; files are read back only through the admin API.</summary>
    public string StorageKey { get; private set; } = default!;

    public static ExcuseFile Create(
        Guid reviewCaseId,
        string fileName,
        string contentType,
        long sizeBytes
    )
    {
        var id = Guid.NewGuid();
        return new()
        {
            Id = id,
            FileName = Path.GetFileName(fileName),
            ContentType = contentType,
            SizeBytes = sizeBytes,
            StorageKey = $"violations/{reviewCaseId}/{id}",
        };
    }
}
