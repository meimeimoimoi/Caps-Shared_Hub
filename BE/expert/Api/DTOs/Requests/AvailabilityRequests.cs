using Caps.Expert.Application.Common;
using Caps.Expert.Application.Features.Availability;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>A new slot: 1–12 hours, starting in the future, not overlapping another open slot.</summary>
public sealed record AddSlotRequest(DateTimeOffset StartAt, DateTimeOffset EndAt)
{
    public AddSlotCommand ToCommand(Applicant applicant) => new(applicant, StartAt, EndAt);
}

/// <summary>Turns new requests on or off for one service.</summary>
public sealed record ServiceAcceptingRequest(bool Accepting)
{
    public SetServiceAcceptingCommand ToCommand(Applicant applicant, string serviceCode) =>
        new(applicant, serviceCode, Accepting);
}
