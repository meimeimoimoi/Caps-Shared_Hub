namespace Caps.Auth.Application.Abstractions.Persistence;

public interface IUnitOfWork
{
    Task<ITransaction> BeginTransactionAsync(CancellationToken ct);

    /// <summary>Persists tracked changes; throws <see cref="UniqueConstraintException"/> on duplicates.</summary>
    Task SaveChangesAsync(CancellationToken ct);
}

/// <summary>Rolled back on dispose unless committed.</summary>
public interface ITransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct);
}

/// <summary>A unique constraint rejected the write (e.g. two sign-ups with the same email at once).</summary>
public sealed class UniqueConstraintException(Exception inner)
    : Exception("Unique constraint violated.", inner);
