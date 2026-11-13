namespace Caps.Workflow.Domain.Exceptions;

/// <summary>Legacy exception types for AI chat operations.</summary>
public static class ChatExceptions
{
    /// <summary>Thrown when a user has exhausted their AI query quota.</summary>
    public class InsufficientQuotaException : Exception
    {
        public InsufficientQuotaException(string message = "You have exhausted your free AI quota.")
            : base(message) { }
    }

    /// <summary>Thrown when a chat entity cannot be found.</summary>
    public class ChatEntityNotFoundException : Exception
    {
        public ChatEntityNotFoundException(string entityName, object key)
            : base($"{entityName} with identifier '{key}' was not found.") { }
    }

    /// <summary>Thrown when a user is denied access to a chat resource.</summary>
    public class ChatAccessDeniedException : Exception
    {
        public ChatAccessDeniedException(
            string message = "You do not have permission to access this resource."
        )
            : base(message) { }
    }

    /// <summary>Thrown when a chat operation is invalid for the current state.</summary>
    public class InvalidChatStateException : Exception
    {
        public InvalidChatStateException(string message)
            : base(message) { }
    }
}
