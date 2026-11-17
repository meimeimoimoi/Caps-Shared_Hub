namespace Caps.Expert.Application.Abstractions;

/// <summary>Signals the background screening worker to process pending extractions and runs immediately.</summary>
public interface IScreeningWakeup
{
    void Notify();
}
