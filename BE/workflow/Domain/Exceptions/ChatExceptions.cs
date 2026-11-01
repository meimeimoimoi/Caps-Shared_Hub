using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Domain.Exceptions;
public class ChatExceptions
{
    public class InsufficientQuotaException : Exception
    {
        public InsufficientQuotaException(string message = "You have exhausted your free AI quota.") : base(message) { }
    }

    public class ChatEntityNotFoundException : Exception
    {
        public ChatEntityNotFoundException(string entityName, object key)
            : base($"{entityName} with identifier '{key}' was not found.") { }
    }

    public class ChatAccessDeniedException : Exception
    {
        public ChatAccessDeniedException(string message = "You do not have permission to access this resource.")
            : base(message) { }
    }

    public class InvalidChatStateException : Exception
    {
        public InvalidChatStateException(string message) : base(message) { }
    }
}
