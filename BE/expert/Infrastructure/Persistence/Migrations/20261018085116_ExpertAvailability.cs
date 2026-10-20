using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "accepting_requests",
                schema: "expert",
                table: "expert_service_qualification",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "account_status",
                schema: "expert",
                table: "expert_profile",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            // Submitting an application requires a verified email, so submitted applicants are ACTIVE;
            // later changes arrive through AccountStatusChangedEvent
            migrationBuilder.Sql(
                """
                UPDATE expert.expert_profile p SET account_status = 'ACTIVE'
                WHERE EXISTS (
                    SELECT 1 FROM expert.expert_application a
                    WHERE a.expert_profile_id = p.id AND a.submitted_at IS NOT NULL
                );
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "accepting_requests",
                schema: "expert",
                table: "expert_service_qualification");

            migrationBuilder.DropColumn(
                name: "account_status",
                schema: "expert",
                table: "expert_profile");
        }
    }
}
