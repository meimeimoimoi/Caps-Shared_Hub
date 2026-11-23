using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AdvisorLateRates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "expert",
                table: "platform_fee",
                columns: new[] { "id", "cancelled_at", "cancelled_by", "effective_from", "late_cancel_hours", "late_penalty_hours", "late_penalty_percent", "no_delivery_refund_percent", "no_response_days", "no_response_expert_percent", "no_response_refund_percent", "percent", "reason", "service_code", "set_by" },
                values: new object[] { new Guid("01929e3a-0000-7000-8000-000000000060"), null, null, new DateTimeOffset(new DateTime(2026, 11, 21, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 7, 0, 0, 0)), 24, 24, 20, 100, 3, 60, 0, 40, "Theo đề xuất của thầy Thức ngày 20/11/2026: giao trễ trong 24 giờ hoàn khách 20% từ phần của nền tảng (khách 20%, nền tảng 20%, chuyên gia 60%); quá 24 giờ chưa bàn giao hoàn khách 100%.", "HUMAN_VERIFICATION", new Guid("00000000-0000-0000-0000-000000000000") });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000060"));
        }
    }
}
