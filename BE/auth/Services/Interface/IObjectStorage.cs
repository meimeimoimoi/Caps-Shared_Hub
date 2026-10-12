namespace auth.Services.Interface;

/// <summary>Lưu file riêng tư (hồ sơ chuyên gia). Không trả URL công khai; đọc lại qua API có kiểm tra quyền.</summary>
public interface IObjectStorage
{
    Task PutAsync(string key, byte[] content, string contentType, CancellationToken ct);
    Task<Stream> OpenAsync(string key, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
}
