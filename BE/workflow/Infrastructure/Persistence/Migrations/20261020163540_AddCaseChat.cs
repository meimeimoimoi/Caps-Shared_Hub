using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCaseChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "expert_user_id",
                schema: "review",
                table: "review_case",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "case_message",
                schema: "review",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender_role = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_case_message", x => x.id);
                    table.ForeignKey(
                        name: "fk_case_message_55",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "case_read_marker",
                schema: "review",
                columns: table => new
                {
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    last_read_message_id = table.Column<Guid>(type: "uuid", nullable: false),
                    last_read_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_case_read_marker", x => new { x.review_case_id, x.user_id });
                    table.ForeignKey(
                        name: "fk_case_read_marker_56",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_review_case_7",
                schema: "review",
                table: "review_case",
                columns: new[] { "expert_user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_case_message_2",
                schema: "review",
                table: "case_message",
                columns: new[] { "review_case_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "case_message",
                schema: "review");

            migrationBuilder.DropTable(
                name: "case_read_marker",
                schema: "review");

            migrationBuilder.DropIndex(
                name: "ix_review_case_7",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "expert_user_id",
                schema: "review",
                table: "review_case");
        }
    }
}
