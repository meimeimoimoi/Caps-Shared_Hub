using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Caps.Workflow.Infrastructure.Persistence.Configurations;

public class AiUsageConfiguration : IEntityTypeConfiguration<AiUsage>
{
    public void Configure(EntityTypeBuilder<AiUsage> builder)
    {
        builder.ToTable("ai_usage");

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(u => u.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(u => u.ConversationId).HasColumnName("conversation_id");
        builder.Property(u => u.QuestionId).HasColumnName("question_id");
        builder.Property(u => u.PaidWith).HasColumnName("paid_with").IsRequired();
        builder
            .Property(u => u.CreditHold)
            .HasColumnName("credit_hold")
            .HasDefaultValue(0L)
            .IsRequired();
        builder
            .Property(u => u.State)
            .HasColumnName("state")
            .HasDefaultValue("RESERVED")
            .IsRequired();
        builder.Property(u => u.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(u => u.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(u => new { u.UserId, u.State }).HasDatabaseName("ix_ai_usage_2");
    }
}
