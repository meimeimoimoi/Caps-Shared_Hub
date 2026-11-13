using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Infrastructure.Persistence.Configurations;
public class AiQuotaConfiguration : IEntityTypeConfiguration<AiQuota>
{
    public void Configure(EntityTypeBuilder<AiQuota> builder)
    {
        builder.ToTable("ai_quota");

        builder.HasKey(q => q.UserId);
        builder.Property(q => q.UserId).HasColumnName("user_id").ValueGeneratedNever();

        builder.Property(q => q.Balance).HasColumnName("balance").HasDefaultValue(10).IsRequired();
        builder.Property(q => q.UpdatedAt).HasColumnName("updated_at").IsRequired();
    }
}
