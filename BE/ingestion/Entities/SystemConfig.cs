using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Caps.Common.Domain;

namespace Caps.Ingestion.Entities;

[Table("system_config")]
public class SystemConfig
{
    [Key]
    [Column("key")]
    public string Key { get; set; } = string.Empty;

    [Column("value", TypeName = "jsonb")]
    public string Value { get; set; } = "{}";

    [Column("description")]
    public string? Description { get; set; }

    [Column("updated_by")]
    public Guid? UpdatedBy { get; set; }

    [Column("updated_at")]
    public DateTimeOffset? UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
