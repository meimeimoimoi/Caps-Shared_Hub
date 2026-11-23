using Caps.Auth.Domain.Users;
using Permission = Caps.Common.Application.Permission;

namespace Caps.Auth.Application.Common;

/// <summary>
/// Which roles hold each permission; auth writes the result into the access token once per session.
/// The switch has no default arm: a new Permission without a row breaks the build (CS8509, -warnaserror in CI).
/// Every account has USER, so a USER row reaches everyone.
/// </summary>
public static class PermissionMatrix
{
    private static readonly string[] AnyUser = { RoleCodes.User };
    private static readonly string[] Expert = { RoleCodes.Expert };
    private static readonly string[] AuthorReviewer = { RoleCodes.AuthorReviewer };
    private static readonly string[] KnowledgeAdmin = { RoleCodes.KnowledgeAdmin };
    private static readonly string[] SystemAdmin = { RoleCodes.SystemAdmin };

    /// <summary>Permission claim values for a user holding these roles.</summary>
    public static string[] For(IReadOnlyCollection<string> roles) =>
        Enum.GetValues<Permission>()
            .Where(p => RolesFor(p).Any(roles.Contains))
            .Select(p => p.ToString())
            .ToArray();

#pragma warning disable CS8524 // Only unnamed enum values are unhandled; CS8509 still catches a missing member.
    private static string[] RolesFor(Permission permission) =>
        permission switch
        {
            //USER
            Permission.ProfileRead
            or Permission.ProfileWrite
            or Permission.BusinessRead
            or Permission.BusinessWrite => AnyUser,

            //EXPERT
            Permission.ServiceManage or Permission.CaseWork => Expert,

            //AUTHOR_REVIEWER
            Permission.ExpertReview => AuthorReviewer,

            //KNOWLEDGE_ADMIN
            Permission.KnowledgeManage => KnowledgeAdmin,

            //SYSTEM_ADMIN
            Permission.UserManage
            or Permission.PayoutManage
            or Permission.ExpertApprove
            or Permission.PricingManage
            or Permission.DisputeResolve => SystemAdmin,
        };
#pragma warning restore CS8524
}
