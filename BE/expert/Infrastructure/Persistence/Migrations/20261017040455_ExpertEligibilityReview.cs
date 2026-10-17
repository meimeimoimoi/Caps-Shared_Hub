using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertEligibilityReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_expert_application_open",
                schema: "expert",
                table: "expert_application");

            migrationBuilder.CreateTable(
                name: "eligibility_check",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    criterion = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    result = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    reviewer_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_eligibility_check", x => x.id);
                    table.ForeignKey(
                        name: "fk_eligibility_check_application",
                        column: x => x.application_id,
                        principalSchema: "expert",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_eligibility_check_event",
                        column: x => x.event_id,
                        principalSchema: "expert",
                        principalTable: "expert_application_event",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ux_expert_application_open",
                schema: "expert",
                table: "expert_application",
                column: "expert_profile_id",
                unique: true,
                filter: "status NOT IN ('ELIGIBLE', 'NOT_ELIGIBLE', 'REJECTED', 'APPROVED')");

            migrationBuilder.CreateIndex(
                name: "ix_eligibility_check_application",
                schema: "expert",
                table: "eligibility_check",
                columns: new[] { "application_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ux_eligibility_check_decision",
                schema: "expert",
                table: "eligibility_check",
                columns: new[] { "event_id", "criterion" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "eligibility_check",
                schema: "expert");

            migrationBuilder.DropIndex(
                name: "ux_expert_application_open",
                schema: "expert",
                table: "expert_application");

            migrationBuilder.CreateIndex(
                name: "ux_expert_application_open",
                schema: "expert",
                table: "expert_application",
                column: "expert_profile_id",
                unique: true,
                filter: "status NOT IN ('NOT_ELIGIBLE', 'REJECTED', 'APPROVED')");
        }
    }
}
