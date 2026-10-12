using Caps.Contracts;

namespace Caps.Auth.Application.Abstractions.Email;

/// <summary>Stores the email request in the same transaction; a background publisher sends it later.</summary>
public interface IAuthEmailOutbox
{
    void Enqueue(AuthEmailRequestedEvent message);
}
