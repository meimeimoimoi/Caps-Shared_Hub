BEGIN;
SET LOCAL search_path = public, pg_catalog;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

-- 1. Kiểu dữ liệu (không suy đoán tập enum còn thiếu)

CREATE DOMAIN ai_usage_paid_with AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN ai_usage_state AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN availability_slot_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN bank_account_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN chat_message_answer_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN chat_message_scope_result AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN chat_message_sender AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN crawl_job_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN crawl_job_trigger_type AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN credit_ledger_entry_type AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN dispute_outcome AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN dispute_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN document_source AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN document_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN document_version_draft_assessment AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN document_version_version_type AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN escrow_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN event_outbox_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN expert_competency_assessment_decision AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN expert_evidence_evidence_type AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN expert_evidence_screening_flag AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN expert_profile_service_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN expert_profile_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN info_request_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN knowledge_document_source AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN knowledge_document_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN legal_amendment_relation_type AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN legal_source_doc_type AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN notification_channel AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN payment_transaction_purpose AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN payment_transaction_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN payout_transaction_payout_type AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN payout_transaction_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN review_case_result AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN review_case_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN review_case_termination_reason AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN review_task_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN review_task_task_code AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE TYPE roles_code AS ENUM ('USER','EXPERT','SYSTEM_ADMIN','KNOWLEDGE_ADMIN');
CREATE DOMAIN settlement_reason AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN template_version_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN users_status AS text; -- TODO: thiếu khai báo Enum trong nguồn.
CREATE DOMAIN verification_token_purpose AS text; -- TODO: thiếu khai báo Enum trong nguồn.

-- 2. Toàn bộ 46 bảng; tạo trước FK để giải quyết tham chiếu vòng.

CREATE TABLE roles (
    id uuid PRIMARY KEY,
    code roles_code NOT NULL UNIQUE,
    name text NOT NULL
);

CREATE TABLE users (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    phone text,
    status users_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE permission (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    description text
);

CREATE TABLE role_permission (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE auth_refresh_token (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    token_hash text NOT NULL UNIQUE,
    user_agent text,
    ip_address inet,
    issued_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    rotated_from uuid
);

CREATE TABLE verification_token (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    purpose verification_token_purpose NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    invalidated_at timestamptz,
    attempt_count int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business_profile (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    company_name text NOT NULL,
    tax_code text NOT NULL,
    address text,
    representative text,
    contact_email text,
    contact_phone text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expert_profile (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    years_experience int,
    bio text,
    status expert_profile_status NOT NULL DEFAULT 'SCREENING',
    service_status expert_profile_service_status NOT NULL DEFAULT 'INACTIVE',
    eligibility_note text,
    turnaround_hours int,
    rating_avg numeric(3,2) NOT NULL DEFAULT 0,
    rating_count int NOT NULL DEFAULT 0,
    approved_by uuid,
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expert_evidence (
    id uuid PRIMARY KEY,
    expert_profile_id uuid NOT NULL,
    evidence_type expert_evidence_evidence_type NOT NULL,
    file_url text NOT NULL,
    parsed_meta jsonb,
    screening_flag expert_evidence_screening_flag,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expert_competency_assessment (
    id uuid PRIMARY KEY,
    expert_profile_id uuid NOT NULL,
    assessor_user_id uuid NOT NULL,
    c1_score smallint NOT NULL,
    c2_score smallint NOT NULL,
    c3_score smallint NOT NULL,
    c4_score smallint NOT NULL,
    c5_score smallint NOT NULL,
    rationale text NOT NULL,
    decision expert_competency_assessment_decision NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_offering (
    id uuid PRIMARY KEY,
    expert_profile_id uuid NOT NULL,
    service_type text NOT NULL,
    fee bigint NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE availability_slot (
    id uuid PRIMARY KEY,
    expert_profile_id uuid NOT NULL,
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL,
    status availability_slot_status NOT NULL DEFAULT 'OPEN',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE legal_source (
    id uuid PRIMARY KEY,
    document_number text NOT NULL UNIQUE,
    doc_type legal_source_doc_type NOT NULL,
    issuing_authority text,
    title text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE legal_amendment (
    amending_source_id uuid NOT NULL,
    amended_source_id uuid NOT NULL,
    relation_type legal_amendment_relation_type NOT NULL DEFAULT 'AMENDS',
    affected_articles jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (amending_source_id, amended_source_id)
);

CREATE TABLE knowledge_document (
    id uuid PRIMARY KEY,
    legal_source_id uuid NOT NULL,
    version_no int NOT NULL,
    source knowledge_document_source NOT NULL,
    crawl_job_id uuid,
    uploaded_by uuid,
    file_url text NOT NULL,
    file_hash text NOT NULL UNIQUE,
    content_json jsonb,
    issued_date date,
    effective_from date,
    effective_to date,
    status knowledge_document_status NOT NULL DEFAULT 'PENDING',
    rejection_reason text,
    approved_by uuid,
    approved_at timestamptz,
    indexed_at timestamptz,
    retry_count int NOT NULL DEFAULT 0,
    last_error text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (legal_source_id, version_no)
);

CREATE TABLE kb_chunk (
    id uuid PRIMARY KEY,
    knowledge_document_id uuid NOT NULL,
    chunk_index int NOT NULL,
    qdrant_point_id text NOT NULL UNIQUE,
    article text,
    clause text,
    "point" text,
    page int,
    effective_from date,
    effective_to date,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (knowledge_document_id, chunk_index)
);

CREATE TABLE crawl_job (
    id uuid PRIMARY KEY,
    trigger_type crawl_job_trigger_type NOT NULL,
    triggered_by uuid,
    status crawl_job_status NOT NULL DEFAULT 'RUNNING',
    docs_found int NOT NULL DEFAULT 0,
    detail jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);

CREATE TABLE template (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE template_version (
    id uuid PRIMARY KEY,
    template_id uuid NOT NULL,
    version_no int NOT NULL,
    field_schema jsonb NOT NULL,
    status template_version_status NOT NULL DEFAULT 'DRAFT',
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (template_id, version_no)
);

CREATE TABLE conversation (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    title text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_message (
    id uuid PRIMARY KEY,
    conversation_id uuid NOT NULL,
    sender chat_message_sender NOT NULL,
    content text NOT NULL,
    period_start date,
    period_end date,
    scope_result chat_message_scope_result,
    answer_status chat_message_answer_status,
    citations jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_quota (
    user_id uuid PRIMARY KEY,
    balance int NOT NULL DEFAULT 10,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_usage (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    conversation_id uuid,
    question_id uuid,
    paid_with ai_usage_paid_with NOT NULL,
    credit_hold bigint NOT NULL DEFAULT 0,
    state ai_usage_state NOT NULL DEFAULT 'RESERVED',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE document (
    id uuid PRIMARY KEY,
    owner_user_id uuid NOT NULL,
    source document_source NOT NULL DEFAULT 'TEMPLATE',
    template_id uuid,
    title text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status document_status NOT NULL DEFAULT 'DRAFT',
    verified_version_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE input_snapshot (
    id uuid PRIMARY KEY,
    document_id uuid NOT NULL,
    version_no int NOT NULL,
    data jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_no),
    UNIQUE (document_id, id)
);

CREATE TABLE document_version (
    id uuid PRIMARY KEY,
    document_id uuid NOT NULL,
    version_no int NOT NULL,
    version_type document_version_version_type NOT NULL,
    input_snapshot_id uuid,
    template_version_id uuid,
    citations jsonb,
    draft_assessment document_version_draft_assessment,
    review_case_id uuid,
    file_url text,
    content jsonb NOT NULL,
    content_hash text NOT NULL,
    is_immutable boolean NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_no),
    UNIQUE (document_id, id)
);

CREATE TABLE review_case (
    id uuid PRIMARY KEY,
    document_id uuid NOT NULL,
    source_version_id uuid NOT NULL,
    requester_user_id uuid NOT NULL,
    expert_profile_id uuid NOT NULL,
    slot_id uuid,
    service_offering_id uuid,
    fee bigint NOT NULL,
    platform_fee_pct smallint NOT NULL,
    problem_description text NOT NULL,
    expected_outcome text,
    status review_case_status NOT NULL DEFAULT 'PENDING_EXPERT_RESPONSE',
    result review_case_result,
    cannot_verify_reason text,
    review_summary text,
    decline_reason text,
    termination_reason review_case_termination_reason,
    response_deadline timestamptz NOT NULL,
    accepted_at timestamptz,
    payment_deadline timestamptz,
    paid_at timestamptz,
    start_deadline timestamptz,
    started_at timestamptz,
    delivery_deadline timestamptz,
    delivered_at timestamptz,
    acceptance_deadline timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_id, id)
);

CREATE TABLE review_task (
    id uuid PRIMARY KEY,
    review_case_id uuid NOT NULL,
    task_code review_task_task_code NOT NULL,
    status review_task_status NOT NULL DEFAULT 'PENDING',
    "note" text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (review_case_id, task_code)
);

CREATE TABLE info_request (
    id uuid PRIMARY KEY,
    review_case_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    message text NOT NULL,
    due_at timestamptz NOT NULL,
    response_message text,
    responded_at timestamptz,
    status info_request_status NOT NULL DEFAULT 'OPEN',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (review_case_id, id)
);

CREATE TABLE review_attachment (
    id uuid PRIMARY KEY,
    review_case_id uuid NOT NULL,
    info_request_id uuid,
    file_url text NOT NULL,
    file_name text NOT NULL,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE review_status_history (
    id uuid PRIMARY KEY,
    review_case_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    actor_user_id uuid,
    "note" text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE escrow (
    id uuid PRIMARY KEY,
    review_case_id uuid NOT NULL UNIQUE,
    amount bigint NOT NULL,
    status escrow_status NOT NULL DEFAULT 'HELD',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settlement (
    id uuid PRIMARY KEY,
    review_case_id uuid NOT NULL UNIQUE,
    reason settlement_reason NOT NULL,
    user_refund_amount bigint NOT NULL DEFAULT 0,
    expert_payout_amount bigint NOT NULL DEFAULT 0,
    platform_fee_amount bigint NOT NULL DEFAULT 0,
    settled_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bank_account (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    bank_bin text NOT NULL,
    bank_name text NOT NULL,
    account_number_enc text NOT NULL,
    account_number_hash text NOT NULL,
    account_last4 text NOT NULL,
    account_holder_name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    status bank_account_status NOT NULL DEFAULT 'UNVERIFIED',
    rejection_reason text,
    verified_by uuid,
    verified_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payout_transaction (
    id uuid PRIMARY KEY,
    settlement_id uuid NOT NULL,
    payout_type payout_transaction_payout_type NOT NULL,
    recipient_user_id uuid NOT NULL,
    amount bigint NOT NULL,
    bank_account_id uuid,
    snap_bank_bin text,
    snap_bank_name text,
    snap_account_last4 text,
    snap_holder_name text,
    provider text NOT NULL DEFAULT 'PAYOS',
    provider_ref text UNIQUE,
    status payout_transaction_status NOT NULL DEFAULT 'PENDING',
    attempt_count int NOT NULL DEFAULT 0,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE (settlement_id, payout_type)
);

CREATE TABLE dispute (
    id uuid PRIMARY KEY,
    review_case_id uuid NOT NULL UNIQUE,
    raised_by uuid NOT NULL,
    grounds text NOT NULL,
    evidence jsonb,
    arbiter_user_id uuid,
    sla_due_at timestamptz NOT NULL,
    outcome dispute_outcome,
    resolution_note text,
    status dispute_status NOT NULL DEFAULT 'OPEN',
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

CREATE TABLE payment_transaction (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    review_case_id uuid,
    purpose payment_transaction_purpose NOT NULL,
    amount bigint NOT NULL,
    provider text NOT NULL DEFAULT 'PAYOS',
    order_code text NOT NULL UNIQUE,
    status payment_transaction_status NOT NULL DEFAULT 'PENDING',
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credit_wallet (
    user_id uuid PRIMARY KEY,
    balance bigint NOT NULL DEFAULT 0,
    held bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credit_ledger (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    entry_type credit_ledger_entry_type NOT NULL,
    amount bigint NOT NULL,
    balance_after bigint NOT NULL,
    idempotency_key text NOT NULL UNIQUE,
    ref_payment_id uuid,
    ref_ai_usage_id uuid,
    ref_document_version_id uuid,
    "note" text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    channel notification_channel NOT NULL,
    event_type text NOT NULL,
    payload jsonb,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rating (
    id uuid PRIMARY KEY,
    review_case_id uuid NOT NULL UNIQUE,
    rater_user_id uuid NOT NULL,
    expert_profile_id uuid NOT NULL,
    score int NOT NULL,
    comment text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE document_status_history (
    id uuid PRIMARY KEY,
    document_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    actor_user_id uuid,
    "note" text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id uuid PRIMARY KEY,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    actor_user_id uuid,
    detail jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_outbox (
    id uuid PRIMARY KEY,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status event_outbox_status NOT NULL DEFAULT 'PENDING',
    retry_count int NOT NULL DEFAULT 0,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);

CREATE TABLE system_config (
    "key" text PRIMARY KEY,
    "value" jsonb NOT NULL,
    description text,
    updated_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Toàn bộ 80 quan hệ (giữ ON DELETE; mặc định NO ACTION).
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_2 FOREIGN KEY (role_id) REFERENCES roles (id);
ALTER TABLE role_permission ADD CONSTRAINT fk_role_permission_3 FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
ALTER TABLE role_permission ADD CONSTRAINT fk_role_permission_4 FOREIGN KEY (permission_id) REFERENCES permission (id) ON DELETE CASCADE;
ALTER TABLE auth_refresh_token ADD CONSTRAINT fk_auth_refresh_token_5 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE auth_refresh_token ADD CONSTRAINT fk_auth_refresh_token_6 FOREIGN KEY (rotated_from) REFERENCES auth_refresh_token (id);
ALTER TABLE verification_token ADD CONSTRAINT fk_verification_token_7 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE business_profile ADD CONSTRAINT fk_business_profile_8 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE expert_profile ADD CONSTRAINT fk_expert_profile_9 FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE expert_profile ADD CONSTRAINT fk_expert_profile_10 FOREIGN KEY (approved_by) REFERENCES users (id);
ALTER TABLE expert_evidence ADD CONSTRAINT fk_expert_evidence_11 FOREIGN KEY (expert_profile_id) REFERENCES expert_profile (id);
ALTER TABLE expert_competency_assessment ADD CONSTRAINT fk_expert_competency_assessment_12 FOREIGN KEY (expert_profile_id) REFERENCES expert_profile (id);
ALTER TABLE expert_competency_assessment ADD CONSTRAINT fk_expert_competency_assessment_13 FOREIGN KEY (assessor_user_id) REFERENCES users (id);
ALTER TABLE service_offering ADD CONSTRAINT fk_service_offering_14 FOREIGN KEY (expert_profile_id) REFERENCES expert_profile (id);
ALTER TABLE availability_slot ADD CONSTRAINT fk_availability_slot_15 FOREIGN KEY (expert_profile_id) REFERENCES expert_profile (id);
ALTER TABLE legal_amendment ADD CONSTRAINT fk_legal_amendment_16 FOREIGN KEY (amending_source_id) REFERENCES legal_source (id);
ALTER TABLE legal_amendment ADD CONSTRAINT fk_legal_amendment_17 FOREIGN KEY (amended_source_id) REFERENCES legal_source (id);
ALTER TABLE knowledge_document ADD CONSTRAINT fk_knowledge_document_18 FOREIGN KEY (legal_source_id) REFERENCES legal_source (id);
ALTER TABLE knowledge_document ADD CONSTRAINT fk_knowledge_document_19 FOREIGN KEY (crawl_job_id) REFERENCES crawl_job (id);
ALTER TABLE knowledge_document ADD CONSTRAINT fk_knowledge_document_20 FOREIGN KEY (uploaded_by) REFERENCES users (id);
ALTER TABLE knowledge_document ADD CONSTRAINT fk_knowledge_document_21 FOREIGN KEY (approved_by) REFERENCES users (id);
ALTER TABLE kb_chunk ADD CONSTRAINT fk_kb_chunk_22 FOREIGN KEY (knowledge_document_id) REFERENCES knowledge_document (id) ON DELETE CASCADE;
ALTER TABLE crawl_job ADD CONSTRAINT fk_crawl_job_23 FOREIGN KEY (triggered_by) REFERENCES users (id);
ALTER TABLE template_version ADD CONSTRAINT fk_template_version_24 FOREIGN KEY (template_id) REFERENCES template (id);
ALTER TABLE template_version ADD CONSTRAINT fk_template_version_25 FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE conversation ADD CONSTRAINT fk_conversation_26 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE chat_message ADD CONSTRAINT fk_chat_message_27 FOREIGN KEY (conversation_id) REFERENCES conversation (id) ON DELETE CASCADE;
ALTER TABLE ai_quota ADD CONSTRAINT fk_ai_quota_28 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE ai_usage ADD CONSTRAINT fk_ai_usage_29 FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE ai_usage ADD CONSTRAINT fk_ai_usage_30 FOREIGN KEY (conversation_id) REFERENCES conversation (id);
ALTER TABLE ai_usage ADD CONSTRAINT fk_ai_usage_31 FOREIGN KEY (question_id) REFERENCES chat_message (id);
ALTER TABLE document ADD CONSTRAINT fk_document_32 FOREIGN KEY (owner_user_id) REFERENCES users (id);
ALTER TABLE document ADD CONSTRAINT fk_document_33 FOREIGN KEY (template_id) REFERENCES template (id);
ALTER TABLE input_snapshot ADD CONSTRAINT fk_input_snapshot_34 FOREIGN KEY (document_id) REFERENCES document (id);
ALTER TABLE input_snapshot ADD CONSTRAINT fk_input_snapshot_35 FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE document_version ADD CONSTRAINT fk_document_version_36 FOREIGN KEY (document_id) REFERENCES document (id);
ALTER TABLE document_version ADD CONSTRAINT fk_document_version_37 FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE document_version ADD CONSTRAINT fk_document_version_38 FOREIGN KEY (template_version_id) REFERENCES template_version (id);
ALTER TABLE document_version ADD CONSTRAINT fk_document_version_39 FOREIGN KEY (document_id, input_snapshot_id) REFERENCES input_snapshot (document_id, id);
ALTER TABLE document ADD CONSTRAINT fk_document_40 FOREIGN KEY (id, verified_version_id) REFERENCES document_version (document_id, id);
ALTER TABLE document_version ADD CONSTRAINT fk_document_version_41 FOREIGN KEY (document_id, review_case_id) REFERENCES review_case (document_id, id);
ALTER TABLE review_case ADD CONSTRAINT fk_review_case_42 FOREIGN KEY (document_id) REFERENCES document (id);
ALTER TABLE review_case ADD CONSTRAINT fk_review_case_43 FOREIGN KEY (requester_user_id) REFERENCES users (id);
ALTER TABLE review_case ADD CONSTRAINT fk_review_case_44 FOREIGN KEY (expert_profile_id) REFERENCES expert_profile (id);
ALTER TABLE review_case ADD CONSTRAINT fk_review_case_45 FOREIGN KEY (slot_id) REFERENCES availability_slot (id);
ALTER TABLE review_case ADD CONSTRAINT fk_review_case_46 FOREIGN KEY (service_offering_id) REFERENCES service_offering (id);
ALTER TABLE review_case ADD CONSTRAINT fk_review_case_47 FOREIGN KEY (document_id, source_version_id) REFERENCES document_version (document_id, id);
ALTER TABLE review_task ADD CONSTRAINT fk_review_task_48 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE info_request ADD CONSTRAINT fk_info_request_49 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE info_request ADD CONSTRAINT fk_info_request_50 FOREIGN KEY (requested_by) REFERENCES users (id);
ALTER TABLE review_attachment ADD CONSTRAINT fk_review_attachment_51 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE review_attachment ADD CONSTRAINT fk_review_attachment_52 FOREIGN KEY (uploaded_by) REFERENCES users (id);
ALTER TABLE review_attachment ADD CONSTRAINT fk_review_attachment_53 FOREIGN KEY (review_case_id, info_request_id) REFERENCES info_request (review_case_id, id);
ALTER TABLE review_status_history ADD CONSTRAINT fk_review_status_history_54 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE review_status_history ADD CONSTRAINT fk_review_status_history_55 FOREIGN KEY (actor_user_id) REFERENCES users (id);
ALTER TABLE escrow ADD CONSTRAINT fk_escrow_56 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE settlement ADD CONSTRAINT fk_settlement_57 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_58 FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_59 FOREIGN KEY (verified_by) REFERENCES users (id);
ALTER TABLE payout_transaction ADD CONSTRAINT fk_payout_transaction_60 FOREIGN KEY (settlement_id) REFERENCES settlement (id);
ALTER TABLE payout_transaction ADD CONSTRAINT fk_payout_transaction_61 FOREIGN KEY (bank_account_id) REFERENCES bank_account (id);
ALTER TABLE payout_transaction ADD CONSTRAINT fk_payout_transaction_62 FOREIGN KEY (recipient_user_id) REFERENCES users (id);
ALTER TABLE dispute ADD CONSTRAINT fk_dispute_63 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE dispute ADD CONSTRAINT fk_dispute_64 FOREIGN KEY (raised_by) REFERENCES users (id);
ALTER TABLE dispute ADD CONSTRAINT fk_dispute_65 FOREIGN KEY (arbiter_user_id) REFERENCES users (id);
ALTER TABLE payment_transaction ADD CONSTRAINT fk_payment_transaction_66 FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE payment_transaction ADD CONSTRAINT fk_payment_transaction_67 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE credit_wallet ADD CONSTRAINT fk_credit_wallet_68 FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE credit_ledger ADD CONSTRAINT fk_credit_ledger_69 FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE credit_ledger ADD CONSTRAINT fk_credit_ledger_70 FOREIGN KEY (ref_payment_id) REFERENCES payment_transaction (id);
ALTER TABLE credit_ledger ADD CONSTRAINT fk_credit_ledger_71 FOREIGN KEY (ref_ai_usage_id) REFERENCES ai_usage (id);
ALTER TABLE credit_ledger ADD CONSTRAINT fk_credit_ledger_72 FOREIGN KEY (ref_document_version_id) REFERENCES document_version (id);
ALTER TABLE notification ADD CONSTRAINT fk_notification_73 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE rating ADD CONSTRAINT fk_rating_74 FOREIGN KEY (review_case_id) REFERENCES review_case (id);
ALTER TABLE rating ADD CONSTRAINT fk_rating_75 FOREIGN KEY (expert_profile_id) REFERENCES expert_profile (id);
ALTER TABLE rating ADD CONSTRAINT fk_rating_76 FOREIGN KEY (rater_user_id) REFERENCES users (id);
ALTER TABLE document_status_history ADD CONSTRAINT fk_document_status_history_77 FOREIGN KEY (document_id) REFERENCES document (id);
ALTER TABLE document_status_history ADD CONSTRAINT fk_document_status_history_78 FOREIGN KEY (actor_user_id) REFERENCES users (id);
ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_79 FOREIGN KEY (actor_user_id) REFERENCES users (id);
ALTER TABLE system_config ADD CONSTRAINT fk_system_config_80 FOREIGN KEY (updated_by) REFERENCES users (id);

-- 4. Index khai báo trực tiếp trong DBML.
CREATE INDEX ix_auth_refresh_token_2 ON auth_refresh_token (user_id, expires_at);
CREATE INDEX ix_expert_marketplace_feed ON expert_profile (status, service_status);
CREATE INDEX ix_expert_evidence_2 ON expert_evidence (expert_profile_id);
CREATE INDEX ix_expert_competency_assessment_2 ON expert_competency_assessment (expert_profile_id);
CREATE INDEX ix_service_offering_2 ON service_offering (expert_profile_id, is_active);
CREATE INDEX ix_availability_slot_2 ON availability_slot (expert_profile_id, status, start_at);
CREATE INDEX ix_knowledge_document_4 ON knowledge_document (status, created_at);
CREATE INDEX ix_conversation_2 ON conversation (user_id, updated_at);
CREATE INDEX ix_chat_message_2 ON chat_message (conversation_id, created_at);
CREATE INDEX ix_ai_usage_2 ON ai_usage (user_id, state);
CREATE INDEX ix_document_2 ON document (owner_user_id, status);
CREATE INDEX ix_document_version_6 ON document_version (review_case_id);
CREATE INDEX ix_review_case_4 ON review_case (expert_profile_id, status);
CREATE INDEX ix_review_case_6 ON review_case (requester_user_id, status);
CREATE INDEX ix_info_request_2 ON info_request (review_case_id, status);
CREATE INDEX ix_review_attachment_2 ON review_attachment (review_case_id);
CREATE INDEX ix_review_status_history_2 ON review_status_history (review_case_id, created_at);
CREATE INDEX ix_payout_transaction_4 ON payout_transaction (status, created_at);
CREATE INDEX ix_payment_transaction_2 ON payment_transaction (user_id, status);
CREATE INDEX ix_credit_ledger_2 ON credit_ledger (user_id, created_at);
CREATE INDEX ix_notification_2 ON notification (user_id, is_read, created_at);
CREATE INDEX ix_rating_2 ON rating (expert_profile_id);
CREATE INDEX ix_document_status_history_2 ON document_status_history (document_id, created_at);
CREATE INDEX ix_audit_log_2 ON audit_log (entity_type, entity_id);
CREATE INDEX ix_audit_log_4 ON audit_log (actor_user_id, created_at);
CREATE INDEX ix_event_outbox_2 ON event_outbox (aggregate_type, aggregate_id);


-- 6. CHECK, partial index, GIN và EXCLUDE được mô tả trong Note.
CREATE UNIQUE INDEX ux_users_email_ci ON users (lower(email));
CREATE UNIQUE INDEX ux_verif_active ON verification_token (user_id, purpose)
    WHERE used_at IS NULL AND invalidated_at IS NULL;
-- Không đưa expires_at > now() vào predicate: thời gian trôi không tự cập nhật index.
-- Token hết hạn vẫn phải invalidated khi phát hành token tiếp theo.

ALTER TABLE expert_competency_assessment
    ADD CONSTRAINT ck_assessment_scores CHECK (
        c1_score BETWEEN 1 AND 5 AND c2_score BETWEEN 1 AND 5 AND
        c3_score BETWEEN 1 AND 5 AND c4_score BETWEEN 1 AND 5 AND c5_score BETWEEN 1 AND 5),
    ADD CONSTRAINT ck_assessment_rationale CHECK (length(trim(rationale)) > 0);
ALTER TABLE expert_profile
    ADD CONSTRAINT ck_expert_eligibility_note CHECK
        (status <> 'NOT_ELIGIBLE' OR (eligibility_note IS NOT NULL AND btrim(eligibility_note) <> '')),
    ADD CONSTRAINT ck_expert_service_approved CHECK
        (service_status <> 'ACTIVE' OR status = 'APPROVED_FOR_SERVICE');
ALTER TABLE service_offering ADD CONSTRAINT ck_offering_fee CHECK (fee > 0);
CREATE UNIQUE INDEX ux_offer_one_per_type ON service_offering (expert_profile_id, service_type)
    WHERE is_active;
-- [BỔ SUNG] start < end ngăn khoảng rỗng/vô nghĩa; [) cho phép hai slot nối tiếp.
ALTER TABLE availability_slot
    ADD CONSTRAINT ck_slot_time CHECK (end_at > start_at),
    ADD CONSTRAINT ex_slot_no_overlap EXCLUDE USING gist
        (expert_profile_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&)
        WHERE (status <> 'RELEASED');

ALTER TABLE knowledge_document
    ADD CONSTRAINT ck_kd_rejected CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL),
    ADD CONSTRAINT ck_kd_source CHECK (
        (source = 'CRAWL_VBPL' AND crawl_job_id IS NOT NULL) OR
        (source = 'MANUAL_UPLOAD' AND uploaded_by IS NOT NULL)),
    ADD CONSTRAINT ck_kd_dates CHECK (effective_to >= effective_from), -- [BỔ SUNG]
    ADD CONSTRAINT ex_kd_effective_no_overlap EXCLUDE USING gist
        (legal_source_id WITH =, daterange(effective_from, effective_to, '[]') WITH &&)
        WHERE (status IN ('APPROVED', 'INDEXED', 'INDEX_FAILED'));
-- Giữ đúng [] của nguồn: effective_to được tính cả ngày đó.
-- NULL ở đầu/cuối range là không giới hạn; không phải "chưa xác định".
CREATE INDEX ix_kd_rag ON knowledge_document (legal_source_id, effective_from, effective_to)
    WHERE status = 'INDEXED';
CREATE INDEX gin_legal_source_meta ON legal_source USING gin (metadata jsonb_path_ops);
CREATE INDEX gin_knowledge_document_meta ON knowledge_document USING gin (metadata jsonb_path_ops);
CREATE INDEX gin_document_meta ON document USING gin (metadata jsonb_path_ops);
CREATE UNIQUE INDEX ux_tv_one_published ON template_version (template_id) WHERE status = 'PUBLISHED';

ALTER TABLE chat_message
    ADD CONSTRAINT ck_message_ai_answer CHECK (answer_status IS NULL OR sender = 'AI'),
    ADD CONSTRAINT ck_message_period CHECK (period_end >= period_start);
ALTER TABLE ai_quota ADD CONSTRAINT ck_ai_quota_balance CHECK (balance >= 0);
CREATE INDEX ix_cron_ai_usage_reserved ON ai_usage (created_at) WHERE state = 'RESERVED';
ALTER TABLE document
    ADD CONSTRAINT ck_document_period CHECK (period_end >= period_start),
    ADD CONSTRAINT ck_document_template CHECK (source = 'EXTERNAL_UPLOAD' OR template_id IS NOT NULL);
ALTER TABLE document_version
    ADD CONSTRAINT ck_version_immutable CHECK (is_immutable = (version_type <> 'EXPERT_REVISION')),
    ADD CONSTRAINT ck_version_ai CHECK (version_type <> 'AI_GENERATED' OR
        (input_snapshot_id IS NOT NULL AND template_version_id IS NOT NULL AND citations IS NOT NULL)),
    ADD CONSTRAINT ck_version_file CHECK (version_type <> 'EXTERNAL_FILE' OR file_url IS NOT NULL),
    ADD CONSTRAINT ck_version_review CHECK (version_type NOT IN ('EXPERT_REVISION','VERIFIED') OR review_case_id IS NOT NULL);

CREATE INDEX ix_cron_response_timeout ON review_case (response_deadline) WHERE status = 'PENDING_EXPERT_RESPONSE';
CREATE INDEX ix_cron_payment_timeout ON review_case (payment_deadline) WHERE status = 'AWAITING_PAYMENT';
CREATE INDEX ix_cron_start_timeout ON review_case (start_deadline) WHERE status = 'PAYMENT_CONFIRMED';
CREATE INDEX ix_cron_delivery_timeout ON review_case (delivery_deadline) WHERE status = 'IN_REVIEW';
CREATE INDEX ix_cron_acceptance_timeout ON review_case (acceptance_deadline) WHERE status = 'AWAITING_ACCEPTANCE';
-- [GIẢ ĐỊNH CẦN CHỐT] Nguồn không liệt kê nhóm status đang hoạt động.
-- Bảo thủ: chỉ 4 trạng thái kết thúc nêu rõ trong nguồn được giải phóng document/slot.
-- Nếu có CANCELLED/PAYMENT_EXPIRED/... trong enum chính thức, sửa HAI predicate này.
CREATE UNIQUE INDEX ux_review_one_active_document ON review_case (document_id)
    WHERE status NOT IN ('COMPLETED','TERMINATED','EXPERT_DECLINED','REQUEST_EXPIRED');
CREATE UNIQUE INDEX ux_review_one_active_slot ON review_case (slot_id)
    WHERE slot_id IS NOT NULL AND status NOT IN ('COMPLETED','TERMINATED','EXPERT_DECLINED','REQUEST_EXPIRED');
ALTER TABLE review_case
    ADD CONSTRAINT ck_case_decline_reason CHECK ((status = 'EXPERT_DECLINED') = (decline_reason IS NOT NULL)),
    ADD CONSTRAINT ck_case_termination_reason CHECK ((status = 'TERMINATED') = (termination_reason IS NOT NULL)),
    ADD CONSTRAINT ck_case_cannot_verify CHECK (result IS DISTINCT FROM 'CANNOT_VERIFY' OR cannot_verify_reason IS NOT NULL),
    ADD CONSTRAINT ck_case_delivery_summary CHECK (delivered_at IS NULL OR review_summary IS NOT NULL),
    ADD CONSTRAINT ck_case_delivery_deadline CHECK (started_at IS NULL OR
        (delivery_deadline IS NOT NULL AND delivery_deadline > started_at)),
    ADD CONSTRAINT ck_case_fee CHECK (fee > 0), -- [BỔ SUNG]
    ADD CONSTRAINT ck_case_platform_pct CHECK (platform_fee_pct BETWEEN 0 AND 100); -- [BỔ SUNG]

CREATE INDEX ix_cron_info_request_due ON info_request (due_at) WHERE status = 'OPEN';
ALTER TABLE info_request
    ADD CONSTRAINT ck_info_responded CHECK ((status = 'RESPONDED') = (responded_at IS NOT NULL)),
    ADD CONSTRAINT ck_info_response_message CHECK (status <> 'RESPONDED' OR response_message IS NOT NULL);
ALTER TABLE review_status_history
    ADD CONSTRAINT ck_review_history_change CHECK (from_status IS DISTINCT FROM to_status);
CREATE UNIQUE INDEX ux_bank_one_default ON bank_account (user_id) WHERE is_default AND deleted_at IS NULL;
CREATE UNIQUE INDEX ux_bank_no_dup ON bank_account (user_id, bank_bin, account_number_hash) WHERE deleted_at IS NULL;
ALTER TABLE payout_transaction
    ADD CONSTRAINT ck_payout_bank CHECK (payout_type <> 'EXPERT_PAYOUT' OR bank_account_id IS NOT NULL);
CREATE INDEX ix_cron_dispute_sla ON dispute (sla_due_at) WHERE status = 'OPEN';
ALTER TABLE payment_transaction
    ADD CONSTRAINT ck_payment_case CHECK ((purpose = 'REVIEW_FEE') = (review_case_id IS NOT NULL));
CREATE UNIQUE INDEX ux_pay_one_fee_per_case ON payment_transaction (review_case_id)
    WHERE purpose = 'REVIEW_FEE' AND status = 'SUCCEEDED';
ALTER TABLE credit_wallet
    ADD CONSTRAINT ck_wallet_balance CHECK (balance >= 0),
    ADD CONSTRAINT ck_wallet_held CHECK (held >= 0 AND held <= balance);
ALTER TABLE rating ADD CONSTRAINT ck_rating_score CHECK (score BETWEEN 1 AND 5);
CREATE INDEX ix_outbox_pending ON event_outbox (created_at) WHERE status = 'PENDING';
ALTER TABLE event_outbox
    ADD CONSTRAINT ck_outbox_processed CHECK ((status = 'PROCESSED') = (processed_at IS NOT NULL));

-- [BỔ SUNG] Miền số hợp lý; không áp đặt dấu amount của credit_ledger vì chưa có quy ước.
ALTER TABLE expert_profile
    ADD CONSTRAINT ck_expert_experience CHECK (years_experience >= 0),
    ADD CONSTRAINT ck_expert_turnaround CHECK (turnaround_hours > 0),
    ADD CONSTRAINT ck_expert_rating CHECK (rating_avg BETWEEN 0 AND 5 AND rating_count >= 0);
ALTER TABLE verification_token ADD CONSTRAINT ck_verification_attempts CHECK (attempt_count >= 0);
ALTER TABLE knowledge_document ADD CONSTRAINT ck_kd_numbers CHECK (version_no > 0 AND retry_count >= 0);
ALTER TABLE template_version ADD CONSTRAINT ck_tv_version CHECK (version_no > 0);
ALTER TABLE input_snapshot ADD CONSTRAINT ck_snapshot_version CHECK (version_no > 0);
ALTER TABLE document_version ADD CONSTRAINT ck_dv_version CHECK (version_no > 0);
ALTER TABLE kb_chunk ADD CONSTRAINT ck_chunk_numbers CHECK (chunk_index >= 0 AND (page IS NULL OR page > 0));
ALTER TABLE crawl_job ADD CONSTRAINT ck_crawl_docs CHECK (docs_found >= 0);
ALTER TABLE ai_usage ADD CONSTRAINT ck_ai_hold CHECK (credit_hold >= 0);
ALTER TABLE escrow ADD CONSTRAINT ck_escrow_positive CHECK (amount > 0);
ALTER TABLE settlement ADD CONSTRAINT ck_settlement_amounts CHECK
    (user_refund_amount >= 0 AND expert_payout_amount >= 0 AND platform_fee_amount >= 0);
ALTER TABLE payout_transaction ADD CONSTRAINT ck_payout_numbers CHECK (amount > 0 AND attempt_count >= 0);
ALTER TABLE payment_transaction ADD CONSTRAINT ck_payment_positive CHECK (amount > 0);
ALTER TABLE event_outbox ADD CONSTRAINT ck_outbox_retry CHECK (retry_count >= 0);

-- 7. Trigger: phần nghiệp vụ đã đủ thông tin.
-- Các hàm dùng search_path cố định, SECURITY INVOKER; không cấp quyền ngầm.
CREATE FUNCTION shft_touch_updated_at() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN NEW.updated_at := clock_timestamp(); RETURN NEW; END;
$$;
-- [BỔ SUNG] DEFAULT now() chỉ áp dụng INSERT; trigger mới cập nhật khi UPDATE.
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','business_profile','expert_profile','conversation',
        'ai_quota','ai_usage','document','review_case','review_task','escrow','bank_account',
        'payout_transaction','credit_wallet','system_config']
    LOOP
        EXECUTE format('CREATE TRIGGER zz_touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.shft_touch_updated_at()',t);
    END LOOP;
END;
$$;

CREATE FUNCTION shft_reject_mutation() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION '% is append-only: % is forbidden', TG_TABLE_NAME, TG_OP USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER guard_immutable_snapshot BEFORE UPDATE OR DELETE ON input_snapshot
    FOR EACH ROW EXECUTE FUNCTION shft_reject_mutation();
CREATE TRIGGER immutable_review_history BEFORE UPDATE OR DELETE ON review_status_history
    FOR EACH ROW EXECUTE FUNCTION shft_reject_mutation();
CREATE TRIGGER immutable_settlement BEFORE UPDATE OR DELETE ON settlement
    FOR EACH ROW EXECUTE FUNCTION shft_reject_mutation();
CREATE TRIGGER immutable_credit_ledger BEFORE UPDATE OR DELETE ON credit_ledger
    FOR EACH ROW EXECUTE FUNCTION shft_reject_mutation();

CREATE FUNCTION shft_template_version_lock() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF OLD.status = 'DRAFT' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'PUBLISHED' AND NEW.status = 'DEPRECATED'
           AND (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status') THEN RETURN NEW; END IF;
    END IF;
    RAISE EXCEPTION 'Published/deprecated template versions cannot be edited or deleted' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER template_version_lock BEFORE UPDATE OR DELETE ON template_version
    FOR EACH ROW EXECUTE FUNCTION shft_template_version_lock();

CREATE FUNCTION shft_guard_immutable_version() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF OLD.is_immutable THEN
        RAISE EXCEPTION 'Immutable document version % cannot be changed', OLD.id USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    -- [BỔ SUNG] Không di chuyển phiên bản đang sửa sang hồ sơ/ca khác.
    IF ROW(NEW.id,NEW.document_id,NEW.review_case_id,NEW.version_no,NEW.created_by,NEW.created_at)
       IS DISTINCT FROM ROW(OLD.id,OLD.document_id,OLD.review_case_id,OLD.version_no,OLD.created_by,OLD.created_at) THEN
        RAISE EXCEPTION 'Document version identity is locked' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_immutable_version BEFORE UPDATE OR DELETE ON document_version
    FOR EACH ROW EXECUTE FUNCTION shft_guard_immutable_version();

CREATE FUNCTION shft_lock_document_period() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF ROW(NEW.period_start,NEW.period_end) IS DISTINCT FROM ROW(OLD.period_start,OLD.period_end) THEN
        RAISE EXCEPTION 'Document period is locked after creation' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER lock_document_period BEFORE UPDATE ON document
    FOR EACH ROW EXECUTE FUNCTION shft_lock_document_period();
CREATE FUNCTION shft_check_verified_version() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE v public.document_version%ROWTYPE;
BEGIN
    IF NEW.verified_version_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO v FROM public.document_version
      WHERE id = NEW.verified_version_id AND document_id = NEW.id FOR SHARE;
    IF NOT FOUND OR v.version_type <> 'VERIFIED' THEN
        RAISE EXCEPTION 'verified_version_id must refer to a VERIFIED version of this document' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER check_verified_version BEFORE INSERT OR UPDATE ON document
    FOR EACH ROW EXECUTE FUNCTION shft_check_verified_version();

CREATE FUNCTION shft_invalidate_old_tokens() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF NEW.used_at IS NULL AND NEW.invalidated_at IS NULL THEN
        PERFORM 1 FROM public.users WHERE id = NEW.user_id FOR UPDATE;
        UPDATE public.verification_token SET invalidated_at = clock_timestamp()
          WHERE user_id = NEW.user_id AND purpose = NEW.purpose
            AND used_at IS NULL AND invalidated_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER invalidate_old_tokens BEFORE INSERT ON verification_token
    FOR EACH ROW EXECUTE FUNCTION shft_invalidate_old_tokens();

CREATE FUNCTION shft_check_fee_range() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE lo numeric; hi numeric; v jsonb;
BEGIN
    SELECT value INTO v FROM public.system_config WHERE key = 'SERVICE_FEE_MIN' FOR SHARE;
    IF v IS NULL OR jsonb_typeof(v) <> 'number' THEN
        RAISE EXCEPTION 'SERVICE_FEE_MIN must be configured as a JSON number' USING ERRCODE = '23514';
    END IF;
    lo := (v #>> '{}')::numeric;
    SELECT value INTO v FROM public.system_config WHERE key = 'SERVICE_FEE_MAX' FOR SHARE;
    IF v IS NULL OR jsonb_typeof(v) <> 'number' THEN
        RAISE EXCEPTION 'SERVICE_FEE_MAX must be configured as a JSON number' USING ERRCODE = '23514';
    END IF;
    hi := (v #>> '{}')::numeric;
    IF lo <= 0 OR hi < lo OR lo <> trunc(lo) OR hi <> trunc(hi) OR NEW.fee NOT BETWEEN lo AND hi THEN
        RAISE EXCEPTION 'Invalid fee configuration or fee outside configured range' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER check_fee_range BEFORE INSERT OR UPDATE OF fee ON service_offering
    FOR EACH ROW EXECUTE FUNCTION shft_check_fee_range();
-- Giới hạn phí áp dụng lúc tạo/đổi fee; đổi config không hồi tố gói đã tồn tại.

CREATE FUNCTION shft_case_lock_system_fields() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE k text; before_row jsonb := to_jsonb(OLD); after_row jsonb := to_jsonb(NEW);
BEGIN
    IF ROW(NEW.fee,NEW.platform_fee_pct) IS DISTINCT FROM ROW(OLD.fee,OLD.platform_fee_pct) THEN
        RAISE EXCEPTION 'Case fee and platform fee percentage are locked' USING ERRCODE = '23514';
    END IF;
    -- [DIỄN GIẢI] Mốc NULL được ghi lần đầu khi tiến đến bước tương ứng;
    -- sau đó không được xóa/ghi lại. Khóa cả NULL sẽ làm workflow không chạy được.
    FOREACH k IN ARRAY ARRAY['response_deadline','payment_deadline','start_deadline',
        'acceptance_deadline','accepted_at','paid_at','started_at']
    LOOP
        IF before_row -> k <> 'null'::jsonb AND (before_row -> k) IS DISTINCT FROM (after_row -> k) THEN
            RAISE EXCEPTION 'Case field % is write-once', k USING ERRCODE = '23514';
        END IF;
    END LOOP;
    IF OLD.delivery_deadline IS NOT NULL AND
       (NEW.delivery_deadline IS NULL OR NEW.delivery_deadline < OLD.delivery_deadline) THEN
        RAISE EXCEPTION 'Delivery deadline can only be extended' USING ERRCODE = '23514';
    END IF;
    -- [BỔ SUNG] Khóa danh tính ca, không chuyển khoản tiền/slot đã đặt sang ca khác.
    IF ROW(NEW.id,NEW.document_id,NEW.source_version_id,NEW.requester_user_id,NEW.expert_profile_id,NEW.slot_id,NEW.service_offering_id)
       IS DISTINCT FROM ROW(OLD.id,OLD.document_id,OLD.source_version_id,OLD.requester_user_id,OLD.expert_profile_id,OLD.slot_id,OLD.service_offering_id) THEN
        RAISE EXCEPTION 'Review case identity and booking references are locked' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER case_lock_system_fields BEFORE UPDATE ON review_case
    FOR EACH ROW EXECUTE FUNCTION shft_case_lock_system_fields();

CREATE FUNCTION shft_check_escrow_amount() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE expected bigint;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF ROW(NEW.id,NEW.review_case_id,NEW.amount) IS DISTINCT FROM ROW(OLD.id,OLD.review_case_id,OLD.amount) THEN
            RAISE EXCEPTION 'Escrow identity and amount are locked' USING ERRCODE = '23514';
        END IF;
        IF OLD.status = 'SETTLED' AND NEW.status <> 'SETTLED' THEN
            RAISE EXCEPTION 'Settled escrow cannot be reopened' USING ERRCODE = '23514';
        END IF;
    END IF;
    SELECT fee INTO expected FROM public.review_case WHERE id = NEW.review_case_id FOR SHARE;
    IF NOT FOUND OR NEW.amount <> expected THEN
        RAISE EXCEPTION 'Escrow amount must equal review case fee' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER check_escrow_amount BEFORE INSERT OR UPDATE ON escrow
    FOR EACH ROW EXECUTE FUNCTION shft_check_escrow_amount();

CREATE FUNCTION shft_settle_escrow() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE e public.escrow%ROWTYPE;
BEGIN
    -- Cùng khóa review_case với dispute để serialize quyết toán và mở tranh chấp.
    PERFORM 1 FROM public.review_case WHERE id = NEW.review_case_id FOR UPDATE;
    SELECT * INTO e FROM public.escrow WHERE review_case_id = NEW.review_case_id FOR UPDATE;
    IF NOT FOUND OR e.status <> 'HELD' THEN
        RAISE EXCEPTION 'Settlement requires a HELD escrow' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM public.dispute WHERE review_case_id = NEW.review_case_id AND status = 'OPEN') THEN
        RAISE EXCEPTION 'Cannot settle while dispute is OPEN' USING ERRCODE = '23514';
    END IF;
    -- numeric tránh tràn bigint khi cộng dữ liệu đầu vào không hợp lệ.
    IF NEW.user_refund_amount::numeric + NEW.expert_payout_amount::numeric + NEW.platform_fee_amount::numeric <> e.amount THEN
        RAISE EXCEPTION 'Settlement sum must equal escrow amount' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER check_settle_escrow BEFORE INSERT ON settlement
    FOR EACH ROW EXECUTE FUNCTION shft_settle_escrow();
CREATE FUNCTION shft_close_escrow() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    UPDATE public.escrow SET status = 'SETTLED' WHERE review_case_id = NEW.review_case_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER settle_escrow AFTER INSERT ON settlement FOR EACH ROW EXECUTE FUNCTION shft_close_escrow();
CREATE FUNCTION shft_dispute_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.review_case_id IS DISTINCT FROM OLD.review_case_id THEN
            RAISE EXCEPTION 'Dispute review case is locked' USING ERRCODE = '23514';
        END IF;
    END IF;
    PERFORM 1 FROM public.review_case WHERE id = NEW.review_case_id FOR UPDATE;
    IF NEW.status = 'OPEN' AND EXISTS (SELECT 1 FROM public.settlement WHERE review_case_id = NEW.review_case_id) THEN
        RAISE EXCEPTION 'Cannot open a dispute after settlement' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER dispute_settlement_guard BEFORE INSERT OR UPDATE ON dispute
    FOR EACH ROW EXECUTE FUNCTION shft_dispute_guard();

-- [BỔ SUNG] Serialize các thay đổi Expert/ngân hàng theo users.
-- UPDATE thật trên dòng users còn buộc transaction snapshot cũ retry ở REPEATABLE READ.
CREATE FUNCTION shft_lock_expert_user() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'Expert user_id cannot change' USING ERRCODE = '23514';
        END IF;
    END IF;
    UPDATE public.users SET updated_at = updated_at WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER aa_lock_expert_user BEFORE INSERT OR UPDATE ON expert_profile
    FOR EACH ROW EXECUTE FUNCTION shft_lock_expert_user();
CREATE FUNCTION shft_bank_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Use deleted_at; hard deletion of bank accounts is forbidden' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        -- Giữ nguyên số TK (kể cả bản mã). Xoay khóa mã hóa cần migration riêng.
        IF ROW(NEW.id,NEW.user_id,NEW.bank_bin,NEW.account_number_enc,NEW.account_number_hash,NEW.account_last4,NEW.account_holder_name)
           IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.bank_bin,OLD.account_number_enc,OLD.account_number_hash,OLD.account_last4,OLD.account_holder_name) THEN
            RAISE EXCEPTION 'Bank account identity is locked; create another account' USING ERRCODE = '23514';
        END IF;
    END IF;
    UPDATE public.users SET updated_at = updated_at WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER bank_guard BEFORE INSERT OR UPDATE OR DELETE ON bank_account
    FOR EACH ROW EXECUTE FUNCTION shft_bank_guard();
CREATE FUNCTION shft_check_active_expert_bank() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.expert_profile WHERE user_id = NEW.user_id AND service_status = 'ACTIVE')
       AND NOT EXISTS (SELECT 1 FROM public.bank_account WHERE user_id = NEW.user_id
           AND is_default AND deleted_at IS NULL AND status = 'VERIFIED') THEN
        RAISE EXCEPTION 'ACTIVE expert requires a VERIFIED, nondeleted default bank account' USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;
-- Deferred cho phép đổi TK mặc định trong cùng transaction: bỏ mặc định cũ -> đặt mới.
CREATE CONSTRAINT TRIGGER expert_active_bank AFTER INSERT OR UPDATE ON expert_profile
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION shft_check_active_expert_bank();
CREATE CONSTRAINT TRIGGER bank_active_expert AFTER INSERT OR UPDATE ON bank_account
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION shft_check_active_expert_bank();

CREATE FUNCTION shft_payout_bank() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE b public.bank_account%ROWTYPE;
BEGIN
    IF NEW.bank_account_id IS NULL THEN
        NEW.snap_bank_bin := NULL; NEW.snap_bank_name := NULL;
        NEW.snap_account_last4 := NULL; NEW.snap_holder_name := NULL;
        RETURN NEW;
    END IF;
    SELECT * INTO b FROM public.bank_account WHERE id = NEW.bank_account_id FOR SHARE;
    IF NOT FOUND OR b.user_id <> NEW.recipient_user_id OR b.status <> 'VERIFIED' OR b.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Payout requires a VERIFIED, nondeleted bank account belonging to recipient' USING ERRCODE = '23514';
    END IF;
    NEW.snap_bank_bin := b.bank_bin; NEW.snap_bank_name := b.bank_name;
    NEW.snap_account_last4 := b.account_last4; NEW.snap_holder_name := b.account_holder_name;
    RETURN NEW;
END;
$$;
CREATE TRIGGER payout_bank BEFORE INSERT ON payout_transaction FOR EACH ROW EXECUTE FUNCTION shft_payout_bank();
CREATE FUNCTION shft_payout_bank_locked() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    IF ROW(NEW.id,NEW.settlement_id,NEW.payout_type,NEW.recipient_user_id,NEW.amount,NEW.bank_account_id,
           NEW.snap_bank_bin,NEW.snap_bank_name,NEW.snap_account_last4,NEW.snap_holder_name,NEW.provider)
       IS DISTINCT FROM ROW(OLD.id,OLD.settlement_id,OLD.payout_type,OLD.recipient_user_id,OLD.amount,OLD.bank_account_id,
           OLD.snap_bank_bin,OLD.snap_bank_name,OLD.snap_account_last4,OLD.snap_holder_name,OLD.provider) THEN
        RAISE EXCEPTION 'Payout destination, snapshot and amount are locked' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER payout_bank_locked BEFORE UPDATE ON payout_transaction
    FOR EACH ROW EXECUTE FUNCTION shft_payout_bank_locked();

CREATE FUNCTION shft_check_rating() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE c public.review_case%ROWTYPE;
BEGIN
    SELECT * INTO c FROM public.review_case WHERE id = NEW.review_case_id FOR SHARE;
    IF NOT FOUND OR c.status <> 'COMPLETED' OR c.requester_user_id <> NEW.rater_user_id
       OR c.expert_profile_id <> NEW.expert_profile_id THEN
        RAISE EXCEPTION 'Only requester may rate the assigned expert of a COMPLETED case' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER check_rating BEFORE INSERT ON rating FOR EACH ROW EXECUTE FUNCTION shft_check_rating();
-- [BỔ SUNG] Chặn sửa/xóa rating vì nguồn chỉ định nghĩa event RatingCreated.
-- Nếu cho sửa đánh giá cần thêm event và quy tắc worker tương ứng.
CREATE TRIGGER immutable_rating BEFORE UPDATE OR DELETE ON rating FOR EACH ROW EXECUTE FUNCTION shft_reject_mutation();
CREATE FUNCTION shft_rating_outbox() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    -- [DIỄN GIẢI] Một event cho một rating: dùng lại UUID v7 của rating làm event id.
    -- Không cần UUID mặc định mới ở DB; hai bảng có không gian PK độc lập.
    INSERT INTO public.event_outbox (id,aggregate_type,aggregate_id,event_type,payload)
    VALUES (NEW.id,'rating',NEW.id,'RatingCreated',jsonb_build_object(
        'rating_id',NEW.id,'expert_profile_id',NEW.expert_profile_id,
        'review_case_id',NEW.review_case_id,'score',NEW.score));
    RETURN NEW;
END;
$$;
CREATE TRIGGER rating_created_outbox AFTER INSERT ON rating FOR EACH ROW EXECUTE FUNCTION shft_rating_outbox();

-- 8. CHƯA ĐỦ ĐẶC TẢ: không tự suy đoán cách cộng/trừ Credit.
-- Nguồn thiếu toàn bộ enum credit_ledger_entry_type, dấu amount, HOLD/RELEASE/CAPTURE,
-- tương tác held/balance, quy tắc idempotent và đối chiếu payment/AI/document.
-- Do đó apply_ledger tạm CHẶN INSERT, thay vì âm thầm ghi ledger mà không cập nhật ví.
-- Phải thay hàm này bằng bản nghiệp vụ chính thức trước khi sử dụng Credit.
CREATE FUNCTION shft_apply_ledger() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
    RAISE EXCEPTION 'Credit ledger is not enabled: missing entry_type and amount/held semantics in source DBML'
        USING ERRCODE = '0A000', HINT = 'Define entry types, signed amounts, HOLD/RELEASE/CAPTURE and idempotency; then replace shft_apply_ledger.';
END;
$$;
CREATE TRIGGER apply_ledger BEFORE INSERT ON credit_ledger FOR EACH ROW EXECUTE FUNCTION shft_apply_ledger();

COMMIT;
