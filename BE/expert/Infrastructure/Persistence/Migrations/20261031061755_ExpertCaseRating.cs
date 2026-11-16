using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertCaseRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "expert_case_rating",
                schema: "expert",
                columns: table => new
                {
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stars = table.Column<short>(type: "smallint", nullable: false),
                    rated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_case_rating", x => x.review_case_id);
                    table.ForeignKey(
                        name: "fk_expert_case_rating_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_expert_case_rating_profile",
                schema: "expert",
                table: "expert_case_rating",
                column: "expert_profile_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "expert_case_rating",
                schema: "expert");
        }
    }
}
