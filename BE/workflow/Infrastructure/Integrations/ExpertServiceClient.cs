using System.Net.Http.Json;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Integrations;

/// <summary>The expert service's /internal endpoints: the offer a new case freezes, and capacity slots.</summary>
public sealed class ExpertServiceClient(HttpClient http, ILogger<ExpertServiceClient> logger)
    : IExpertOfferings,
        IExpertSlots
{
    private const string Service = "expert";

    public async Task<ReviewOffer?> FindAsync(
        Guid expertProfileId,
        string serviceCode,
        CancellationToken ct
    )
    {
        OfferData offer;
        try
        {
            using var response = await ServiceCalls.SendAsync(
                http,
                new(
                    HttpMethod.Get,
                    $"internal/experts/{expertProfileId}/offers/{Uri.EscapeDataString(serviceCode)}"
                ),
                Service,
                logger,
                ct
            );
            var body = await response.Content.ReadFromJsonAsync<Envelope<OfferData>>(ct);
            offer = body?.Data ?? throw WorkflowErrors.ServiceLinkUnavailable(Service);
        }
        catch (AppException e) when (e.Code == "EXPERT_NOT_BOOKABLE")
        {
            return null;
        }
        // ponytail: a full expert reads as not bookable (the marketplace already hides the button); accepting
        // re-checks the slot atomically, so this only spares the client a payment that would be refunded
        if (offer.FreeSlots <= 0)
        {
            return null;
        }
        return new(
            expertProfileId,
            offer.ExpertUserId,
            offer.ServiceOfferingId,
            offer.Fee,
            (short)offer.PlatformFeePercent,
            offer.TurnaroundHours,
            offer.LatePenaltyHours,
            (short)offer.LatePenaltyPercent,
            offer.LateCancelHours
        );
    }

    public async Task TakeAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct)
    {
        using var response = await ServiceCalls.SendAsync(
            http,
            new(HttpMethod.Put, SlotPath(expertProfileId, reviewCaseId)),
            Service,
            logger,
            ct
        );
    }

    public async Task ReleaseAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct)
    {
        using var response = await ServiceCalls.SendAsync(
            http,
            new(HttpMethod.Delete, SlotPath(expertProfileId, reviewCaseId)),
            Service,
            logger,
            ct
        );
    }

    private static string SlotPath(Guid expertProfileId, Guid reviewCaseId) =>
        $"internal/experts/{expertProfileId}/slots/{reviewCaseId}";

    private sealed record Envelope<T>(T? Data);

    private sealed record OfferData(
        Guid ExpertUserId,
        Guid ServiceOfferingId,
        long Fee,
        int TurnaroundHours,
        int PlatformFeePercent,
        int LatePenaltyHours,
        int LatePenaltyPercent,
        int LateCancelHours,
        int FreeSlots
    );
}
