namespace auth.Services.Interface;

/// <summary>Private file storage (expert applications). No public URLs; files are read back through an API that checks access.</summary>
public interface IObjectStorage
{
    Task PutAsync(string key, byte[] content, string contentType, CancellationToken ct);
    Task<Stream> OpenAsync(string key, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
}
