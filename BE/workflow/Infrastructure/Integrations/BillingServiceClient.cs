using System.Net.Http.Json;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Integrations;

/// <summary>
/// The billing service's /internal escrow endpoints. Each is safe to repeat for the same case, so a call that
/// timed out after billing committed succeeds when the client retries.
/// </summary>
public sealed class BillingServiceClient(HttpClient http, ILogger<BillingServiceClient> logger)
    : IEscrows,
        IAiCredits
{
    private const string Service = "billing";

    public Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct) =>
        SendAsync(
            HttpMethod.Put,
            $"internal/escrows/{reviewCaseId}",
            JsonContent.Create(new { userId, amount }),
            ct
        );

    public Task RefundAsync(Guid reviewCaseId, CancellationToken ct) =>
        SendAsync(HttpMethod.Post, $"internal/escrows/{reviewCaseId}/refund", null, ct);

    public Task ReleaseAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        string? expertEmail,
        ReviewSettlement settlement,
        CancellationToken ct
    ) =>
        SendAsync(
            HttpMethod.Post,
            $"internal/escrows/{reviewCaseId}/settle",
            JsonContent.Create(
                new
                {
                    expertUserId,
                    expertEmail,
                    userRefund = settlement.ClientRefund,
                    platformFee = settlement.PlatformFee,
                    expertPayout = settlement.ExpertAmount,
                }
            ),
            ct
        );

    Task IAiCredits.HoldAsync(
        Guid userId,
        Guid aiUsageId,
        long amount,
        string? note,
        CancellationToken ct
    ) =>
        SendAsync(
            HttpMethod.Put,
            $"internal/ai-credits/{aiUsageId}",
            JsonContent.Create(
                new
                {
                    userId,
                    amount,
                    note,
                }
            ),
            ct
        );

    Task IAiCredits.CaptureAsync(
        Guid aiUsageId,
        Guid? documentVersionId,
        string? note,
        CancellationToken ct
    ) =>
        SendAsync(
            HttpMethod.Post,
            $"internal/ai-credits/{aiUsageId}/capture",
            JsonContent.Create(new { documentVersionId, note }),
            ct
        );

    Task IAiCredits.ReleaseAsync(Guid aiUsageId, string? note, CancellationToken ct) =>
        SendAsync(
            HttpMethod.Post,
            $"internal/ai-credits/{aiUsageId}/release",
            JsonContent.Create(new { note }),
            ct
        );

    private async Task SendAsync(
        HttpMethod method,
        string path,
        HttpContent? content,
        CancellationToken ct
    )
    {
        using var response = await ServiceCalls.SendAsync(
            http,
            new(method, path) { Content = content },
            Service,
            logger,
            ct
        );
    }
}
