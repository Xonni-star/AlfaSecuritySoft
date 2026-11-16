# Focused security review — SecurityOps 2.0

**Review date:** 2026-11-16

**Latest bounded checks:** Static reviews at `0aec6191f30d75d5596c779d246e0b87997c8794`
of FNL014–018 resource/sync changes and existing GuardBook access confirmed no
remaining exploit in those scopes. No live endpoint/RLS checks or full SITE/OWN
coverage were established. Exact CI 43945975019 on that SHA passed 7/7;
downloaded logs confirm 320/546/9 and cleanup. Subsequent FNL-019 is functional
work, not an additional confirmed vulnerability: real identity-bound local
notifications, truthful disconnected-preference labels, late conflict/patrol
guards and owner-filtered patrol lookup. Locally 331 frontend tests, typecheck/
build and nine actual browser cases with cleanup passed; new hosted evidence
remains separate. Session-local notifications are not a server delivery/audit log.
FNL-019 is now hosted-verified at `ab961c92e45ad4bc4b0bb53dfb19918393c99ff9`,
CI 43949055729 7/7, downloaded logs 331/546/9 plus cleanup.
Subsequent FNL-020 implements durable GuardBook completion and actual revisions;
targeted frontend 155/155, PostgreSQL sync 36/36, typecheck/both builds and real
browser 9/9 with cleanup passed. Final local full attempts are not fully green;
new exact hosted validation remains open. This is not a new comprehensive
security review. Bounded local restore review found cross-owner patrol progress/
handover metadata contamination (FNL-021), not a confirmed private-payload leak
or cross-owner server mutation.
The preceding FNL-020 hosted gap is now closed: exact CI 43958520111 on
`e3d6f9bd914a3840986d96fc676c3f4997fded49` passed 7/7; read logs
340 frontend/549 backend/9 actual browser plus cleanup. Subsequent FNL-021
implements owner-bound local restore, before-paint clearing and stale-storage
guards. Eight new component cases (six originally failing), combined targeted
171/171 and typecheck/build passed. Its exact CI 43960314043 on
`a7af0bcc352f9274b02b7be19c9befeb598a0d05` now passed 7/7; read logs
348 frontend/549 backend/9 actual browser and cleanup.
FNL-022–028 now passed exact CI43972242288 on
`5ee9f36665616178c331e9c53526b1e35396b7bd`, **7/7**;
read logs **378 frontend/553 backend/10 genuine browser journeys** plus cleanup.
This covers actual account-linked confirmation, current document metadata and
per-mutation replay evidence; prior failed runs remain historical failures.
FNL-027 corrects eight reproduced late-write/create draft-loss and
owner-activation ABA cases; FNL-028 corrects two premature sync-refresh lock
releases. Both passed the complete hosted verification above. Device revocation
and delta pull are explicitly absent from the active stack, not verified
security features. This is functional evidence, not a new exploit
finding or security review. Local Docker remains unavailable.
No new comprehensive security, device or full role/object acceptance is claimed.
**Scope:** PR #66 changes, browser-based report CSV export, local legacy-attachment recovery, backend authorization boundaries, PostgreSQL tenant/RLS context, authentication/session handling, and web security configuration. This is not a comprehensive security audit, penetration test, or certification.

**Finalization evidence update, not a new comprehensive security review:**
FNL-016 `8f7b71dc6b6ee769094e5a5774f3fbd62653241e` passed exact
[CI 43942074079](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43942074079),
7/7 jobs; downloaded logs verify frontend 270, backend 546 in 35 suites,
real browser 9 and cleanup. This includes genuine employee calendar/proof/
absence and customer contract/site metadata persistence, preserved omitted SLA
and removal of fabricated audit/acceptance displays. Generic automation remains
local drafts without an engine. Subsequent FNL-017 locally passes frontend 308,
typecheck/build and browser 9 with actual archive/reload/restore coverage.
Five lifecycle actions now explicitly confirm API/durable queue success, never
reinterpret an API denial as offline success, report local-storage failures and
suppress old-context completions/errors. Backend sources remain unchanged.
These are functional/data-integrity corrections, not additional security findings
or complete role coverage. Exact newer hosted verification remains separate.
FNL-017 is now hosted-verified as `c4fbb7a3e9c1d82c89611ba9281dfe627af77449`,
CI 43943801543 7/7, logs 308/546/9 with cleanup. Subsequent FNL-018 locally passes
frontend 320, typecheck/build and browser 9: delayed attachment/snapshot and
conflict/storage responses remain identity/dialog-bound, and storage failure
returns an explicit error. These are additional functional regression results,
not an extension of the earlier bounded security review's coverage.
The bounded review reported no confirmed new vulnerability and supplied no
complete coverage matrix. Current revision boundaries and remaining internal/
external gates are in [current status](./PROJECT_CURRENT_STATUS.md) and
[final security report](./FINAL_SECURITY_AUDIT.md). Lower historical test totals
below remain evidence only for their original review snapshots.

**Earlier Phase 11 review snapshot:** A bounded read-only review of remaining offline/file/production boundaries confirmed no new vulnerability. Its then-current evidence included 534 backend tests, the 215-route unauthenticated matrix, a 041→042 checksum-preserving upgrade, mid-DDL restore rollback, backup failure/freshness healthchecks and real authenticated Chromium/PostgreSQL replay. Later regression/CI results are recorded below; they do not represent another or broader security review. GuardBook reference-ID, fixture-grant and test-archive ownership corrections are functional/test defects, not newly established exploits.

### New confirmed findings from the bounded Phase 11 review

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|

No new confirmed findings in that review scope. Previously confirmed and fixed findings remain recorded below; this does not assert absence of vulnerabilities outside the reviewed paths.

## Findings

Historical findings and their then-current dispositions follow. “Current
worktree” in these preserved entries refers to the original review snapshot,
not an unpublished fix today; current publication/CI evidence is indexed above.

| Finding | Risk | Disposition |
|---|---|---|
| **Confirmed MEDIUM (fixed in PR #66):** browser report CSV was assembled by joining raw values with delimiters and line breaks. Delimiter/newline-containing values could corrupt the export, and formula-leading text could be interpreted by spreadsheet software. | Exported-data integrity and spreadsheet formula handling. | Corrected in PR #66: fields are quoted/escaped and formula-leading text is neutralized. Six focused CSV tests and the frontend suite passed locally; hosted CI 43843645961 passed 7/7 on remote head `785e9ea`. |
| **Confirmed MEDIUM:** the prior Sync Manager recovery UI exposed ownerless attachment names, local entry IDs, and file contents to any signed-in user in the same tenant, without verifying site access (`frontend/components/SyncManagerModal.tsx`, former lines 77–105 and 445–470). | Cross-user/site disclosure of locally stored GuardBook evidence on a shared browser profile. | Fixed in the current worktree: removed the tenant-wide list, export, and discard paths; the service now returns only a boolean existence status, and the UI/sync notice expose only a generic warning. Attachments are retained locally and are neither displayed nor uploaded. Frontend regression tests and full suite passed (169/169), as did typecheck and production build. A secure, audited, owner/site-authorized recovery flow remains unavailable; this is not a complete offline-security audit. |
| **Confirmed HIGH (fixed in current worktree):** a failed `pg_restore --clean` could leave a partially changed database and the EXIT handler restarted the backend and proxy (`frontend/deploy/restore.sh`, former lines 65–76 and 98–105). | Application availability against an incomplete restore and potential inconsistent reads/writes. | Restore now uses `--single-transaction --exit-on-error`; failed restores leave services quiesced. If service startup partially succeeds but returns failure, the script attempts to stop all resume services. The isolated full backup/restore test passed both failure-path regressions and verified database state; this does not establish production restore safety or provider recovery. |
| **Confirmed MEDIUM (fixed in current worktree):** if `docker compose up` failed after partially starting resume services, the failure handler did not stop the started services (`frontend/deploy/restore.sh`, former lines 69–70 and 73–78). | A partially started backend could be reachable before service recovery is verified. | The failure handler now attempts to stop all resume services. The isolated restore test simulates a failure after the marker service starts and verifies that the service is stopped. |
| Focused backend tenant/authorization review | No actionable high-confidence bypass confirmed in the reviewed paths | Sync mutation controllers check the authenticated user's tenant permission; negative tests cover missing grants and foreign-tenant IDs. Evidence: `frontend/backend/src/controllers/clientController.ts`, `resourceController.ts`; `authorization_boundaries.integration.test.ts` and `sync_and_roles.test.ts`. This bounded review does not establish that all routes are secure. |
| Focused RLS and tenant-context review | No confirmed vulnerability in the reviewed code paths | Static review of tenant isolation, connection context, role/grant use, and report scope found no confirmed bypass. Effective privileges/policies on a deployed PostgreSQL instance and all migration/table paths were not verified. |
| Focused authentication/session/web-security review | No exploitable vulnerability confirmed in the reviewed code | Static review of authentication, session handling, and web-security configuration found no confirmed exploit. It does not establish full endpoint coverage, deployed configuration, or production acceptance. |
| Site-scoped planning reports | The four report handlers already required `planning:reports:read`, but their SQL did not explicitly constrain all report data and aggregates to site grants. RLS may independently restrict rows; a cross-site disclosure was not established in this review. | Published PR changes derive site IDs from authenticated grants and constrain work-hours/CSV, coverage, qualification and absence queries. Local scope/integration tests and the hosted backend job on `6ead55c` passed. Human review, the full role/object matrix and production acceptance remain outstanding. |

## Verification

- The new real-browser photo extension passed locally 4/4 with isolated PostgreSQL, actual private MinIO and ClamAV. It checks offline reload/other-account exclusion, real lost-upload-receipt retry with the same author/key/document, one version/upload/clean-scan audit, exact S3/download bytes, anonymous S3 403 and foreign-tenant download 404 with a positive download grant. The launcher explicitly selects S3 rather than the test-default in-memory store. A transient-state test race was fixed by gating the real retry until failed IndexedDB state was observed, not by fabricating responses or increasing budgets: photo/GuardBook/identity use 120 s, SOP retains 180 s. Hosted evidence is tracked in current status; this is additional bounded functional evidence, not a new or comprehensive security review.
- Latest complete backend run passed 546/546 tests in 35/35 suites on stock PostgreSQL 16, with explicit API/sync workflow budgets of 30 s and Patrol 60 s; no assertions were removed or application/PostgreSQL defaults changed. Two earlier complete runs passed only 535/546, predominantly integration timeouts and a dependent fixture error; RAM/JIT diagnostics did not resolve them. These failed runs remain documented, and higher functional-test budgets are not a performance correction or production acceptance.
- The published Phase 11 SHA `6ead55c73885b1b5779501c50c55c08ee01c6184` completed [CI 43906594339](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43906594339) with 5/7 jobs passing. Backend, real-browser/root, DMS, ClamAV and production Docker passed; the offline fixture and Linux restore failed. `4524f121420dd66829feafe7b7aed07aece7a338` corrects fixture read grants and private test-archive ownership. Local fixture 1/1 and full PostgreSQL/MinIO restore passed again; [correction CI 43908926864](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43908926864) passed all 7 jobs on that exact SHA. Revision boundaries are indexed in [current status](./PROJECT_CURRENT_STATUS.md); the failed first run remains failed.
- Frontend tests, typecheck, and production build passed for the identified PR revision. The current backend TypeScript build passed.
- The current report-scope PostgreSQL integration suite ran against an isolated PostgreSQL 16 database and passed 33/33 tests. This local run does not replace hosted CI or production acceptance.
- The current frontend typecheck and production build passed; the complete frontend Vitest suite passed 169/169 tests, including the ownerless-attachment privacy regression tests.
- Chromium passed locally: fixture 1/1 after its explicit read-grant correction, and 3/3 real Express/PostgreSQL cookie-/CSRF-authenticated scenarios covering offline replay, session restoration/logout, owner binding across two accounts/two tenants and four-account SOP publication/acknowledgement. The three real scenarios also passed in the hosted root job on `6ead55c`. SOP confirmation survives offline reload and retries the same mutation after a lost real response. Empty optional SOP values, missing version UUIDs and replaced GuardBook defaults were functional defects, not newly established exploits. Fixture and real-backend results remain separate evidence.
- Complete local backend suite passed 35/35 suites and 546/546 tests under the explicit integration budgets above, including the 215 protected-route unauthenticated matrix, checksum-preserving upgrade and 16 authorization-boundary cases. This is not the full authenticated role/object matrix.
- The extended authorization-boundary suite passed 16/16 both separately and in the latest full run against freshly migrated/seeded PostgreSQL 16. Four reports and CSV are exercised with report-only tenant roles, site grants, missing and removed grants, forged tenant hints and direct shift IDs. Exact aggregates and positive controls ensure denial assertions are not merely empty-fixture results. No new runtime vulnerability was established; this is additional regression evidence, not another comprehensive security review.
- The latest frontend suite passed 184/184 tests with two workers and unchanged default five-second test/hook budgets; typecheck and backend build also passed. New store/Navbar checks preserve tenant/site/own grants through hydration, surface actual API denials and display the actual session role. The real SOP-only reader performs no unauthorized base-module GETs across login/reloads. These are functional corrections, not new confirmed vulnerabilities or client-side substitutes for server authorization. Roster stale-response triggers remain positively asserted. The real browser also rejects a retained old cookie after UI logout. Backup/restore passed the isolated PostgreSQL/MinIO drill through 042, including mid-DDL rollback, partial-resume stop and backup-health failure/recovery.

## Remaining security gates

- No full route-by-route authorization audit, penetration test, DAST, or production threat-model validation was performed.
- No authenticated physical-device test or real external S3-provider restore was performed.
- Passing CI and focused negative tests do not establish legal, DIN 77200, KRITIS, or BSI conformity.
- The report-scope correction has hosted backend regression evidence, but remains subject to human review and production acceptance.
- The ownerless-attachment visibility fix is published, not merged or deployed; a secure authorized recovery flow remains absent.
- Restore failure-path hardening is published and locally regression-tested. The first hosted Linux run exposed archive ownership mismatch; matching test UID/GID preserves private mode 0600. Neither this correction nor a passing isolated CI drill establishes real-provider/production recovery.
- The authentication/session/web-security and RLS reviews were bounded static reviews; they do not establish exhaustive route coverage or deployed database/configuration behavior.

**Assessment:** **TEILWEISE BESTANDEN.** The report-scope correction passed focused PostgreSQL-backed integration tests; a full route-by-route security review, production acceptance, and comprehensive security assurance are not established.
