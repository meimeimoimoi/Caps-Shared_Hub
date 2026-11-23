using Caps.Expert.Application.Common;
using Caps.Expert.Application.Features.Availability;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>How many cases the expert runs at once: 1–20.</summary>
public sealed record CapacityRequest(int Capacity);

/// <summary>Turns new requests on or off for one service.</summary>
public sealed record ServiceAcceptingRequest(bool Accepting)
{
    public SetServiceAcceptingCommand ToCommand(Applicant applicant, string serviceCode) =>
        new(applicant, serviceCode, Accepting);
}
