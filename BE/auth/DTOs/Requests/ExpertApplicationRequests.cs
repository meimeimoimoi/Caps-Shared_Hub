using System.ComponentModel.DataAnnotations;

namespace auth.DTOs.Requests;

/// <summary>
/// Lưu nháp hồ sơ chuyên gia: mọi trường đều có thể để trống; điều kiện bắt buộc chỉ kiểm tra lúc nộp.
/// </summary>
public sealed record SaveExpertApplicationRequest(
    [MaxLength(128)] string? DisplayName,
    [Phone, MaxLength(32)] string? Phone,
    DateOnly? BirthDate,
    [MaxLength(128)] string? Title,
    [MaxLength(256)] string? Company,
    [MaxLength(128)] string? Location,
    [MaxLength(1000)] string? Bio,
    [Range(0, 80)] int? YearsExperience,
    [MaxLength(10)] string[]? Fields,
    [MaxLength(2000)] string? Highlights
);

public sealed record SupplementExpertApplicationRequest([MaxLength(2000)] string? Note);
