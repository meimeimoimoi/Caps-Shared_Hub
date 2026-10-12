namespace Caps.Contracts;

// Hợp đồng giữa các service: chỉ thêm trường tùy chọn, không xóa/đổi tên trường đã phát hành.

public sealed record UserRegisteredEvent(string UserId, string Email, DateTimeOffset At);

/// <param name="Code">Mã 6 số nhập trực tiếp trên web (chỉ có ở email xác nhận); null với phiếu cũ.</param>
/// <param name="CodeExpiresAt">Hạn của mã, ngắn hơn hạn của liên kết.</param>
public sealed record AuthEmailRequestedEvent(
    Guid Id,
    string Email,
    string Purpose,
    string Link,
    DateTimeOffset ExpiresAt,
    string? Code = null,
    DateTimeOffset? CodeExpiresAt = null
);
