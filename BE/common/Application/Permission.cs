namespace Caps.Common.Application;

/// <summary>
/// Permissions carried in access tokens, shared by every service. The claim value is the member name,
/// so never rename a member; add new ones as features ship. Auth's PermissionMatrix decides who holds each.
/// </summary>
public enum Permission
{
    //USER
    ProfileRead,
    ProfileWrite,
    BusinessRead,
    BusinessWrite,

    //EXPERT
    ServiceManage,
    CaseWork,

    //AUTHOR_REVIEWER
    ExpertReview,

    //KNOWLEDGE_ADMIN
    KnowledgeManage,

    //SYSTEM_ADMIN
    UserManage,
    PricingManage,
}
