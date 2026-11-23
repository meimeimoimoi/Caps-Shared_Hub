using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace auth.Migrations
{
    /// <inheritdoc />
    public partial class ExpertApplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "birth_date",
                schema: "identity",
                table: "expert_profile",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "company",
                schema: "identity",
                table: "expert_profile",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "fields",
                schema: "identity",
                table: "expert_profile",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            migrationBuilder.AddColumn<string>(
                name: "highlights",
                schema: "identity",
                table: "expert_profile",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "location",
                schema: "identity",
                table: "expert_profile",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "title",
                schema: "identity",
                table: "expert_profile",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "application_id",
                schema: "identity",
                table: "expert_evidence",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "content_type",
                schema: "identity",
                table: "expert_evidence",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "file_name",
                schema: "identity",
                table: "expert_evidence",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "size_bytes",
                schema: "identity",
                table: "expert_evidence",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "expert_application",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "DRAFT"),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    decision_note = table.Column<string>(type: "text", nullable: true),
                    previous_application_id = table.Column<Guid>(type: "uuid", nullable: true),
                    earliest_reapply_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_application", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_application_previous",
                        column: x => x.previous_application_id,
                        principalSchema: "identity",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expert_application_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "identity",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expert_application_event",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<string>(type: "text", nullable: true),
                    to_status = table.Column<string>(type: "text", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_application_event", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_application_event_actor",
                        column: x => x.actor_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expert_application_event_application",
                        column: x => x.application_id,
                        principalSchema: "identity",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_expert_evidence_application",
                schema: "identity",
                table: "expert_evidence",
                column: "application_id");

            migrationBuilder.CreateIndex(
                name: "IX_expert_application_previous_application_id",
                schema: "identity",
                table: "expert_application",
                column: "previous_application_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_application_queue",
                schema: "identity",
                table: "expert_application",
                columns: new[] { "status", "submitted_at" });

            migrationBuilder.CreateIndex(
                name: "ux_expert_application_open",
                schema: "identity",
                table: "expert_application",
                column: "expert_profile_id",
                unique: true,
                filter: "status NOT IN ('NOT_ELIGIBLE', 'REJECTED', 'APPROVED')");

            migrationBuilder.CreateIndex(
                name: "ix_expert_application_event",
                schema: "identity",
                table: "expert_application_event",
                columns: new[] { "application_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_expert_application_event_actor_user_id",
                schema: "identity",
                table: "expert_application_event",
                column: "actor_user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_expert_evidence_application",
                schema: "identity",
                table: "expert_evidence",
                column: "application_id",
                principalSchema: "identity",
                principalTable: "expert_application",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_expert_evidence_application",
                schema: "identity",
                table: "expert_evidence");

            migrationBuilder.DropTable(
                name: "expert_application_event",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "expert_application",
                schema: "identity");

            migrationBuilder.DropIndex(
                name: "ix_expert_evidence_application",
                schema: "identity",
                table: "expert_evidence");

            migrationBuilder.DropColumn(
                name: "birth_date",
                schema: "identity",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "company",
                schema: "identity",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "fields",
                schema: "identity",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "highlights",
                schema: "identity",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "location",
                schema: "identity",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "title",
                schema: "identity",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "application_id",
                schema: "identity",
                table: "expert_evidence");

            migrationBuilder.DropColumn(
                name: "content_type",
                schema: "identity",
                table: "expert_evidence");

            migrationBuilder.DropColumn(
                name: "file_name",
                schema: "identity",
                table: "expert_evidence");

            migrationBuilder.DropColumn(
                name: "size_bytes",
                schema: "identity",
                table: "expert_evidence");
        }
    }
}
