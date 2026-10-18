namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>The expert's open slots, per-service request switches and the slot rules.</summary>
public sealed record MyAvailabilityResponse(
    AvailabilitySlotResponse[] Slots,
    ServiceAvailabilityResponse[] Services,
    int MinHours,
    int MaxHours,
    int MaxOpenSlots,
    int MaxDaysAhead
);

/// <summary>One slot in which the expert can take new work.</summary>
public sealed record AvailabilitySlotResponse(
    string Id,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    string Status
);

/// <summary>Whether the expert takes new requests for one service.</summary>
/// <param name="CanTurnOn">The service is approved, so requests can be turned on.</param>
public sealed record ServiceAvailabilityResponse(
    string ServiceCode,
    string ServiceName,
    string QualificationStatus,
    bool AcceptingRequests,
    bool CanTurnOn
);
