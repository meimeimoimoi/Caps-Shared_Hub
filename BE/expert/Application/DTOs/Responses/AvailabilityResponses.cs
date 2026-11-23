namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>How many cases the expert runs at once and the per-service request switches.</summary>
/// <param name="Capacity">Cases at once, 0 until the expert sets it.</param>
/// <param name="ActiveCases">Accepted cases currently holding a slot (set by the case flow).</param>
/// <param name="MaxCapacity">Highest capacity the expert may set.</param>
public sealed record MyAvailabilityResponse(
    int Capacity,
    int ActiveCases,
    int MaxCapacity,
    ServiceAvailabilityResponse[] Services
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
