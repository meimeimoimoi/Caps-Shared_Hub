using Caps.Expert.Domain.Policies;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Policy values changed by a System Admin and the history of those changes.</summary>
public interface IPolicySettingRepository
{
    /// <summary>Every stored value, tracked for changes; keys without a row use their default.</summary>
    Task<IReadOnlyList<PolicySetting>> ListAsync(CancellationToken ct);

    /// <summary>Most recent changes first.</summary>
    Task<IReadOnlyList<PolicySettingChange>> ListChangesAsync(int limit, CancellationToken ct);
    void Add(PolicySetting setting);
    void AddChange(PolicySettingChange change);
}
