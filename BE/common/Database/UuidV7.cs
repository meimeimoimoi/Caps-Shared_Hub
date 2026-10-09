using System.Security.Cryptography;

namespace Caps.Common.Database;

/// <summary>
/// UUID version 7 generator complying with RFC 9562.
/// Provides time-ordered UUIDs for optimal database index clustering.
/// </summary>
public static class UuidV7
{
    public static Guid NewGuid()
    {
        Span<byte> bytes = stackalloc byte[16];
        RandomNumberGenerator.Fill(bytes);

        long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        // 48-bit big-endian timestamp
        bytes[0] = (byte)(timestamp >> 40);
        bytes[1] = (byte)(timestamp >> 32);
        bytes[2] = (byte)(timestamp >> 24);
        bytes[3] = (byte)(timestamp >> 16);
        bytes[4] = (byte)(timestamp >> 8);
        bytes[5] = (byte)timestamp;

        // Version 7: set bits 4-7 of byte 6 to 0111 (0x70)
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x70);

        // Variant 1 (RFC 4122/9562): set bits 6-7 of byte 8 to 10 (0x80)
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);

        // Note: Guid constructor in .NET for byte[] interprets first 3 fields in native endianness on little-endian platforms.
        // To produce exact standard big-endian RFC 9562 string/DB representation:
        return new Guid(bytes, bigEndian: true);
    }
}
