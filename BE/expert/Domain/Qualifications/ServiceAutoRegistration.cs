using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Domain.Qualifications;

/// <summary>
/// Q2: while the catalog offers exactly one service, Gate 1 ELIGIBLE opens the competency assessment for it
/// without the expert registering. With two or more services the expert chooses as before.
/// </summary>
public static class ServiceAutoRegistration
{
    /// <summary>History note of the automatic registration, shown to the expert and reviewers.</summary>
    public const string Note = "Tự đăng ký sau khi đủ điều kiện tham gia";

    /// <summary>The only service offered, or null when the catalog offers none or several.</summary>
    public static ServiceCatalogItem? OnlyService(IReadOnlyCollection<ServiceCatalogItem> active) =>
        active.Count == 1 ? active.First() : null;

    /// <summary>
    /// Registers only when the expert has never had a qualification for the service (Q3): an earlier one, even
    /// failed and still waiting out the interval, means the expert registers again themselves.
    /// </summary>
    public static bool ShouldRegister(
        ServiceCatalogItem? onlyService,
        ExpertServiceQualification? existing
    ) => onlyService != null && existing == null;
}
