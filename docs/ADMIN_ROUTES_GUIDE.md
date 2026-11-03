# NEXA admin routes: guide for the admin app

This guide is for the separate NEXA admin app. It describes only what the NEXA server already does. The admin app talks to the **same NEXA server** as the main app. It has no database of its own.

The routes are plain JSON over HTTPS and do not depend on any one kind of client. A web admin app uses them first. A later Android admin app can use exactly the same routes with no server change, so nothing here is web-only.

## Signing in

1. `POST /api/auth/login` with `{ "email", "password" }`. The reply holds `token`, `userId` and `user`, or `mfaRequired` plus a short-lived `challengeId` for an Admin with TOTP enabled. Complete `/api/auth/admin-mfa/verify` before treating sign-in as complete.
2. Send `Authorization: Bearer <token>` on every other call.
3. `POST /api/auth/logout` ends the session.
4. Call `GET /api/admin/me` right after signing in. A person who is not an admin gets 403 and the admin app should show "no access".

A suspended account is refused at sign-in and on every call, with a clear message.

## Roles

| Role | How a person gets it | Can do |
|---|---|---|
| owner | listed on the server in `NEXA_ADMIN_EMAILS` or `NEXA_ADMIN_USER_IDS` | everything below |
| reviewer | added by an owner | summary, verification review, Lifestyle report review, read people and shops |
| support | added by an owner | summary, read people and shops |

Each route below names the permission it needs. `GET /api/admin/me` returns the exact permission list for the signed-in admin, so the admin app should hide what the person cannot use.

Permission names: `admins`, `audit`, `summary`, `users_read`, `users_suspend`, `users_remove`, `vendors_read`, `vendors_moderate`, `vendors_remove`, `verification`, `reports`, `social_reports`, `violations`, `approvals`, `approval_center`, `mall_details`, and for the owner-only routes further down: `mall`, `payments`, `operations`, `launch`, `fitness_gyms`, `fitness_gyms_write`, `leisure_ops`, `kitchen_hub`, `kitchen_hub_decide`, `creator_content`; `security` is self-service for Admin roles, with the privileged audit endpoint owner-only. `staff_work`

The owner-only routes below are checked on the server by the owner list (a reviewer or support person gets 403). V6.2.8 exception: the seven routes under Fitness gyms, Leisure operations, Kitchen Hub and `GET /api/business/youtube/config` are also open to a verified Administrative Director grant (NEXA company scope, reached through `/api/admin-aami/nexa/x/...`), each by its own permission. General Manager and Group Director get none of them. The extra permission names exist so `GET /api/admin/me` can tell the admin app which pages to show. They do not change who may call a route.

A call without the needed permission gets 403 with `Administrator access required.`

## Routes

### Who am I
- `GET /api/admin/me` (any admin): `{ id, name, role, permissions[] }`.

### Owner analytics (owner only)
- `GET /api/admin/owner-analytics` (configured owner identity only; reviewers/support receive 403). Optional `windowDays` is bounded to 7, 30, or 90 days (invalid values use 30). Returns aggregate metrics with `available`, `source`, and explicit unavailable reasons. No member-level rows or credentials are exported.
- `GET /api/admin/owner-analytics?format=csv&windowDays=30` downloads aggregate-only CSV. GMV/refund amounts remain in source-native currencies and are not combined or converted. Missing source tables are marked unavailable, not reported as zero.

### Summary
- `GET /api/admin/summary` (`summary`): `{ users, suspended, vendors, pendingVerifications, reportedLifestyleComments, reportedLifestylePosts }`. Use it for the home screen counters.

### People and shops
- `GET /api/admin/users` (`users_read`): query `q` (name or email), `limit` (1 to 100, default 25), `offset`. Returns `{ users[] }` with `id, name, email, createdAt, status, suspendedReason, isVendor, verified { user, vendor }, adminRole`.
- `GET /api/admin/vendors` (`vendors_read`): query `limit`, `offset`. Returns `{ vendors[] }` with `id, shopName, createdAt, owner, verified`.
- `POST /api/admin/users/:id/suspend` (`users_suspend`): body `{ reason }` (a short reason is required). Not allowed on yourself or on another admin.
- `POST /api/admin/users/:id/unsuspend` (`users_suspend`).
- `POST /api/admin/vendors/:id/suspend` (`vendors_moderate`, owner only): body `{ reason }` (3+ characters). Suspends the shop without deleting its data and records the moderation reason.
- `POST /api/admin/vendors/:id/unsuspend` (`vendors_moderate`, owner only): reinstates the shop; it becomes active only if the vendor has a current active subscription, otherwise it remains inactive.
- `GET /api/admin/mall/products` (`vendors_moderate`, owner only): query `status` (`all`, `active`, `inactive`), `limit`, `offset`. Returns the product and shop moderation inventory.
- `POST /api/admin/mall/products/:id/takedown` (`vendors_moderate`, owner only): body `{ reason }` (3+ characters). Sets the existing product `active` flag to 0 and audits the action.
- `POST /api/admin/mall/products/:id/restore` (`vendors_moderate`, owner only): restores an inactive product by setting its existing `active` flag to 1.
- `GET /api/admin/yaayz/tickets` (`vendors_moderate`, owner only): query `status` (`all`, `active`, `inactive`), `limit`, `offset`. Returns ticket listings and seller identity fields needed for moderation.
- `POST /api/admin/yaayz/tickets/:id/takedown` (`vendors_moderate`, owner only): body `{ reason }` (3+ characters). Sets the existing ticket listing `active` flag to 0 and audits the action.
- `POST /api/admin/yaayz/tickets/:id/restore` (`vendors_moderate`, owner only): restores an inactive ticket listing by setting `active` to 1.
- `GET /api/admin/yaayz/adverts` (`vendors_moderate`, owner only): query `status` (`all`, `pending`, `approved`, `rejected`, `taken_down`), `limit`, `offset`; returns YaayzAdvert submissions with shop and owner identity.
- `POST /api/admin/yaayz/adverts/:id/decision` (`vendors_moderate`, owner only): body `{ decision: "approved" | "rejected" | "taken_down", reason }`. Rejection/takedown requires a 3+ character reason; approval makes the advert live.

### Verification queue
- `GET /api/admin/verification` (`verification`): query `status` (`pending`, `approved`, `rejected`; default `pending`), `kind` (`user` or `vendor`), `limit`, `offset`. Oldest first. Each request has the written `details`, the person and, for shops, the shop name.
- `POST /api/admin/verification/:id/decision` (`verification`): body `{ decision: "approve" | "reject", reason }`. A reason is required to reject, and the person sees it. A request can be decided once. You cannot decide your own request.

Approving gives the person a verified record. The person is told either way.

### Lifestyle reports (posts)
- `GET /api/lifestyle/reports` (`reports`): query `status` (`open`, `dismissed`, `actioned`; default `open`). One row per reported post with `postId, reports, reasons[], lastReportedAt, removed, author, caption`.
- `DELETE /api/lifestyle/reports/:postId/post` (`reports`): removes the post and closes its reports as actioned.
- `POST /api/lifestyle/reports/:postId/dismiss` (`reports`): keeps the post and closes its open reports as dismissed.

### Lifestyle reports (comments)
- `GET /api/lifestyle/comment-reports` (`reports`): query `status` as above. One row per reported comment with `commentId, postId, reports, reasons[], lastReportedAt, removed, author, body`.
- `DELETE /api/lifestyle/comment-reports/:commentId/comment` (`reports`): removes the comment and closes its reports as actioned.
- `POST /api/lifestyle/comment-reports/:commentId/dismiss` (`reports`): keeps the comment and closes its open reports as dismissed.

Report reasons used by members: `spam`, `nudity`, `harassment`, `other`.


### YouTube Creator moderation
- `GET /api/business/youtube/config` (signed-in Business Hub): secret-free creator API readiness and mode status.
- `GET /api/business/youtube/config` (`creator_content`): read only. Whether the YouTube Data API key is configured; never the key itself. Open to the owner and the Administrative Director. The channel and video moderation routes below stay owner only.
- `GET /api/admin/youtube/channels` (`creator_content`): creator channel moderation inventory.
- `POST /api/admin/youtube/channels/:id/decision` (`creator_content`): body `{ decision: "approve" | "reject" | "suspend", reason }`.
- `GET /api/admin/youtube/videos` (`creator_content`): creator video moderation inventory.
- `POST /api/admin/youtube/videos/:id/decision` (`creator_content`): body `{ decision: "approve" | "reject" | "suspend", reason }`.
- `POST /api/admin/youtube/channels/:id/sync` (`creator_content`): refreshes a connected creator channel.

### Admins and the action log (owner only)
- `GET /api/admin/admins` (`admins`): who has been added.
- `POST /api/admin/admins` (`admins`): body `{ role: "reviewer" | "support", email }` or `{ role, userId }`. Owners are set on the server, not here.
- `DELETE /api/admin/admins/:userId` (`admins`).
- `GET /api/admin/audit` (`audit`): query `limit`, `offset`. Newest first. Every admin change is recorded with who, what and when. Audited actions include verification decisions, suspensions, admin changes and Lifestyle removals and dismissals.

### Admin Security Center (Main remains identity/session authority)
- `GET /api/admin/security/overview` (`security`): current Admin MFA state, active session metadata and passkey origin readiness. Session tokens are never returned.
- `GET /api/admin/security/login-history` (`security`): own login history; only the owner may supply another Admin `userId`.
- `POST /api/admin/security/mfa/setup` (`security`): body `{ password, code? }`; verifies the current password and, if MFA is already enabled, a current TOTP code before creating a short-lived setup secret; the secret is encrypted at rest and shown only once during setup.
- `POST /api/admin/security/mfa/enable` (`security`): body `{ code }`; enables TOTP only after a current six-digit authenticator code is verified.
- `POST /api/admin/security/mfa/disable` (`security`): body `{ password, code }`; requires current password and a valid authenticator code.
- `POST /api/auth/admin-mfa/verify`: public login-challenge completion; a password-authenticated Admin with TOTP enabled must complete this step before a session is created.
- `DELETE /api/admin/security/sessions/:sessionId` (`security`): revokes one session owned by the signed-in Admin.
- `POST /api/admin/security/emergency-logout` (`security`): revokes every active session for the signed-in Admin, including the current one.
- `POST /api/admin/security/reauth` (`security`): body `{ password, code?, action }`; returns a short-lived, one-use, session-bound step-up token. Sensitive Admin mutations require the matching `X-NEXA-STEP-UP` header.
- `GET /api/admin/security/audit` (`security`, owner only): newest-first privileged Admin action history.
- `GET /api/admin/security/passkeys` (`security`): returns only the signed-in Admin’s registered credential metadata and whether origin configuration is ready.
- `POST /api/admin/security/passkeys/register/options` and `POST /api/admin/security/passkeys/register/verify` (`security`): the options request requires `{ password, code? }`; the server issues a one-time registration challenge and accepts only a verified `none`-attestation credential enrollment.
- `DELETE /api/admin/security/passkeys/:credentialId` (`security`): removes an owned passkey after current-password and optional TOTP confirmation.
- `POST /api/auth/admin-passkey/options` and `POST /api/auth/admin-passkey/verify`: public discoverable-credential sign-in using a one-time challenge, exact origin/RP ID checks, user verification, signature verification and counter-anomaly checks. If TOTP is also enabled, passkey verification is followed by the TOTP challenge before a session is created.

MFA setup requires a random 32+ character server-only `NEXA_ADMIN_MFA_ENCRYPTION_KEY` (or approved existing server encryption secret). Never place this key in browser config, commit it, or include it in logs/checkpoints. Admin uses Main-owned auth/session storage; there is no second credential store. TOTP and WebAuthn passkey registration/sign-in are implemented. Passkey use still requires a configured canonical HTTPS origin/RP ID and secure browser context; browser end-to-end behavior remains NOT TESTED until verified in a running deployment.

Sensitive-action step-up is action-bound and expires after five minutes. Admin account creation/removal, verification decisions, account deactivation, financial decisions and selected moderation/Staff operations are gated server-side. A missing/expired/mismatched grant returns HTTP 428 `STEP_UP_REQUIRED`; the Admin client prompts for current password and, when MFA is enabled, the current TOTP code before retrying once.

### Mall (owner only, permission `mall`)
- `GET /api/mall/admin/status`: `{ isAdmin }`. Any signed-in person may call it; it never returns 403.
- `GET /api/mall/admin/disputes`: query `status` (`all`, `open`, `pending_buyer_confirmation`, `resolved`; default `all`). Newest change first, 200 at most. Each row has the dispute fields plus `buyerEmail, buyerName, orderTotal, orderCurrency, itemName, vendorId, shopName`.
- `POST /api/mall/admin/disputes/:disputeId/resolve`: body `{ resolution }` (4 to 1500 characters). 404 if not found, 409 if already resolved or changed meanwhile. Reply `{ dispute: { id, status, resolution, updatedAt } }`.
- `GET /api/mall/admin/review-reports`: query `status` (`open`, `reviewed`, `dismissed`, `all`; default `open`). 200 at most. Each row has `id, reviewId, reason, details, createdAt, status, shopName, productName, rating, reviewCreatedAt`.
- `PATCH /api/mall/admin/review-reports/:reportId/status`: body `{ status: "reviewed" | "dismissed", reason }`. 409 if the report is already resolved.
- `GET /api/mall/admin/reviews`: query `status` (`all`, `published`, `removed`, `pending`; default `all`). 200 at most. Each row has `id, productId, vendorId, userId, rating, comment, createdAt, updatedAt, sellerReply, moderationStatus, reviewerName, shopName`.
- `PATCH /api/mall/admin/reviews/:reviewId/moderation`: body `{ status: "published" | "removed" | "pending", reason }`. Open reports on that review are marked reviewed. 409 if the review changed meanwhile. The moderation is recorded with who, from, to and reason.
- `GET /api/mall/admin/vendor-subscriptions/launch-offer`: read only. The vendor launch offer summary with `generatedAt`.

### Approval Center (owner only, permission `approvals`)
- `GET /api/admin/approvals` (`approvals`): central queue for pending subscription approvals plus pending verification, Yaayz advert, Fitness gym and Kitchen Hub approvals, and unresolved payment-attention items.
- `GET /api/admin/subscriptions/requests` (`approvals`): subscription request history.
- `POST /api/admin/subscriptions/requests/:id/decision` (`approvals`): body `{ decision: "approve" | "reject", reason }`. Approval activates the requested paid membership or schedules the requested plan change; rejection requires a reason.
- `GET /api/admin/payments/review` (`approvals`): payment-attention events with their administrator review state.
- `POST /api/admin/payments/:reference/review` (`approvals`): body `{ decision: "confirmed" | "rejected" | "reviewed", note }`. This records the administrator's business review but never changes provider settlement or fabricates a payment.

Paid subscription activation and paid plan changes are now approval-gated. A member can request them in the phone app, but the membership does not activate and the charge is not taken until the Admin approval is recorded.

### Payments needing attention (owner only, permission `payments`)
- `GET /api/admin/payments/attention`: read only. Query `staleMinutes`, `limit`, `offset`. Lists paid-after-cancellation, unmatched, mismatched and unfinished payment events.

### Operations (owner only, permission `operations`)
- `GET /api/admin/operations/summary`: read only. `{ generatedAt, summary }`.
- `GET /api/admin/operations/events`: read only. Query `severity` (`info`, `warning`, `error`, `critical`), `limit` (1 to 100), `offset`. Reply `{ events[], limit, offset, severity }`.
- `GET /api/admin/operations/diagnostics`: read only. `{ generatedAt, diagnostics }`.

### Launch readiness and recovery (owner only, permission `launch`)
- `GET /api/admin/launch-readiness`: read only. Never shows secret values.
- `GET /api/admin/recovery-status`: read only. Database health and backup freshness, file base names only. 503 `{ ok: false, error }` if unavailable.

### Fitness gyms (owner, or Administrative Director: `fitness_gyms` to read, `fitness_gyms_write` to review)
- `GET /api/fitness/admin/gyms`: gyms waiting for review, oldest first, 200 at most: `{ gyms[] }` with `id, name, city, address, websiteOrSocial, status, createdAt`.
- `POST /api/fitness/admin/gyms/:id/review`: body `{ status: "approved" | "rejected" }`. 404 if it is not pending any more. Reply `{ reviewed, status }`.

### Leisure operations (owner, or Administrative Director: permission `leisure_ops`)
- `GET /api/leisure/admin/operations`: read only. `{ generatedAt, kitchen[], yaayzTickets[], fitnessGyms[] }`, each a list of `{ status, count }`.

### Kitchen Hub shops and log (owner, or Administrative Director: `kitchen_hub` to read, `kitchen_hub_decide` to decide)
- `GET /api/leisure/kitchen/hub/admin/applications`: query `status` (`pending` default, `approved`, `rejected`, `suspended`). Reply `{ applications[], counts }`. Each application has the shop's public fields plus `reviewNote` and `details` (contact, business, ID type and number, tax number, pay-to details). `counts` is the number of shops in each status. No paging; the list is oldest first.
- `POST /api/leisure/kitchen/hub/admin/shops/:id/decision`: body `{ decision: "approve" | "reject" | "suspend", note }`. A note is required for reject and suspend, and the shop owner is told. 400 for the Iceland core shop (cannot be rejected or suspended), 404 if the shop is gone. Reply `{ ok, status }`.
- `GET /api/leisure/kitchen/hub/admin/audit`: newest 100 entries `{ id, shopId, orderId, actorId, action, note, createdAt, shopName, actorName }`.

## Rules the admin app should follow

- Show the minimum personal data needed for each decision.
- Always ask for a reason before a rejection or a suspension.
- Treat 403 as "this person may not do that", 404 as "already gone" and 409 as "already decided", and show the server's message.
- Keep the admin list small. The owner list lives on the server, not in the admin app.

## Not available yet

- Identity documents and photos for verification (the first version takes written details only; this needs a storage and privacy decision).
- Lifestyle video.

### Central content moderation (owner only)
- `GET /api/admin/moderation/reports` (`violations`): query `kind` (`all`, `yaayz_post`, `chase_account`), `limit`, `offset`; returns open Yaayz post and Chase account reports.
- `POST /api/admin/moderation/reports/:id/action` (`violations`): body `{ action: "dismiss" | "remove" | "account", reason }`. Yaayz posts can be removed; Chase account reports can close the reported account; dismiss closes the report without a strike. Confirmed actions create moderation feedback and strike tracking.

### Central violations and platform removal (owner only)
- `GET /api/admin/violations` (`violations`): central examination queue for open user and vendor/marketplace reports. Query `kind` (`all`, `users`, `vendors`), `limit`, `offset`.
- `POST /api/admin/violations/:id/resolve` (`violations`): body `{ status, reason }`. User reports accept `actioned`, `dismissed` or `under_review`; marketplace/vendor reports accept `reviewed` or `dismissed`. Every examination is audited.
- `DELETE /api/admin/users/:id` (`users_remove`), body `{ "reason": "3 to 300 characters" }` recorded in the audit log: permanently removes the member from active NEXA identity by invoking the existing account-closure integrity path. Financial/transaction evidence that must legally or operationally remain is retained/redacted; credentials and personal workspace access are revoked. You cannot remove yourself or another admin.
- `DELETE /api/admin/vendors/:id` (`vendors_remove`), body `{ "reason": "3 to 300 characters" }` recorded in the audit log: removes the vendor from the active platform, expires active vendor entitlement and cancels pending vendor subscription payments. The owner account itself remains unless separately removed.

### Marketplace dispute moderation
The Admin Mall dispute queue is the authoritative buyer/seller moderator surface. Sellers may respond through the vendor app, buyers may confirm a seller response, and Admin may resolve an open or pending dispute. An Admin resolution is written to the canonical dispute record and notifies the buyer and seller. The Admin web queue labels the seller's response separately from the final Admin outcome.

### Product upload moderation policy
Vendor product creation and product-image uploads do **not** require manual Admin approval. The server runs AI product moderation before accepting new listing content or a new gallery image. A rejected AI decision prevents the content from being published; an unavailable AI moderation service fails closed with a temporary-unavailable response. Admin retains takedown authority after publication.

### App linkage
The phone app and Admin web app use the same NEXA server/API and database. The Admin web shell provides an **Open NEXA** link, and the signed-in Admin surface in the phone app provides an **Open NEXA Admin** link using the same configured API base. There is no second commerce/payment database to reconcile between the two apps.

### B340 Admin Staff Command Center
- Permission: `staff_work` (owner-only Admin staff/work management).
- `GET /api/admin/staff` — owner-only Staff roster and capabilities.
- `POST /api/admin/staff` — owner-only create/activate Staff.
- `POST /api/admin/staff/:userId/deactivate` — owner-only Staff deactivation.
- `GET /api/admin/staff/work` — owner-only Staff workload queue; supports status, priority and capability filters.
- `POST /api/admin/staff/work` — owner-only work creation.
- `POST /api/admin/staff/work/:id/assign` — owner-only single assignment.
- `POST /api/admin/staff/work/bulk-assign` — owner-only batch assignment.
- `POST /api/admin/staff/work/:id/reclaim` — owner-only reclaim of active delegated work.
- `POST /api/admin/staff/work/:id/resolve` — owner-only final resolution of delegated work.
- Staff self-service routes remain Staff-only and are not part of the Admin web owner surface.

- `POST /api/admin/ai/assist` — authenticated Admin or active assigned Staff Admin AI recommendation/evidence assistance; Staff requests require an assigned work item.

### AI Training & Lifecycle (owner only, permission `admins`)
- `GET /api/admin/ai/profiles` — current promoted profile plus recent training jobs for `consumer_dami` and `admin_operations`.
- `POST /api/admin/ai/training/prepare` — validates the approved synthetic dataset, creates a provider-neutral training package record and returns its SHA-256 package hash. Body `{ profileId, provider?, baseModel? }`.
- `GET /api/admin/ai/training/:id` — read one training job, including state, candidate and persisted evaluation metadata.
- `POST /api/admin/ai/training/:id/state` — owner-only bounded job-state transition. Body `{ state, candidateModel? }`.
- `POST /api/admin/ai/training/:id/evaluation` — records a passing candidate evaluation and moves the job to `succeeded`; it cannot accept a failed evaluation as a completed candidate.
- `POST /api/admin/ai/profiles/:profileId/promote` — promotes only a succeeded job for the same profile and retains the previous promoted model as rollback target. Body `{ jobId }`.
- `POST /api/admin/ai/profiles/:profileId/rollback` — restores the previous promoted model for that profile.
- `GET /api/admin/ai/learning/state` — owner-only adaptive learning state for the signed-in Admin Operations context.
- `GET /api/admin/ai/learning/export` — owner-only export of the signed-in Admin Operations adaptive-learning state.
- `POST /api/admin/ai/learning/learn` — owner-only explicit operational lesson capture; body `{ lesson, activity? , outcome? }`.
- `POST /api/admin/ai/learning/feedback` — owner-only learning feedback; body `{ memoryId, signal: "confirm"|"correct"|"forget", note? }`.
- `POST /api/admin/ai/learning/reset` — owner-only reset of the current Admin Operations adaptive learning state.
- `POST /api/admin/ai/learning/prune` — owner-only stale-learning cleanup for the signed-in Admin Operations context.
- `POST /api/admin/ai/learning/pause` — owner-only pause/resume of implicit Admin Operations adaptive learning; explicit teaching remains available.
- `POST /api/admin/ai/learning/topic/forget` — owner-only forget of active adaptive memories and pending follow-ups for a topic; body `{ topicKey }`.
- `POST /api/admin/ai/learning/followups/:id/complete` — owner-only completion of the signed-in Admin Operations follow-up.
- `POST /api/admin/ai/learning/followups/:id/cancel` — owner-only cancellation of the signed-in Admin Operations follow-up.

Training-package preparation is provider-neutral and does not submit an external training job. Live provider execution remains an explicitly separate integration step.

### Admin Operations Dami Knowledge & Workflow Governance (owner-only)
- `GET /api/admin/dami/knowledge` — list the authenticated owner's Admin Operations documents.
- `POST /api/admin/dami/knowledge` — store a bounded plain-text/Markdown/JSON document; body `{ title, content, type? }`. Content is untrusted data and is never an authorization source.
- `GET /api/admin/dami/knowledge/search` — bounded owner-scoped retrieval with document/chunk citations and provenance; pass the search phrase in the `q` query parameter.
- `DELETE /api/admin/dami/knowledge/:id` — delete an owner-owned source and clear its chunks so it cannot be retrieved again.
- `GET /api/admin/dami/workflows` — list owner-scoped Admin Operations workflows.
- `POST /api/admin/dami/workflows` — create a recommendation-only workflow draft; body `{ title, steps: [{ title }] }`.
- `POST /api/admin/dami/workflows/:id/transition` — request a validated lifecycle transition; body `{ to, reason? }`. Approval authority is checked server-side and terminal states cannot be reopened.
- `POST /api/admin/dami/workflows/:id/receipt` — write an idempotent recommendation receipt. It does not execute an action.
- `GET /api/admin/dami/workflows/:id/audit` — read the authenticated owner's bounded workflow audit history.
- These routes require the Admin `operations` permission (owner role). They never access consumer-owned Main knowledge, execute external actions, or change Main-owned records. External connectors remain disabled until separately verified and authorized.

### Consumer Dami adaptive learning
- `GET /api/ai/learning/state` — authenticated Dami adaptive-learning state for the signed-in user.
- `GET /api/ai/learning/export` — authenticated owner-scoped Dami learning export.
- `POST /api/ai/learning/learn` — authenticated explicit Dami learning; body `{ lesson, activity?, topicKey?, outcome? }`.
- `POST /api/ai/learning/followups` — authenticated follow-up creation; body `{ title, reason, dueAt, memoryId? }`.
- `POST /api/ai/learning/followups/:id/complete` — authenticated owner-scoped follow-up completion.
- `POST /api/ai/learning/followups/:id/cancel` — authenticated owner-scoped follow-up cancellation.
- `POST /api/ai/learning/feedback` — authenticated owner-scoped learning feedback; body `{ memoryId, signal, note? }`.
- `POST /api/ai/learning/reset` — authenticated reset of Dami adaptive learning.
- `POST /api/ai/learning/prune` — authenticated owner-scoped stale-learning cleanup for Dami adaptive learning.
- `POST /api/ai/learning/pause` — authenticated owner-scoped pause/resume of implicit Dami adaptive learning; explicit teaching remains available.
- `POST /api/ai/learning/topic/forget` — authenticated owner-only forget of active Dami adaptive memories and pending follow-ups for a topic; body `{ topicKey }`.

- `GET /api/admin/payments/aami-economy` (`payments`): owner-authorized internal Aami accounting policy and aggregate liability report. The NGN conversion is administrative-only and must never be surfaced to consumer clients.


### Marketplace exception provenance and triage (Main-owned)
- `GET /api/admin/marketplace/operations` (`mall`): sanitized, read-only marketplace operations snapshot; timeline actors are projected as buyer/seller/unknown roles and raw actor IDs are not returned.
- `GET /api/admin/marketplace/exceptions` (`mall`): bounded, searchable Main-owned exception queue with status/category/limit/offset filters, evidence completeness and safe actor-role projections.
- `POST /api/admin/marketplace/exceptions` (`mall`): idempotent exception metadata creation; actor identity comes from authenticated server session. No order, inventory, refund, payout or provider mutation.
- `POST /api/admin/marketplace/exceptions/:id/triage` (`mall`): idempotent, expected-version-checked status transition. Terminal cases cannot be reopened; no order or financial state mutation/provider calls.
- Payout-hold lineage is not represented by a canonical source table in this schema; read models label it unavailable instead of inferring it.

## Block 20 — Extension developer endpoints (Main authority)

- `GET /api/extensions/developer/analytics` (authenticated developer): bounded 7–90 day aggregate counts from extension audit actions for the signed-in developer's own extensions. No user content, credentials or raw identity keys are returned.
- `GET /api/extensions/developer/reviews` and `POST /api/extensions/:id/review`: developers can inspect their own review submissions and submit a versioned review request for an extension they own. A second open submission is rejected.
- `GET /api/admin/extensions/reviews` and `POST /api/admin/extensions/reviews/:id/decision`: configured Main owners can inspect the review queue and make bounded review decisions. Approved/rejected decisions are terminal and audited. Admin app does not mutate these records; Main remains authoritative.

## Block 20 — Platform search and extension developer readiness

- `GET /api/search` (authenticated, rate limited): unified keyword search across active people, accepted friends, member-owned groups, active Marketplace/Yaayz listings, user-owned Money/Dami records, Help topics and app sections. Search returns no email or private contact fields; permission/ownership filters remain applied at query time.
- `GET /api/admin/platform-readiness` (configured owner only): no-store, read-only implementation evidence for search, extensions and global readiness. Missing providers, unsafe-to-stub protocols and live certification are explicitly marked deferred.
- `GET /api/extensions/developer/analytics` (authenticated developer): aggregate counts of extension audit actions for the caller's own extensions over a bounded 7–90 day window.
- `GET /api/extensions/developer/reviews` and `POST /api/extensions/:id/review`: list and submit versioned review requests for extensions owned by the caller; duplicate open submissions are rejected.
- `GET /api/admin/extensions/reviews` and `POST /api/admin/extensions/reviews/:id/decision` (configured owner only): review queue and terminal-safe approval/rejection decisions, with audit lineage. Admin app does not mutate Main-owned extension records.
