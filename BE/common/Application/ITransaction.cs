namespace Caps.Common.Application;

/// <summary>Rolled back on dispose unless committed.</summary>
public interface ITransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct);
}
