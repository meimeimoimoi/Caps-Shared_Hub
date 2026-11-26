using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Payments;

/// <summary>A raw notification body posted by the payment provider (webhook).</summary>
public sealed record HandlePaymentNoticeCommand(string Body);

/// <summary>
/// Credits the wallet once per paid order (see <see cref="TopupCrediting"/>). Unknown orders (such as the
/// provider's test notification) are acknowledged and ignored.
/// </summary>
public sealed class HandlePaymentNoticeHandler(IPaymentGateway gateway, ITopupCrediting crediting)
    : ICommandHandler<HandlePaymentNoticeCommand>
{
    public async Task HandleAsync(HandlePaymentNoticeCommand command, CancellationToken ct)
    {
        var notice = gateway.ReadNotice(command.Body);
        if (notice.Paid)
            await crediting.CreditAsync(notice, ct);
    }
}
