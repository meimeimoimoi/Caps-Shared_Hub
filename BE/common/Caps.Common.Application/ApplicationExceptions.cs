using Caps.Common.Domain;

namespace Caps.Common.Application;

public sealed class NotFoundException(string message) : DomainException(message);

public sealed class ValidationException(
    string message,
    IDictionary<string, string[]>? errors = null
) : DomainException(message)
{
    public IDictionary<string, string[]>? Errors { get; } = errors;
}
