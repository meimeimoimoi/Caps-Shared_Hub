# Expert service pricing

Route: /expert/services/:serviceId/pricing. Entry: pricing action on /expert/services.

## Current implementation

The page extends the existing Expert Portal: shared semantic colors, sans typography, existing status badges and buttons. The fee editor and pricing summary sit side by side on desktop and stack below 1100px. Inputs use 16px text and 48px minimum height. Version history scrolls horizontally on narrow screens. No changes to the registration-only DESIGN.md are needed.

Supported fields: fixed fee per booking (whole VND amount), requested effective date (Vietnam calendar date), and revision reason. The fixed-fee model is a frontend assumption because the business policy does not define hourly or package pricing. A requested date is not an approval or activation event. No delivery SLA, commission or qualification can be edited here.

Only ACTIVE accounts with APPROVED_FOR_SERVICE qualification can configure pricing. The route resolves the service from the Expert context rather than trusting a supplied service ID.

## Version lifecycle

- Save creates or updates a DRAFT; saving after approval creates a new version.
- Submit validates the reason and moves the editable version to PENDING_APPROVAL.
- PENDING_APPROVAL blocks further writes. Revision checks reject stale writes and duplicate submissions.
- RETURN_FOR_REVISION can be edited and resubmitted. REJECTED and APPROVED versions are retained; a new draft receives a new version identifier.
- Existing effective pricing remains unchanged throughout these Expert actions. Approval, rejection and activation belong to administrator/server workflows and are not simulated as Expert actions.
- Demo save/submit actions retain actor, timestamp and version ID in an in-memory activity log; this is not a durable server audit trail.

## Data boundary

Development uses the existing VITE_EXPERT_DATA_SOURCE=mock mode. Pricing fixtures are illustrative and scoped by Expert, authentication session and service. They stay in module memory across route navigation, reset on a full page reload and never write prices to localStorage. Private query caches are cleared on logout. Demo pending pricing is reflected in the context projection; effective prices and booking readiness remain unchanged.

There is currently no Expert pricing API in the backend. API mode and production explicitly show an unavailable state and disable this workflow. No guessed endpoint is called. Server integration must supply authenticated reads, version concurrency tokens, server-side validation/qualification enforcement, price policy limits (if defined), immutable approved versions, requested versus approved effective dates, and durable audit events. Admin approval and case quote snapshots require their own backend flows.

## Validation

Run from FE:

~~~sh
node --experimental-strip-types --test tests/expert-pricing.test.mjs
npm run build
~~~

Tests cover amount and calendar validation, Vietnam day boundaries, required submission reasons, approved-version preservation, pending/stale write protection, qualification, revision/rejection lifecycle and demo scope isolation. Browser/mobile visual verification is still required; this session exposed no browser surface.
