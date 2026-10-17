namespace Caps.Expert.Application.Abstractions;

/// <summary>Private file storage. No public URLs; files are read back through an API that checks access.</summary>
public interface IObjectStorage
{
    Task PutAsync(string key, byte[] content, string contentType, CancellationToken ct);
    Task<Stream> OpenAsync(string key, CancellationToken ct);

    /// <summary>Best-effort delete: an orphaned file only wastes space, so failures are logged, not thrown.</summary>
    Task DeleteQuietlyAsync(string key);
}
