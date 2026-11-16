using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewDisputes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_review_case_open",
                schema: "review",
                table: "review_case");

            migrationBuilder.AddColumn<short>(
                name: "dispute_refund_pct",
                schema: "review",
                table: "review_case",
                type: "smallint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "review_dispute",
                schema: "review",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    opened_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    decide_by = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    extended = table.Column<bool>(type: "boolean", nullable: false),
                    expert_statement = table.Column<string>(type: "text", nullable: true),
                    expert_statement_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    resolved_by = table.Column<Guid>(type: "uuid", nullable: true),
                    refund_pct = table.Column<short>(type: "smallint", nullable: true),
                    resolution_note = table.Column<string>(type: "text", nullable: true),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_dispute", x => x.id);
                    table.CheckConstraint("ck_review_dispute_refund", "refund_pct BETWEEN 0 AND 100");
                    table.ForeignKey(
                        name: "fk_review_dispute_case",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ux_review_case_open",
                schema: "review",
                table: "review_case",
                columns: new[] { "source_version_id", "expert_profile_id" },
                unique: true,
                filter: "status IN ('AWAITING_PAYMENT', 'PENDING_EXPERT_RESPONSE', 'IN_REVIEW', 'AWAITING_USER_INFORMATION', 'AWAITING_ACCEPTANCE', 'DISPUTED')");

            migrationBuilder.CreateIndex(
                name: "ix_review_dispute_queue",
                schema: "review",
                table: "review_dispute",
                columns: new[] { "status", "decide_by" });

            migrationBuilder.CreateIndex(
                name: "ux_review_dispute_case",
                schema: "review",
                table: "review_dispute",
                column: "review_case_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "review_dispute",
                schema: "review");

            migrationBuilder.DropIndex(
                name: "ux_review_case_open",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "dispute_refund_pct",
                schema: "review",
                table: "review_case");

            migrationBuilder.CreateIndex(
                name: "ux_review_case_open",
                schema: "review",
                table: "review_case",
                columns: new[] { "source_version_id", "expert_profile_id" },
                unique: true,
                filter: "status IN ('AWAITING_PAYMENT', 'PENDING_EXPERT_RESPONSE', 'IN_REVIEW', 'AWAITING_USER_INFORMATION', 'AWAITING_ACCEPTANCE')");
        }
    }
}
