using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Policies;

namespace Caps.Expert.Application.Features.Policies;

/// <summary>New values by PolicySettingKeys name with one reason for the whole change.</summary>
/// <param name="Expected">
/// The value of each changed key as the admin last read it, so a change made meanwhile by someone else is not
/// overwritten unseen (optimistic concurrency).
/// </param>
public sealed record UpdateExpertPolicyCommand(
    Guid ActorUserId,
    IReadOnlyDictionary<string, int> Values,
    IReadOnlyDictionary<string, int> Expected,
    string? Reason
);

/// <summary>
/// Stores the values that differ from those in force and records each change in the history. The new values
/// apply to the next decision; past decisions keep the values they stored. Refused with POLICY_CHANGED when a
/// value no longer matches what the admin read, including two first changes of the same key at once.
/// </summary>
public sealed class UpdateExpertPolicyHandler(
    IPolicySettingRepository settings,
    IPolicyDescriber describer,
    ExpertPolicyOptions options,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<UpdateExpertPolicyCommand, ExpertPolicyResponse>
{
    public async Task<ExpertPolicyResponse> HandleAsync(
        UpdateExpertPolicyCommand command,
        CancellationToken ct
    )
    {
        foreach (var (key, value) in command.Values)
            PolicySettingKeys.Validate(key, value);
        if (string.IsNullOrWhiteSpace(command.Reason))
            throw ExpertErrors.PolicyReasonRequired();

        var now = clock.GetUtcNow();
        var stored = (await settings.ListAsync(ct)).ToDictionary(x => x.Key);
        var defaults = options.AdjustableDefaults;
        foreach (var key in command.Values.Keys)
        {
            if (!command.Expected.TryGetValue(key, out var expected))
                throw ExpertErrors.PolicyExpectedValueRequired(key);
            var inForce = stored.TryGetValue(key, out var current)
                ? PolicySettingKeys.Clamp(key, current.Value)
                : defaults[key];
            if (inForce != expected)
                throw ExpertErrors.PolicyChanged(key);
        }
        foreach (var (key, value) in command.Values)
        {
            if (stored.TryGetValue(key, out var setting))
            {
                if (setting.Value != value)
                {
                    var change = setting.Change(value, command.ActorUserId, command.Reason, now);
                    settings.AddChange(change);
                }
                continue;
            }
            if (defaults[key] == value)
                continue;
            var (created, first) = PolicySetting.Create(
                key,
                defaults[key],
                value,
                command.ActorUserId,
                command.Reason,
                now
            );
            settings.Add(created);
            settings.AddChange(first);
        }
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Another admin stored the first change of the same key between our read and this save
            throw ExpertErrors.PolicyChanged(string.Join(", ", command.Values.Keys));
        }
        return await describer.DescribeAsync(ct);
    }
}
