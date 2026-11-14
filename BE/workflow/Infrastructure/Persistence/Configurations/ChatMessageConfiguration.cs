using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Caps.Workflow.Infrastructure.Persistence.Configurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("chat_message");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(m => m.ConversationId).HasColumnName("conversation_id").IsRequired();
        builder.Property(m => m.Sender).HasColumnName("sender").IsRequired();
        builder.Property(m => m.Content).HasColumnName("content").IsRequired();
        builder.Property(m => m.PeriodStart).HasColumnName("period_start");
        builder.Property(m => m.PeriodEnd).HasColumnName("period_end");
        builder.Property(m => m.ScopeResult).HasColumnName("scope_result");
        builder.Property(m => m.AnswerStatus).HasColumnName("answer_status");
        builder.Property(m => m.Citations).HasColumnName("citations").HasColumnType("jsonb");
        builder.Property(m => m.CreatedAt).HasColumnName("created_at").IsRequired();

        builder
            .HasIndex(m => new { m.ConversationId, m.CreatedAt })
            .HasDatabaseName("ix_chat_message_2");
    }
}
