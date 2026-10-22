# Workflow service

Owns the user's work (port **5030**): documents built from templates, the AI chat with its free quota, and
expert reviews of a document (schemas `workspace` and `review`).
It does **not** own accounts (auth), expert profiles and availability (expert) or money (billing).

## Status

| Area | Entities | API |
|---|---|---|
| Documents (`workspace`) | `Template` → `TemplateVersion` (field schema), `Document` → `InputSnapshot` (form data) → `DocumentVersion` (immutable once sent to review) | Not yet |
| AI chat (`workspace`) | `Conversation` → `ChatMessage` (with citations), `AiQuota` (free questions), `AiUsage` (how each answer was paid) | Not yet |
| Expert review (`review`) | `ReviewCase` (request → payment → delivery → acceptance), `ReviewTask`, `InfoRequest`, `ReviewAttachment`, `ReviewStatusHistory` | Not yet (no case creation) |
| Case chat (`review`) | `CaseMessage` (text between the two parties), `CaseReadMarker` (last message each party has read) | Done, see below |

Apart from the case chat, entities still have public setters and no behavior; the next use cases should turn
them into entities with factories and rules (see AGENTS.md and `auth` as the model).

## Case chat (client ↔ expert)

Text chat inside a review case between its requester (client, role USER) and its expert. REST only: the FE
polls with the `after` cursor. Routed by the gateway (`review-cases-v1`, `admin-review-cases-v1`).

| Method | Endpoint | Who | Description |
|---|---|---|---|
| GET | `/api/v1/review-cases/{caseId}/messages?before=&after=&limit=` | Requester or expert of the case | Messages, oldest first. No cursor: the newest ones; `before`: older (scroll back); `after`: newer (polling). `limit` 30 by default, at most 100. Cursors are message ids. |
| POST | `/api/v1/review-cases/{caseId}/messages` | Requester or expert of the case | Sends `{ "content": "..." }`, 1–4000 characters after trimming. |
| POST | `/api/v1/review-cases/{caseId}/messages/read` | Requester or expert of the case | `{ "lastMessageId": "..." }`. The read marker only moves forward. |
| GET | `/api/v1/review-cases/messages/unread` | Signed-in user | `[{ reviewCaseId, unreadCount }]` for cases with unread messages from the other party. |
| GET | `/api/v1/admin/review-cases/{caseId}/messages` | Permission `UserManage` | Read-only view of any case's chat (disputes). Same cursors. |

Rules:

- Parties are matched on `review_case.requester_user_id` (role `CLIENT`) and `review_case.expert_user_id`
  (role `EXPERT`). Tokens carry user ids only, so the case-creation flow **must** fill `expert_user_id`.
- Anyone else gets `404 REVIEW_CASE_NOT_FOUND`, so case ids cannot be probed.
- Ended cases (`COMPLETED`, `TERMINATED`, `EXPERT_DECLINED`, `REQUEST_EXPIRED`) reject new messages with
  `409 CHAT_CLOSED`; reading still works.
- Error codes: `MESSAGE_EMPTY`, `MESSAGE_TOO_LONG` (400), `MESSAGE_NOT_FOUND` (404, unknown cursor or read id).

Not done yet: attachments, info-request endpoints (`InfoRequest`), realtime push (SignalR).

Tests: domain rules in `tests/Caps.Workflow.UnitTests`.

## Boundaries with other services

User, expert profile, slot and service offering ids are plain columns, not foreign keys: those rows live in
auth and expert. Billing keeps its own copy of review case ids for the same reason. Learn about other services'
data through events or the access token, never by reading their schemas.

## Layout

Clean Architecture, like `auth`: `Domain` (`Workspace/`, `Review/`), `Application`,
`Infrastructure` (`WorkflowDbContext` + migrations), `Api`.

## Run (PowerShell from BE)

~~~powershell
dotnet run --project workflow/Api    # http://localhost:5030/healthz
~~~

EF commands: `dotnet ef migrations add <Name> --project workflow/Infrastructure --startup-project workflow/Api --output-dir Persistence/Migrations`.

Development connection (database and service role must already exist):

```powershell
.\scripts\set-connections.ps1 -Service workflow
```
