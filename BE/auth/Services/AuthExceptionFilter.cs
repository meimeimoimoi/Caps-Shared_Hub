using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
namespace auth.Services;
public sealed class AuthExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not AuthFailure e) return;
        context.Result = new ObjectResult(new { success = false, data = (object?)null, message = e.Message, code = e.Code }) { StatusCode = e.Status };
        context.ExceptionHandled = true;
    }
}
