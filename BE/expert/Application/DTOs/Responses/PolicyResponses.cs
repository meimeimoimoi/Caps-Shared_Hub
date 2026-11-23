namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>Adjustable expert policy values in force now.</summary>
public sealed record ExpertPolicyResponse(PolicySettingResponse[] Settings);

/// <summary>One adjustable value with its default and allowed range.</summary>
/// <param name="UpdatedAt">Last change by a System Admin; null while the default applies.</param>
public sealed record PolicySettingResponse(
    string Key,
    int Value,
    int DefaultValue,
    int MinValue,
    int MaxValue,
    DateTimeOffset? UpdatedAt,
    string? UpdatedByUserId
);

/// <summary>One change of a policy value.</summary>
public sealed record PolicySettingChangeResponse(
    string Id,
    string Key,
    int OldValue,
    int NewValue,
    string Reason,
    string ChangedByUserId,
    DateTimeOffset ChangedAt
);
