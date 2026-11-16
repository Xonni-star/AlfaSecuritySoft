# SecurityOps 2.0 — Current project status

**Last verified:** 2026-11-16

**Verified `main` snapshot before integration:** [`9df02aaa5ef01de78e0fe5d53be446b2037db24d`](https://github.com/Xonni-star/SecurityOps-2.0/commit/9df02aaa5ef01de78e0fe5d53be446b2037db24d)

**GitHub snapshot before integration:** [#66](https://github.com/Xonni-star/SecurityOps-2.0/pull/66) was the only open PR; PRs #50–#65 were merged, including [#62](https://github.com/Xonni-star/SecurityOps-2.0/pull/62). This document is revision-specific evidence, not live forge state; inspect the linked PR for its current integration status.

**Overall readiness:** **TEILWEISE IMPLEMENTIERT / OFFEN — not approved or verified for production.**

**Historical partial hosted evidence:** `9b79a03a4bc119e51f8f7933b3a82953715b6742`,
[CI 43966537946](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43966537946):
read logs confirm **367 frontend / 552 backend**, **9/10 browser**, cleanup,
and only **6/7 jobs**. The new handover journey passed, but its document read
returned an unchecked HTTP 500; the older incident journey failed on a fixed
two-receipt retry assumption. These are not a successful complete acceptance.
FNL-025 corrects the actual current-version SQL/nullable metadata and adds a
real API regression plus explicit browser document-response checks. FNL-026
checks every original/replayed UUID and server ID across independently due
retry batches. Local targeted UI **27/27**, controller **11/11**, typecheck
and both builds passed; the complete hosted result below closes this gap.

**Fully hosted-verified code revision:** `5ee9f36665616178c331e9c53526b1e35396b7bd`
on the existing isolated PR branch `xonni-star-phase9-docs-and-status-cleanup`.
The Phase 10/11 changes were pushed and checked before integration. No tag or
deployment is authorized; the current merge status belongs to the linked PR.
Its exact [CI 43972242288](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43972242288)
passed **7/7 jobs**; downloaded logs confirm frontend **378/378**, backend
**553/553 in 35 suites**, real browser **10/10** and owned-container cleanup.
This closes the historical FNL-022–026 hosted gaps below, including real
participant confirmation, current document metadata and per-UUID replay checks.
Subsequent FNL-027 reproduced eight write/creation-draft loss and owner-activation
A-B-A cases. Independent draft revisions and monotonic owner activations now
preserve newer drafts and pending operations; unchanged submissions still clear
normally. Its exact hosted result above closes FNL-027.
Subsequent FNL-028 reproduced two empty-cycle refresh overlaps and centralizes
mutex/Pending release in `finally`. Targeted148/148/typecheck/build and its
complete hosted execution above passed. Active protocol/device documentation now
explicitly marks device revocation and sequence-based delta pull unimplemented,
instead of claiming them from the unrelated historical backend. The old
offline scenario matrix no longer labels these absent active features passed.
This includes confirmed form writes, report grant/date/identity fixes, durable
critical-incident follow-ups, truthful audit displays and delayed local-write
identity isolation, plus FNL-013–026 below. Earlier `3b9836334690e5b5e2da9ffca518b4b9f63c81a5`
and `5ef02b3ab0b9f711025405247e711f21d3ee9811` passed their own
CI 43929519192 and 43928436875, 7/7 each.

**Published FNL-013 — IMPLEMENTIERT UND GETESTET:** Genuine
read-only API console (`/auth/me`, `/customers`, `/logbook`), actual response/error
display and identity-bound results replace fabricated API/Python/isolation checks.
Acceptance is a read-only checklist, not a local role-switch or fake release.

**Published FNL-019 — IMPLEMENTIERT UND GETESTET:** Actual runtime
notices now populate the same owner-/tenant-bound feed used by the bell and
center. Read/dismiss actions target one UUID, including simultaneous messages;
other identities' notices cannot be displayed or changed through these actions.
The center explicitly describes session-local storage, not server delivery.
Unconnected email/push/automatic-warning preferences are no longer working-looking
checkboxes. Late conflict failures are guarded. Active patrol capture checks only
the current owner's outbox and guards both lookup and durable-write completion.
Eleven original regressions failed; all **331/331 frontend tests in 36 files**,
typecheck/build and **9/9 genuine browser journeys** with cleanup now pass.
The contract journey reads/dismisses a genuine offline-customer notice and
verifies the actual bell count. Backend sources are unchanged from FNL-018.
Exact historical hosted verification is CI 43949055729.

**Published FNL-020 — IMPLEMENTIERT UND GETESTET:** GuardBook
completion now uses the durable owner-bound outbox and existing idempotent
sync UPDATE. The UI preserves rejected drafts and shows pending, not completed,
until a genuine server receipt and reload. Stage and `resolved` are updated
atomically with a real correction note; GET returns stored revisions and their
authenticated author. Initial capture no longer invents an unstored revision.
Nine new frontend cases (eight selected in the original failing run), an
additional initially failing creation assertion and three initially failing
PostgreSQL cases cover these changes. Current focused frontend **155/155**,
full affected PostgreSQL suite **36/36**, typecheck, both builds and genuine
browser **9/9** with cleanup passed. The browser loses the actual first
completion receipt and verifies one note, original description, author and
consistent terminal stage/`resolved` after identical replay and reload.

The final local full frontend attempts are **not green**: first 337/340,
then 331/340 during a temporary reduced-view fixture experiment, with Roster
timeouts and a dependent approval failure. The experiment was reverted; no
budgets or assertions were weakened. Isolated Roster approval passed, but that
does not establish the full suite. The full local backend run was intentionally
interrupted; its sync and migration suites passed, including a 534.914-second
migration suite, but no complete local 549/549 result is claimed. The separate fresh
36/36 run and final browser run cleaned up their owned containers.
The independent exact historical hosted CI 43958520111 subsequently passed all seven
jobs, including frontend 340/340, backend 549/549 and browser 9/9 with cleanup.
This closes the hosted full-suite prerequisite, without rewriting local failures
as local success. No migration was added.

**Published FNL-021 — IMPLEMENTIERT UND GETESTET:** Mobile patrol
and handover local outbox reads now require the current owner. Restored owner
state clears before paint; delayed old local reads/errors and post-cache scan
publication cannot contaminate the next identity. Missing patrol owner/tenant
produces an explicit error instead of an unscoped restore. Eight new component
cases include six originally failing cases and two additional owner-clear/
missing-owner cases. Combined targeted frontend **171/171**, typecheck and
build passed. These are controlled component/IndexedDB tests, not real-device
or full authenticated patrol/handover acceptance. Exact CI 43960314043 above
now passed 7/7, read logs frontend 348/348, backend 549/549 and browser 9/9
with cleanup; this closes its earlier hosted prerequisite.
A bounded static review established the original functional defects, not a
confirmed private-payload leak or cross-owner server mutation.

**Subsequent FNL-022 — IMPLEMENTIERT; full verification OFFEN:** Eight new
initially failing cases reproduced late handover list/detail success/errors,
old local enqueue completion/error overwriting a current owner's draft, an
uncleared private form and a render loop with actual store-style fresh getter
arrays. Private list/detail/form/filter/status state now resets before paint;
all handover write-completion paths guard their original identity. Detail
results also remain bound to the selected record, and form seeding returns
the current object when nothing changes, preventing the real getter loop.
Full local frontend **356/356 in 36 files**, typecheck and production build
passed without larger budgets or removed assertions.

A tenth genuine browser journey now exercises real handover creation, offline
reload, actual lost first server receipt, identical replay, one stored record,
authenticated creator/participants and text after reload. It has **not yet run
successfully**: the local runner stopped at an unavailable Docker Unix socket
before starting the isolated stack. No ten-case success or cleanup proof is
claimed from that failure. Exact hosted execution is required; the nine-case
hosted result above does not validate this new journey or FNL-022.
The first hosted attempt on `1a61fb3230ca9406f680c43fbcd98e1c38a55a54`,
CI 43962727353, passed six jobs but failed the new browser selector:
read logs establish frontend 356/356, backend 549/549 and browser **9/10**
with cleanup, not a complete pass. Real Chromium independently reproduces
zero exact wrapping-select label matches versus one precise prefix match,
with the actual nonempty selected value preserved. The three select-label
locators are corrected; every persistence/replay assertion and budget remains.
Another exact hosted run must establish the new journey's real behavior.
Second exact run CI43963628561 on `5f73f976a849dde8ca068e693f670ec2d2a228c8`
also passed six jobs and browser 9/10 with cleanup. Downloaded logs again
confirm frontend356/backend549. After passing the native selectors it failed
on a GuardBook-only offline banner; the new journey now waits for the genuine
shared offline status button. Full hosted acceptance is still open.

**Subsequent FNL-023 — IMPLEMENTIERT; full verification OFFEN:** Four UI cases
and two controller cases initially failed: legitimate mapped participants
without employee-list access could not confirm, while equal contact emails
displayed misleading actions. List/detail responses now expose only the
authenticated viewer's `isOutgoingAccount`/`isIncomingAccount` mapping flags.
The UI combines them with existing permission/status checks, not employee
contact addresses. The actual confirmation endpoint's tenant/account/version
authorization is unchanged; no account IDs are newly disclosed.
Targeted frontend26/backend11, typecheck and both builds passed locally.
A new real PostgreSQL/API case exercises all three viewers, differing/equal
contact email, denied employee-list access and both actual confirmations;
it has not run locally because Docker is unavailable. New exact hosted
verification is required; this is not a new exploit or complete role matrix.
Exact published CI43964650702 above now establishes frontend360/backend552,
including the genuine new PostgreSQL/API case. Its incomplete six-job result
does not establish ten passing browser journeys. The actual browser artifact
still showed the filled form and submit; a value-dependent exact textarea-label
filter invalidated the test locator. Stable heading-scoped form and exact
accessible-role fields are now independently confirmed in real Chromium.

**Subsequent FNL-024 — IMPLEMENTIERT; full verification OFFEN:** Seven new
initially failing cases reproduce same-owner stale list/detail/outbox success
and errors, including filter/selection A→B→A, plus an old write callback starting
an obsolete filter query. Independent monotonic read generations now keep only
the latest result/error; identity and current selection guards remain intact.
The current query is checked before starting a list request, so stale write
closures cannot overwrite a newer filter. Current request errors remain visible.
Full local frontend **367/367 in 36 files**, typecheck and production build
passed. Backend code is unchanged from the verified 552-case hosted run;
new exact full hosted execution, including the tenth real journey, remains open.

**Published FNL-018 — IMPLEMENTIERT UND GETESTET:** Sync
now checks identity after awaited attachment inspection and post-sync snapshots
before publishing outbox/time/notifications. Manual recovery shows explicit
storage errors rather than an apparently successful zero-count result. The UI
starts real sync immediately, releases pending controls on errors and binds
conflict/ownerless-storage responses to the original identity/dialog opening.
Twelve new regressions cover empty/nonempty outboxes, attachment/snapshot
completion, explicit storage errors, conflict races and close/reopen.
Full frontend **320/320 in 35 files**, typecheck/build and actual browser **9/9**
with cleanup passed. Exact historical hosted verification is CI 43945975019.
Separate bounded static reviews of FNL-014–018 resource/sync changes and existing
GuardBook access found no confirmed remaining vulnerability. They did not run
live endpoint/RLS checks or establish a complete SITE/OWN matrix, and do not
constitute a comprehensive security review or review of subsequent FNL-019.

**Published FNL-017 — IMPLEMENTIERT UND GETESTET:** Five
customer/site/employee archive/restore actions now return explicit confirmation,
retain their original online/offline mode and guard both successful and failed
awaits by tenant/user identity. Local storage failure does not mutate resources
or escape as an unhandled rejection. Durable offline confirmation explicitly
says server acknowledgement is outstanding. UI blocks duplicates and displays
unconfirmed writes without publishing an old session's errors. Twenty initial
cases failed before correction; 32 store and six component regressions now pass.
Full frontend **308/308 in 35 files**, typecheck/build and actual browser **9/9**
with cleanup passed. The latter now checks actual site archive revisions 3→4→5,
reload/restore and retained employee qualifications/absences after restore.
Backend sources are unchanged from the fully hosted-verified revision above.
Exact historical hosted evidence is CI 43943801543. This is functional verification,
not a new comprehensive security review.
Generic automations are explicitly non-persistent local drafts without an engine;
fake execution methods are removed. New tests: 60/60 focused, full frontend
**212/212 in 34 files**, strict typecheck, frontend/backend builds, root structure,
production Compose configuration and diff check passed. All **7/7 real browser
journeys** passed with PostgreSQL 16, private MinIO, real ClamAV and cleanup.
The new case compares UI JSON with actual GET data, checks the exact authorized
seed customer and a SOP-only reader's real HTTP 403, with no mutation request.
Two initial test assumptions were corrected: the actual singular/counted log-tab
name and the customer list's public response shape (no `tenant_id` field).
No product permission was weakened and no assertion removed. Exact hosted
verification is `3110bbb` / CI 43932552825, not inferred from its predecessor.

**Published FNL-014 — IMPLEMENTIERT UND GETESTET:** Six customer,
site and employee create/update methods now return explicit confirmation only
after API success or durable offline storage. Failures retain drafts; pending
submits are blocked and completions/errors remain identity-bound. Site creation
uses the actually displayed hydrated customer; editing never silently substitutes
another customer when the original is unavailable.
Seventeen assertions failed before correction. Focused 74/74 passed, followed by
full frontend **242/242 in 35 files** including twelve additional offline
durability/failure cases. Typecheck/build, real browser **7/7** and owned-container
cleanup passed. This is not complete resource-browser acceptance. Its exact hosted
verification is `64c9ee9` / CI 43934545176, not the preceding 3110bbb CI.

**Published FNL-015 — IMPLEMENTIERT UND GETESTET:** Four
qualification/absence actions explicitly confirm API or durable offline storage,
preserve failures and isolate delayed identities. Captured forms reset only after
confirmation; optional qualification expiry remains nullable. Partially stored
employees keep their genuine core record but explicitly report missing proofs;
unpersisted proofs are never prefilled or duplicated. Offline proof validity
remains pending genuine server confirmation.
The new real browser case exposed PostgreSQL DATE values being serialized as
shifted timestamps after reload. Employee joining/qualification/absence dates
now leave the API as calendar strings, preserving native date editing and expired
proof classification. Initial browser run: 7/8; corrected rerun: **8/8**, cleanup
confirmed. It proves real create/update, nullable expiry, genuine overlap HTTP 409,
retained failure input and persisted dates/expiry status after reload.
Full frontend **262/262 in 35 files**, typecheck, frontend/backend builds and
isolated employee-controller **6/6** passed. Full backend on fresh PostgreSQL 16
also passed **546/546 in 35 suites**. Exact hosted verification is
`fcafebd` / CI 43938567434 above; no complete employee/role acceptance claimed.

**Published FNL-016 — IMPLEMENTIERT UND GETESTET:** Customers
require explicit numbers/start/end dates and show renewal/notice controls.
Existing DB renewal/notice columns now survive API create/update/read and offline
create/update replay instead of being silently stripped. Contract calendar
strings remain native-date compatible. Site staffing, equipment, access rules
and IANA timezone are editable, preserved across changes and mapped identically
online/offline; no fictional manager, alarm model or SOP count is submitted.
Eight frontend regressions cover these paths and ordered local customer revision
increments. Strengthened genuine API cases exposed partial updates resetting
Silver SLA to the create default Gold; both normal PATCH and sync now preserve
omitted SLA. Three targeted PostgreSQL cases pass, including idempotent replay.
Full frontend **270/270 in 35 files**, typecheck/both builds and real browser
**9/9** with cleanup passed. The new journey verifies offline customer creation,
actual contract reload/update, site create/update/reload and real fixture
archival. Its first run was 8/9 due to an incorrect test-only offline-button name;
the actual accessible label was retained and both subsequent runs passed 9/9.
Final full backend on fresh PostgreSQL 16 passed **546/546 in 35 suites**,
including the strengthened contract/SLA/sync cases. Exact original hosted evidence is FNL-016 `8f7b71d` / CI 43942074079,
not FNL-015 evidence.

**Historical rejected-attachment extension (`3617576`) — IMPLEMENTIERT UND GETESTET:** The complete real
browser suite passed **5/5** locally and in the hosted root job of
[CI 43921057411](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43921057411),
which passed **7/7 jobs** on the exact code revision above. A synthetic invalid
GIF receives the real API's HTTP 415, not a fabricated error response. Original
bytes, owner, stable idempotency key and explicit upload error survive offline
reload. The same owner in another tenant does not upload it; returning to the
original tenant repeats the genuine rejection without marking it synced.
The underlying logbook entry persists exactly once, no matching DMS document
exists and actual S3 keys remain unchanged. All three owned containers were
removed. The first local test incorrectly required exactly two retries but
observed three; the corrected test checks repeated rejection and the invariant
key without assuming the automatic scheduler's exact attempt count.
The new case uses 120 seconds; other budgets are unchanged. This tests file-type
rejection before scanning, not malware quarantine, provider or device acceptance.

**Hosted CI history:** [Run 43906594339](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43906594339)
on `6ead55c73885b1b5779501c50c55c08ee01c6184` completed **5/7**:
backend, root/real browser, DMS, ClamAV and production Docker passed.
The offline fixture failed because it lacked reference-data read grants; Linux
restore failed because its root-owned private archive was unreadable to the
host runner. Both test contracts are corrected in `4524f12`: explicit fixture
grants and selected-ID checks; backup UID/GID matching the restore test user,
with ownership/readability and unchanged `0600` assertions.
Local fixture **1/1**, full PostgreSQL/MinIO restore and backup-health checks passed.
[Run 43908926864](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43908926864)
on the exact correction SHA completed **7/7 successfully**, including the
separate fixture, real-browser/root, Linux restore, backend, DMS, ClamAV and
production-Docker jobs. The failed first run is not reclassified. These are
isolated automated checks, not provider/device/production acceptance.

**Documentation-only follow-up:** `71e9c3f82f1c66735b92d27a6871305a6194d9af`
completed [CI 43910126170](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43910126170)
with **6/7** jobs passing. All three real browser tests passed, but their cleanup
checked too soon for Docker's asynchronous `--rm` removal. The runner now waits
for up to ten successful container-list checks instead of treating an immediate
inspect result as final; Docker command failures cannot count as removal.
Two fresh isolated local cycles passed **3/3 each**, including cleanup.
[Follow-up CI 43912398195](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43912398195)
passed **7/7** on `3aeebc08e30b9d34bd0e42e95f79c18693e363be`;
no application test was skipped or assertion removed.

**Photo-replay extension (`31e6372`) — historical local and hosted verification:** The real suite passed
**4/4** with isolated PostgreSQL, private MinIO and actual ClamAV. A synthetic
photo survives offline reload and another account's login without upload.
After the owner returns, the first real successful upload response is lost;
the real retry is held until IndexedDB's failed/unsynced state is observed.
Retry preserves the key and returns the same author-bound document: one version,
one upload/clean-scan audit event and one S3 object with exact original bytes.
Anonymous S3 access returns 403; a download-capable foreign-tenant session gets
404. The test-only launcher explicitly selects the existing S3 adapter because
`NODE_ENV=test` otherwise intentionally selects an in-memory store.
The new photo case uses 120 seconds; existing budgets remain unchanged
(GuardBook/identity 120 seconds, SOP 180 seconds). An earlier ungated test
observed an already completed retry and failed; it was corrected with a real
request gate, not sleeps, fake responses, skipped assertions or wider budgets.
All three owned containers were removed. [CI 43916713656](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43916713656)
passed **7/7** on `31e63726d8b377abafe564da349c3aa622468291`;
the hosted root log explicitly confirms **4/4** journeys and cleanup on Node 24.
Physical devices, representative files and a real provider remain open.

**SOP functional package (`67a1185`):** The authenticated Chromium suite passes **3/3**.
It includes account/tenant switches, owner-bound replay, session-restoring reload
and a real SOP journey using distinct author/reviewer/approver accounts and a
reader with only `sop:read`/`sop:acknowledge`. Opening does not acknowledge;
offline capture survives reload and a lost server response retries the same
mutation before clearing IndexedDB. This found and corrected empty optional
SOP values and missing version UUIDs. GuardBook selections also recover when
reference data replaces initial IDs. These three real-browser scenarios also
passed in the hosted root job of run 43906594339; its two other failing jobs
still prevented an overall green CI result.

**Earlier Phase-11 regression package:** `authorization_boundaries.integration.test.ts`
passes **16/16** against fresh migrated/seeded PostgreSQL 16: four reports and
CSV, tenant/site grants, missing/revoked grants, forged tenant hints and direct
shift IDs. Its full frontend suite passed **184/184** with two workers and
unchanged default five-second test/hook budgets. Long Roster scenarios were
separated; unconsumed one-shot mocks and a selector that refreshed the wrong
section were corrected. The new full backend run passes **546/546** in **35/35**
suites, including the 16 authorization cases, using the explicit integration
budgets described below.

**Backend regression history and budgets:** The first new full run finished with
32/35 suites and 535/546 tests passing; eleven failures were predominantly
five-second integration timeouts, one 30-second Patrol timeout and a dependent
fixture failure. Migration tests passed but took 701 seconds.
The RAM-filesystem retry also finished with 535/546 tests passing; a separate
JIT-disabled diagnostic did not resolve the failures. A new complete run uses
explicit integration budgets (30 seconds API/sync workflows, 60 seconds Patrol)
and passed **546/546** in 342 seconds on stock PostgreSQL 16, without removing
assertions or changing application/PostgreSQL defaults. The real SOP API workflow
took 12.7 seconds and the cross-module Phase 5 journey 20.5 seconds. These are
bounded functional tests, not a latency/throughput improvement or production
performance acceptance. The earlier 534/534 result remains historical.

**Reader hydration correction:** Base-module GETs now require a matching read
grant. Session restore preserves `sitePermissions` and `ownPermissions` separately
from tenant permissions, so scoped readers remain eligible. A stale grant still
surfaces a real API denial; the banner no longer mislabels every error as an
unreachable backend. Navbar displays the real session role instead of the local
demo selector. Focused store/Navbar tests passed 51/51; real Chromium passed 3/3
including zero unauthorized base GETs for the SOP-only reader and its correct
role after reload.

This is the current evidence index. Phase reports and dated status sections remain historical snapshots; they have not been rewritten to make their former state appear current. The earlier 20:59 CET entry for `879ae95` and “no open PRs” is historical, not the current GitHub state. See the [Phase 9 completion report](./PHASE_9_COMPLETION_REPORT.md) for the documentation/operations audit and remaining gates.

## Status key

- **IMPLEMENTIERT** — the capability exists in source; this does not imply complete testing.
- **IMPLEMENTIERT UND GETESTET** — the scoped capability passed the stated tests on the identified revision.
- **TEILWEISE IMPLEMENTIERT** — only part of the scope is implemented or verified.
- **IN ENTWICKLUNG** — work is active in a branch/worktree and is not yet a verified release.
- **GEPLANT** — proposed work is not implemented.
- **NICHT VERIFIZIERT** — available evidence does not establish the claim.
- **OFFEN** — an acceptance or verification remains outstanding.

## Current verified evidence

| Area | Status | Evidence and limits |
|---|---|---|
| Mainline integration | **IMPLEMENTIERT UND GETESTET** | Current `main` is `9df02aaa5ef01de78e0fe5d53be446b2037db24d` (squash merge of #62). PRs #50–#65 are merged; PR #66 is the sole open PR. |
| Mainline CI | **IMPLEMENTIERT UND GETESTET** | Post-merge [CI run 43762052960](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43762052960) passed **7/7 jobs** on the exact current-main SHA. |
| Release package validation | **TEILWEISE IMPLEMENTIERT** | Artifact run [43762359834](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43762359834) passed 2/2 on current `main`; packaging/provenance/install validation is not a deployment or production release. |
| Documentation PR validation | **IMPLEMENTIERT UND GETESTET** | PR #62 (head `6c8a52c`, hosted [CI run 43761213396](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43761213396) 7/7) is merged as `9df02aa`. |
| Published finalization CI | **IMPLEMENTIERT UND GETESTET** | Exact `3110bbbda1655e804cba35c89ccbda5174e84444` passed CI 43932552825, 7/7: frontend 212, backend 546 and seven real browser cases with cleanup. FNL-014 is separately locally verified, not covered by this earlier run. |
| Reporting UI | **IMPLEMENTIERT UND GETESTET** | PR #66's frontend uses approved actual hours, calendar ranges, and safe CSV export; its frontend checks passed for the identified revision. |
| Report site-scope correction | **IMPLEMENTIERT UND GETESTET** | All four report handlers and work-hours CSV use authenticated site grants. Local scope-helper/integration tests and the hosted backend job on `6ead55c` passed. Production acceptance and the full role/object matrix remain outstanding. |
| Prior backend validation | **IMPLEMENTIERT UND GETESTET** | On an earlier PR revision, migration and seed ran against isolated PostgreSQL 16; backend build and 34 Jest suites / 315 tests passed. These results do not cover the current report-scope change. |
| Phase 11 backend and migrations | **IMPLEMENTIERT UND GETESTET** | Latest full local backend suite: 35/35 suites, 546/546 tests, no open-handle warning. API/sync integration budget is explicitly 30 s, Patrol 60 s; no assertions removed and no application/PostgreSQL defaults changed. Earlier 5-s/30-s timeout runs are documented above, not reclassified as passing. A real 041→042 upgrade preserves earlier checksums, rejects GuardBook DELETE/core-field UPDATE and becomes a no-op on rerun. Published 001/004 remain unchanged; text correction is additive in 042. |
| Authenticated report authorization | **IMPLEMENTIERT UND GETESTET** | Extended boundary suite: 16/16, with two tenants/three sites, report-only and site grants, absent/removed permissions, CSV, exact aggregates, forged tenant hints and direct shift IDs. Existing sessions immediately lose removed report grants. No new runtime authorization defect found; other endpoint/object combinations remain open. |
| Finalization frontend and browser | **IMPLEMENTIERT UND GETESTET** | Local frontend 35 files/242 tests with two workers and unchanged standard budgets; typecheck/build and real suite 7/7 passed after resource-form fixes. Exact hosted 3110bbb has frontend 212 and browser 7; separate fixture remains distinct. No physical-device/provider, representative-file or complete identity-matrix acceptance is inferred. |
| API authentication boundary | **IMPLEMENTIERT UND GETESTET** | All 215 currently registered protected method/path pairs return 401 without a session in the local backend suite. Health, login and password-reset completion are explicit public exceptions. Full per-role/site/object matrix remains open. |
| Module/architecture inventory | **IMPLEMENTIERT** | [Module evidence matrix](./MODULE_IMPLEMENTATION_STATUS.md) identifies active UI/API/database/test paths, local-only automation/audit/acceptance views and remaining limits. npm and production Docker use Node/TypeScript; historical Python/Alembic files were not validated by these runs. Not a complete product acceptance. |
| Test-only Linux install | **IMPLEMENTIERT UND GETESTET** | PR #56 merged. The tar/deb installer and lifecycle guidance target isolated testing; they are not production installers. |
| Backup/restore | **TEILWEISE IMPLEMENTIERT** | Full local PostgreSQL/MinIO drill through 042 passed again after matching backup UID/GID to the invoking restore user; archive ownership, readability and private mode 0600 are asserted. Mid-DDL rollback, stopped services on restore/resume failure and backup-health failure/recovery remain covered. Previous hosted Linux archive-access failure and correction CI are tracked above. Health is not an integrity/restore check or external alert; real-provider restore and measured RPO/RTO remain open. |
| Offline and SOP workflows | **TEILWEISE IMPLEMENTIERT** | Ownerless-attachment disclosure UI is removed; legacy attachments stay local without authorized recovery. Seven real journeys cover critical incident/task, private photo, genuine file rejection, identity/SOP and read-only API data/denial; separate fixture remains distinct. Not a complete file/identity/device matrix. |
| Security and tenancy | **TEILWEISE IMPLEMENTIERT** | Bounded static reviews of authentication/session/web-security and tenant/RLS/report-scope paths found no confirmed bypass. Report and authorization negative tests passed on isolated PostgreSQL. Full route/migration/deployed-policy coverage, penetration testing, and production acceptance are not established. |
| Performance | **TEILWEISE IMPLEMENTIERT** | PR #53 adds a bounded local baseline; its workload does not establish production capacity, an SLA, or resource headroom. |
| Production/provider/device acceptance | **OFFEN** | No evidence establishes production deployment, real-provider behavior, customer acceptance, or physical-device acceptance. |
| Cross-workstream final sign-off | **OFFEN** | Authenticated-backend/device/provider acceptance and remaining operational gates are outstanding. Do not mark production-ready based on CI alone. |

## Merged PRs #50–#61 and #63–#65

The PR check-rollup for #50–#58, #60, #61, and #63–#65 showed all seven hosted CI jobs successful on each PR. PR #59 had no PR-level check rollup; its post-merge CI and artifact validation were recorded in the historical snapshot below. The exact current-main CI above is the post-merge evidence for the latest merged tree.

| PR | Merged change | Merge commit | Merged (UTC) |
|---|---|---|---|
| [#50](https://github.com/Xonni-star/SecurityOps-2.0/pull/50) | Verify full isolated backup restore | `41d6354` | 2026-11-15 19:36:43 |
| [#51](https://github.com/Xonni-star/SecurityOps-2.0/pull/51) | Improve mobile shift-swap usability | `1ea1c54` | 2026-11-15 19:38:47 |
| [#52](https://github.com/Xonni-star/SecurityOps-2.0/pull/52) | Exercise offline guardbook sync in Chromium | `62f9851` | 2026-11-15 19:39:00 |
| [#53](https://github.com/Xonni-star/SecurityOps-2.0/pull/53) | Add bounded local performance baseline | `87e56cf` | 2026-11-15 19:39:13 |
| [#54](https://github.com/Xonni-star/SecurityOps-2.0/pull/54) | Return 403 for disallowed CORS origins | `9774a8a` | 2026-11-15 19:39:40 |
| [#55](https://github.com/Xonni-star/SecurityOps-2.0/pull/55) | Add multi-tenant selection to login | `6a5adb4` | 2026-11-15 19:39:52 |
| [#56](https://github.com/Xonni-star/SecurityOps-2.0/pull/56) | Add isolated Phase 7 Linux test installer | `2964dc2` | 2026-11-15 19:40:04 |
| [#57](https://github.com/Xonni-star/SecurityOps-2.0/pull/57) | Fix customer-linked document RLS scope | `c8ae5ad` | 2026-11-15 19:40:16 |
| [#58](https://github.com/Xonni-star/SecurityOps-2.0/pull/58) | Fix deepmerge development advisory | `9a621c2` | 2026-11-15 19:40:29 |
| [#59](https://github.com/Xonni-star/SecurityOps-2.0/pull/59) | Refresh readiness and GitHub status docs | `879ae95` | 2026-11-15 19:45:43 |
| [#60](https://github.com/Xonni-star/SecurityOps-2.0/pull/60) | Harden planning validation and approvals | `563efd6` | 2026-11-15 20:07:22 |
| [#61](https://github.com/Xonni-star/SecurityOps-2.0/pull/61) | Improve global search keyboard accessibility | `084314e` | 2026-11-15 20:08:52 |
| [#63](https://github.com/Xonni-star/SecurityOps-2.0/pull/63) | Test Phase 9 core online workflows | `bed939a` | 2026-11-15 20:13:07 |
| [#64](https://github.com/Xonni-star/SecurityOps-2.0/pull/64) | Sync GuardBook attachments offline; add idempotent, tenant-scoped attachment receipts | `6218745` | 2026-11-15 20:54:49 |
| [#65](https://github.com/Xonni-star/SecurityOps-2.0/pull/65) | Strengthen tenant authorization boundary coverage | `cd01c48` | 2026-11-15 20:24:25 |

## Preserved historical status evidence

At the 20:59 CET check, `main` was `879ae951d6cea52fd84d01dc699cf2ed08843300`, PRs #50–#59 were merged, and no PRs were open. The then-current-main CI run 43754217295 passed 7/7 and artifact run 43754417115 passed 2/2. Those results remain valid for that historical revision; the current-main checks are listed above.

## Current documentation

- [Project completion tracker](./PROJECT_COMPLETION_TRACKER.md) — active work items, acceptance criteria, blockers, and evidence.
- [Module implementation evidence](./MODULE_IMPLEMENTATION_STATUS.md) — scoped implementation/test matrix and active architecture boundaries.
- [Phase 11 continuation report](./FINAL_PHASE_11_COMPLETION_REPORT.md) — verified local packages, failed-attempt corrections, exact revision boundaries and remaining work; not final project acceptance.
- [Phase 10 completion report](./FINAL_PHASE_10_COMPLETION_REPORT.md) — completed changes, security findings, verification, and remaining acceptance gates.
- [Phase 9 completion report](./PHASE_9_COMPLETION_REPORT.md) — operational/documentation audit, evidence boundaries, and gates.
- [Linux test installation runbook](./frontend/deploy/linux-test/README.md) — isolated, non-production installation, update, backup and restore.
- [Frontend architecture](./frontend/FRONTEND_ARCHITECTURE.md), [authentication and session security](./frontend/AUTHENTICATION_SECURITY.md), and [system overview](./frontend/SYSTEM_OVERVIEW.md) — current implementation boundaries.
- [Production deployment and recovery guide](./frontend/deploy/PRODUCTION_DEPLOYMENT.md) — Compose operations, provider boundaries, and rollback constraints.
- [Offline architecture](./frontend/OFFLINE_ARCHITECTURE.md) and [SOP API](./frontend/SOP_API.md) — workflow-specific behavior and limitations.
- [Mainline integration history](./MAINLINE_INTEGRATION_STATUS.md) and [Phase 8 report](./PHASE_8_COMPLETION_REPORT.md) — preserved dated evidence; consult this file for current GitHub state.

No PR is being merged or deployment performed as part of this status update.
