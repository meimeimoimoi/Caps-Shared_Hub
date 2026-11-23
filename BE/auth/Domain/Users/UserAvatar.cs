using Caps.Common.Domain;

namespace Caps.Auth.Domain.Users;

/// <summary>
/// Avatar stored in the DB (separate table so reading users does not load the bytea).
/// </summary>
public sealed class UserAvatar
{
    public const int MaxBytes = 2 * 1024 * 1024;

    private static readonly string[] AllowedTypes =
    [
        FileSignature.Jpeg,
        FileSignature.Png,
        FileSignature.Webp,
    ];

    private UserAvatar() { }

    public Guid UserId { get; private set; }
    public User User { get; } = default!;
    public string ContentType { get; private set; } = default!;
    public byte[] Data { get; private set; } = default!;
    public DateTimeOffset UpdatedAt { get; private set; }

    public static UserAvatar Create(Guid userId) => new() { UserId = userId };

    /// <summary>Validates the image (size and format detected from its bytes) before storing it.</summary>
    public void Replace(byte[] data, DateTimeOffset now)
    {
        ContentType = ValidateImage(data);
        Data = data;
        UpdatedAt = now;
    }

    /// <summary>Accepts a non-empty JPEG, PNG or WebP image within the size limit, judged by its bytes.</summary>
    /// <returns>The detected content type.</returns>
    public static string ValidateImage(byte[] data)
    {
        if (data.Length == 0)
            throw AuthErrors.AvatarRequired();
        if (data.Length > MaxBytes)
            throw AuthErrors.AvatarTooLarge();
        var type = FileSignature.Detect(data);
        return type != null && AllowedTypes.Contains(type)
            ? type
            : throw AuthErrors.AvatarInvalidType();
    }
}
