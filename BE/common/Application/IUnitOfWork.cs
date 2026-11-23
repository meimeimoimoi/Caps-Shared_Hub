namespace Caps.Common.Application;

/// <summary>Commits a use case's changes as one unit; implemented once for every service in Caps.Common.Persistence.</summary>
public interface IUnitOfWork
{
    Task<ITransaction> BeginTransactionAsync(CancellationToken ct);

    /// <summary>Persists tracked changes; throws <see cref="UniqueConstraintException"/> on duplicates.</summary>
    Task SaveChangesAsync(CancellationToken ct);
}
