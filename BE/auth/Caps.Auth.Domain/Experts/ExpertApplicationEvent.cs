using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Experts;

/// <summary>Application audit trail: each status change stores the actor, time and note.</summary>
public sealed class ExpertApplicationEvent
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ApplicationId { get; set; }
    public ExpertApplication Application { get; set; } = default!;
    public Guid ActorUserId { get; set; }
    public User Actor { get; set; } = default!;
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = default!;
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
