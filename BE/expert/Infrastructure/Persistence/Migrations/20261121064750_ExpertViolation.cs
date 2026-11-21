using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertViolation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "expert_violation",
                schema: "expert",
                columns: table => new
                {
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    points = table.Column<short>(type: "smallint", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    excused_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    excused_by = table.Column<Guid>(type: "uuid", nullable: true),
                    excused_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_violation", x => x.review_case_id);
                    table.CheckConstraint("ck_expert_violation_points", "points BETWEEN 1 AND 3");
                    table.ForeignKey(
                        name: "fk_expert_violation_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_expert_violation_profile_time",
                schema: "expert",
                table: "expert_violation",
                columns: new[] { "expert_profile_id", "occurred_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "expert_violation",
                schema: "expert");
        }
    }
}
