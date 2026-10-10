using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace workflow.Migrations
{
    /// <inheritdoc />
    public partial class InitialWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "workspace");

            migrationBuilder.EnsureSchema(
                name: "review");

            migrationBuilder.CreateTable(
                name: "ai_quota",
                schema: "workspace",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    balance = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_quota", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_ai_quota_28",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "conversation",
                schema: "workspace",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conversation", x => x.id);
                    table.ForeignKey(
                        name: "fk_conversation_26",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "template",
                schema: "workspace",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_template", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "chat_message",
                schema: "workspace",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    conversation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender = table.Column<string>(type: "text", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    period_start = table.Column<DateOnly>(type: "date", nullable: true),
                    period_end = table.Column<DateOnly>(type: "date", nullable: true),
                    scope_result = table.Column<string>(type: "text", nullable: true),
                    answer_status = table.Column<string>(type: "text", nullable: true),
                    citations = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_message", x => x.id);
                    table.ForeignKey(
                        name: "fk_chat_message_27",
                        column: x => x.conversation_id,
                        principalSchema: "workspace",
                        principalTable: "conversation",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "template_version",
                schema: "workspace",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    template_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_no = table.Column<int>(type: "integer", nullable: false),
                    field_schema = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "DRAFT"),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_template_version", x => x.id);
                    table.ForeignKey(
                        name: "fk_template_version_24",
                        column: x => x.template_id,
                        principalSchema: "workspace",
                        principalTable: "template",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_template_version_25",
                        column: x => x.created_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_usage",
                schema: "workspace",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    conversation_id = table.Column<Guid>(type: "uuid", nullable: true),
                    question_id = table.Column<Guid>(type: "uuid", nullable: true),
                    paid_with = table.Column<string>(type: "text", nullable: false),
                    credit_hold = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    state = table.Column<string>(type: "text", nullable: false, defaultValue: "RESERVED"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_usage", x => x.id);
                    table.ForeignKey(
                        name: "fk_ai_usage_29",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_ai_usage_30",
                        column: x => x.conversation_id,
                        principalSchema: "workspace",
                        principalTable: "conversation",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_ai_usage_31",
                        column: x => x.question_id,
                        principalSchema: "workspace",
                        principalTable: "chat_message",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "document",
                schema: "workspace",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false, defaultValue: "TEMPLATE"),
                    template_id = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "text", nullable: false),
                    period_start = table.Column<DateOnly>(type: "date", nullable: false),
                    period_end = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "DRAFT"),
                    verified_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document", x => x.id);
                    table.ForeignKey(
                        name: "fk_document_32",
                        column: x => x.owner_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_document_33",
                        column: x => x.template_id,
                        principalSchema: "workspace",
                        principalTable: "template",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "input_snapshot",
                schema: "workspace",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_no = table.Column<int>(type: "integer", nullable: false),
                    data = table.Column<string>(type: "jsonb", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_input_snapshot", x => x.id);
                    table.UniqueConstraint("AK_input_snapshot_document_id_id", x => new { x.document_id, x.id });
                    table.ForeignKey(
                        name: "fk_input_snapshot_34",
                        column: x => x.document_id,
                        principalSchema: "workspace",
                        principalTable: "document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_input_snapshot_35",
                        column: x => x.created_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "document_version",
                schema: "workspace",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_no = table.Column<int>(type: "integer", nullable: false),
                    version_type = table.Column<string>(type: "text", nullable: false),
                    input_snapshot_id = table.Column<Guid>(type: "uuid", nullable: true),
                    template_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    citations = table.Column<string>(type: "jsonb", nullable: true),
                    draft_assessment = table.Column<string>(type: "text", nullable: true),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: true),
                    file_url = table.Column<string>(type: "text", nullable: true),
                    content = table.Column<string>(type: "jsonb", nullable: false),
                    content_hash = table.Column<string>(type: "text", nullable: false),
                    is_immutable = table.Column<bool>(type: "boolean", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_version", x => x.id);
                    table.UniqueConstraint("AK_document_version_document_id_id", x => new { x.document_id, x.id });
                    table.ForeignKey(
                        name: "fk_document_version_36",
                        column: x => x.document_id,
                        principalSchema: "workspace",
                        principalTable: "document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_document_version_37",
                        column: x => x.created_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_document_version_38",
                        column: x => x.template_version_id,
                        principalSchema: "workspace",
                        principalTable: "template_version",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_document_version_39",
                        columns: x => new { x.document_id, x.input_snapshot_id },
                        principalSchema: "workspace",
                        principalTable: "input_snapshot",
                        principalColumns: new[] { "document_id", "id" });
                });

            migrationBuilder.CreateTable(
                name: "review_case",
                schema: "review",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requester_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    slot_id = table.Column<Guid>(type: "uuid", nullable: true),
                    service_offering_id = table.Column<Guid>(type: "uuid", nullable: true),
                    fee = table.Column<long>(type: "bigint", nullable: false),
                    platform_fee_pct = table.Column<short>(type: "smallint", nullable: false),
                    problem_description = table.Column<string>(type: "text", nullable: false),
                    expected_outcome = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING_EXPERT_RESPONSE"),
                    result = table.Column<string>(type: "text", nullable: true),
                    cannot_verify_reason = table.Column<string>(type: "text", nullable: true),
                    review_summary = table.Column<string>(type: "text", nullable: true),
                    decline_reason = table.Column<string>(type: "text", nullable: true),
                    termination_reason = table.Column<string>(type: "text", nullable: true),
                    response_deadline = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    payment_deadline = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    paid_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    start_deadline = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    delivery_deadline = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    delivered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    acceptance_deadline = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_case", x => x.id);
                    table.UniqueConstraint("AK_review_case_document_id_id", x => new { x.document_id, x.id });
                    table.ForeignKey(
                        name: "fk_review_case_42",
                        column: x => x.document_id,
                        principalSchema: "workspace",
                        principalTable: "document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_review_case_43",
                        column: x => x.requester_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_review_case_44",
                        column: x => x.expert_profile_id,
                        principalSchema: "identity",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_review_case_45",
                        column: x => x.slot_id,
                        principalSchema: "identity",
                        principalTable: "availability_slot",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_review_case_46",
                        column: x => x.service_offering_id,
                        principalSchema: "identity",
                        principalTable: "service_offering",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_review_case_47",
                        columns: x => new { x.document_id, x.source_version_id },
                        principalSchema: "workspace",
                        principalTable: "document_version",
                        principalColumns: new[] { "document_id", "id" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "info_request",
                schema: "review",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_by = table.Column<Guid>(type: "uuid", nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    due_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    response_message = table.Column<string>(type: "text", nullable: true),
                    responded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "OPEN"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_info_request", x => x.id);
                    table.UniqueConstraint("AK_info_request_review_case_id_id", x => new { x.review_case_id, x.id });
                    table.ForeignKey(
                        name: "fk_info_request_49",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_info_request_50",
                        column: x => x.requested_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "review_status_history",
                schema: "review",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<string>(type: "text", nullable: true),
                    to_status = table.Column<string>(type: "text", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_status_history", x => x.id);
                    table.ForeignKey(
                        name: "fk_review_status_history_54",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_review_status_history_55",
                        column: x => x.actor_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "review_task",
                schema: "review",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    task_code = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING"),
                    note = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_task", x => x.id);
                    table.ForeignKey(
                        name: "fk_review_task_48",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "review_attachment",
                schema: "review",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    info_request_id = table.Column<Guid>(type: "uuid", nullable: true),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    file_name = table.Column<string>(type: "text", nullable: false),
                    uploaded_by = table.Column<Guid>(type: "uuid", nullable: false),
                    uploaded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_attachment", x => x.id);
                    table.ForeignKey(
                        name: "fk_review_attachment_51",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_review_attachment_52",
                        column: x => x.uploaded_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_review_attachment_53",
                        columns: x => new { x.review_case_id, x.info_request_id },
                        principalSchema: "review",
                        principalTable: "info_request",
                        principalColumns: new[] { "review_case_id", "id" });
                });

            migrationBuilder.CreateIndex(
                name: "ix_ai_usage_2",
                schema: "workspace",
                table: "ai_usage",
                columns: new[] { "user_id", "state" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_usage_conversation_id",
                schema: "workspace",
                table: "ai_usage",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "IX_ai_usage_question_id",
                schema: "workspace",
                table: "ai_usage",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_message_2",
                schema: "workspace",
                table: "chat_message",
                columns: new[] { "conversation_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_conversation_2",
                schema: "workspace",
                table: "conversation",
                columns: new[] { "user_id", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "ix_document_2",
                schema: "workspace",
                table: "document",
                columns: new[] { "owner_user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_document_id_verified_version_id",
                schema: "workspace",
                table: "document",
                columns: new[] { "id", "verified_version_id" });

            migrationBuilder.CreateIndex(
                name: "IX_document_template_id",
                schema: "workspace",
                table: "document",
                column: "template_id");

            migrationBuilder.CreateIndex(
                name: "ix_document_version_6",
                schema: "workspace",
                table: "document_version",
                column: "review_case_id");

            migrationBuilder.CreateIndex(
                name: "IX_document_version_created_by",
                schema: "workspace",
                table: "document_version",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_document_version_document_id_input_snapshot_id",
                schema: "workspace",
                table: "document_version",
                columns: new[] { "document_id", "input_snapshot_id" });

            migrationBuilder.CreateIndex(
                name: "IX_document_version_document_id_review_case_id",
                schema: "workspace",
                table: "document_version",
                columns: new[] { "document_id", "review_case_id" });

            migrationBuilder.CreateIndex(
                name: "IX_document_version_document_id_version_no",
                schema: "workspace",
                table: "document_version",
                columns: new[] { "document_id", "version_no" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_document_version_template_version_id",
                schema: "workspace",
                table: "document_version",
                column: "template_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_info_request_2",
                schema: "review",
                table: "info_request",
                columns: new[] { "review_case_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_info_request_requested_by",
                schema: "review",
                table: "info_request",
                column: "requested_by");

            migrationBuilder.CreateIndex(
                name: "IX_input_snapshot_created_by",
                schema: "workspace",
                table: "input_snapshot",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_input_snapshot_document_id_version_no",
                schema: "workspace",
                table: "input_snapshot",
                columns: new[] { "document_id", "version_no" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_review_attachment_2",
                schema: "review",
                table: "review_attachment",
                column: "review_case_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_attachment_review_case_id_info_request_id",
                schema: "review",
                table: "review_attachment",
                columns: new[] { "review_case_id", "info_request_id" });

            migrationBuilder.CreateIndex(
                name: "IX_review_attachment_uploaded_by",
                schema: "review",
                table: "review_attachment",
                column: "uploaded_by");

            migrationBuilder.CreateIndex(
                name: "ix_review_case_4",
                schema: "review",
                table: "review_case",
                columns: new[] { "expert_profile_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_review_case_6",
                schema: "review",
                table: "review_case",
                columns: new[] { "requester_user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_review_case_document_id_source_version_id",
                schema: "review",
                table: "review_case",
                columns: new[] { "document_id", "source_version_id" });

            migrationBuilder.CreateIndex(
                name: "IX_review_case_service_offering_id",
                schema: "review",
                table: "review_case",
                column: "service_offering_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_case_slot_id",
                schema: "review",
                table: "review_case",
                column: "slot_id");

            migrationBuilder.CreateIndex(
                name: "ix_review_status_history_2",
                schema: "review",
                table: "review_status_history",
                columns: new[] { "review_case_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_review_status_history_actor_user_id",
                schema: "review",
                table: "review_status_history",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_task_review_case_id_task_code",
                schema: "review",
                table: "review_task",
                columns: new[] { "review_case_id", "task_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_template_code",
                schema: "workspace",
                table: "template",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_template_version_created_by",
                schema: "workspace",
                table: "template_version",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_template_version_template_id_version_no",
                schema: "workspace",
                table: "template_version",
                columns: new[] { "template_id", "version_no" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_document_40",
                schema: "workspace",
                table: "document",
                columns: new[] { "id", "verified_version_id" },
                principalSchema: "workspace",
                principalTable: "document_version",
                principalColumns: new[] { "document_id", "id" });

            migrationBuilder.AddForeignKey(
                name: "fk_document_version_41",
                schema: "workspace",
                table: "document_version",
                columns: new[] { "document_id", "review_case_id" },
                principalSchema: "review",
                principalTable: "review_case",
                principalColumns: new[] { "document_id", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_document_33",
                schema: "workspace",
                table: "document");

            migrationBuilder.DropForeignKey(
                name: "fk_template_version_24",
                schema: "workspace",
                table: "template_version");

            migrationBuilder.DropForeignKey(
                name: "fk_document_40",
                schema: "workspace",
                table: "document");

            migrationBuilder.DropForeignKey(
                name: "fk_review_case_47",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropTable(
                name: "ai_quota",
                schema: "workspace");

            migrationBuilder.DropTable(
                name: "ai_usage",
                schema: "workspace");

            migrationBuilder.DropTable(
                name: "review_attachment",
                schema: "review");

            migrationBuilder.DropTable(
                name: "review_status_history",
                schema: "review");

            migrationBuilder.DropTable(
                name: "review_task",
                schema: "review");

            migrationBuilder.DropTable(
                name: "chat_message",
                schema: "workspace");

            migrationBuilder.DropTable(
                name: "info_request",
                schema: "review");

            migrationBuilder.DropTable(
                name: "conversation",
                schema: "workspace");

            migrationBuilder.DropTable(
                name: "template",
                schema: "workspace");

            migrationBuilder.DropTable(
                name: "document_version",
                schema: "workspace");

            migrationBuilder.DropTable(
                name: "template_version",
                schema: "workspace");

            migrationBuilder.DropTable(
                name: "input_snapshot",
                schema: "workspace");

            migrationBuilder.DropTable(
                name: "review_case",
                schema: "review");

            migrationBuilder.DropTable(
                name: "document",
                schema: "workspace");
        }
    }
}
