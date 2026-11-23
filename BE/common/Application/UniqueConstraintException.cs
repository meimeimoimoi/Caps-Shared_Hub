namespace Caps.Common.Application;

/// <summary>A unique constraint rejected the write (e.g. two sign-ups with the same email at once).</summary>
public sealed class UniqueConstraintException(Exception inner)
    : Exception("Unique constraint violated.", inner);
