using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReviewClaim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "claimed_at",
                schema: "expert",
                table: "expert_service_qualification",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "claimed_by_user_id",
                schema: "expert",
                table: "expert_service_qualification",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "claimed_at",
                schema: "expert",
                table: "expert_application",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "claimed_by_user_id",
                schema: "expert",
                table: "expert_application",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "known_reviewer",
                schema: "expert",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    last_seen_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_known_reviewer", x => x.user_id);
                });

            migrationBuilder.CreateTable(
                name: "review_claim_event",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    gate = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    review_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    holder_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    previous_holder_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_claim_event", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_expert_service_qualification_claimed_by",
                schema: "expert",
                table: "expert_service_qualification",
                column: "claimed_by_user_id",
                filter: "claimed_by_user_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_expert_application_claimed_by",
                schema: "expert",
                table: "expert_application",
                column: "claimed_by_user_id",
                filter: "claimed_by_user_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_review_claim_event_review",
                schema: "expert",
                table: "review_claim_event",
                columns: new[] { "gate", "review_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "known_reviewer",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "review_claim_event",
                schema: "expert");

            migrationBuilder.DropIndex(
                name: "ix_expert_service_qualification_claimed_by",
                schema: "expert",
                table: "expert_service_qualification");

            migrationBuilder.DropIndex(
                name: "ix_expert_application_claimed_by",
                schema: "expert",
                table: "expert_application");

            migrationBuilder.DropColumn(
                name: "claimed_at",
                schema: "expert",
                table: "expert_service_qualification");

            migrationBuilder.DropColumn(
                name: "claimed_by_user_id",
                schema: "expert",
                table: "expert_service_qualification");

            migrationBuilder.DropColumn(
                name: "claimed_at",
                schema: "expert",
                table: "expert_application");

            migrationBuilder.DropColumn(
                name: "claimed_by_user_id",
                schema: "expert",
                table: "expert_application");
        }
    }
}
