using System.Threading.Channels;
using Caps.Expert.Application.Abstractions;

namespace Caps.Expert.Infrastructure.Ai;

/// <summary>Coalesces upload/submission signals to wake <see cref="EvidenceScreeningWorker"/> promptly.</summary>
public sealed class EvidenceScreeningWakeup : IScreeningWakeup
{
    private readonly Channel<bool> signal = Channel.CreateBounded<bool>(
        new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite }
    );

    public void Notify() => signal.Writer.TryWrite(true);

    public async Task WaitAsync(TimeSpan timeout, CancellationToken ct)
    {
        using var delayCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        delayCts.CancelAfter(timeout);
        try
        {
            await signal.Reader.WaitToReadAsync(delayCts.Token);
            while (signal.Reader.TryRead(out _)) { }
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            // Periodic sweep interval elapsed without an explicit wakeup.
        }
    }
}
