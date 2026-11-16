# Focused security review — SecurityOps 2.0

**Review date:** 2026-11-16
**Scope:** PR #66 changes, browser-based report CSV export, local legacy-attachment recovery, backend authorization boundaries, PostgreSQL tenant/RLS context, authentication/session handling, and web security configuration. This is not a comprehensive security audit, penetration test, or certification.

**Phase 11 update:** A further bounded read-only review of remaining offline/file/production boundaries confirmed no new vulnerability. New local evidence includes 534 backend tests, the 215-route unauthenticated matrix, a 041→042 checksum-preserving upgrade, mid-DDL restore rollback, backup failure/freshness healthchecks and a real authenticated Chromium/PostgreSQL offline replay. These improve regression evidence, not the breadth of an independent security audit. The GuardBook empty-reference-ID defect found by the new browser test is recorded as a functional bug, not an unproven exploit.

### New confirmed findings from the bounded Phase 11 review

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|

No new confirmed findings in that review scope. Previously confirmed and fixed findings remain recorded below; this does not assert absence of vulnerabilities outside the reviewed paths.

## Findings

| Finding | Risk | Disposition |
|---|---|---|
| **Confirmed MEDIUM (fixed in PR #66):** browser report CSV was assembled by joining raw values with delimiters and line breaks. Delimiter/newline-containing values could corrupt the export, and formula-leading text could be interpreted by spreadsheet software. | Exported-data integrity and spreadsheet formula handling. | Corrected in PR #66: fields are quoted/escaped and formula-leading text is neutralized. Six focused CSV tests and the frontend suite passed locally; hosted CI 43843645961 passed 7/7 on remote head `785e9ea`. |
| **Confirmed MEDIUM:** the prior Sync Manager recovery UI exposed ownerless attachment names, local entry IDs, and file contents to any signed-in user in the same tenant, without verifying site access (`frontend/components/SyncManagerModal.tsx`, former lines 77–105 and 445–470). | Cross-user/site disclosure of locally stored GuardBook evidence on a shared browser profile. | Fixed in the current worktree: removed the tenant-wide list, export, and discard paths; the service now returns only a boolean existence status, and the UI/sync notice expose only a generic warning. Attachments are retained locally and are neither displayed nor uploaded. Frontend regression tests and full suite passed (169/169), as did typecheck and production build. A secure, audited, owner/site-authorized recovery flow remains unavailable; this is not a complete offline-security audit. |
| **Confirmed HIGH (fixed in current worktree):** a failed `pg_restore --clean` could leave a partially changed database and the EXIT handler restarted the backend and proxy (`frontend/deploy/restore.sh`, former lines 65–76 and 98–105). | Application availability against an incomplete restore and potential inconsistent reads/writes. | Restore now uses `--single-transaction --exit-on-error`; failed restores leave services quiesced. If service startup partially succeeds but returns failure, the script attempts to stop all resume services. The isolated full backup/restore test passed both failure-path regressions and verified database state; this does not establish production restore safety or provider recovery. |
| **Confirmed MEDIUM (fixed in current worktree):** if `docker compose up` failed after partially starting resume services, the failure handler did not stop the started services (`frontend/deploy/restore.sh`, former lines 69–70 and 73–78). | A partially started backend could be reachable before service recovery is verified. | The failure handler now attempts to stop all resume services. The isolated restore test simulates a failure after the marker service starts and verifies that the service is stopped. |
| Focused backend tenant/authorization review | No actionable high-confidence bypass confirmed in the reviewed paths | Sync mutation controllers check the authenticated user's tenant permission; negative tests cover missing grants and foreign-tenant IDs. Evidence: `frontend/backend/src/controllers/clientController.ts`, `resourceController.ts`; `authorization_boundaries.integration.test.ts` and `sync_and_roles.test.ts`. This bounded review does not establish that all routes are secure. |
| Focused RLS and tenant-context review | No confirmed vulnerability in the reviewed code paths | Static review of tenant isolation, connection context, role/grant use, and report scope found no confirmed bypass. Effective privileges/policies on a deployed PostgreSQL instance and all migration/table paths were not verified. |
| Focused authentication/session/web-security review | No exploitable vulnerability confirmed in the reviewed code | Static review of authentication, session handling, and web-security configuration found no confirmed exploit. It does not establish full endpoint coverage, deployed configuration, or production acceptance. |
| Site-scoped planning reports | The four report handlers already required `planning:reports:read`, but their SQL did not explicitly constrain all report data and aggregates to site grants. RLS may independently restrict rows; a cross-site disclosure was not established in this review. | The current worktree derives site IDs from authenticated grants and applies them to work-hours (including CSV), coverage, qualification supply/demand, and absence queries. Backend TypeScript build, pure scope-helper tests, and the PostgreSQL-backed `sync_and_roles.test.ts` suite passed (33/33) against isolated PostgreSQL 16. Hosted CI and production acceptance for this worktree remain outstanding. |

## Verification

- The current remote PR #66 head `785e9eabc9e6ab5f1ce4e726fdff2cbfa49367e4` passed hosted CI run [43843645961](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43843645961), 7/7. This run predates and does not include the current worktree changes.
- Frontend tests, typecheck, and production build passed for the identified PR revision. The current backend TypeScript build passed.
- The current report-scope PostgreSQL integration suite ran against an isolated PostgreSQL 16 database and passed 33/33 tests. This local run does not replace hosted CI or production acceptance.
- The current frontend typecheck and production build passed; the complete frontend Vitest suite passed 169/169 tests, including the ownerless-attachment privacy regression tests.
- Chromium passed locally: 1/1 API fixture and 2/2 real Express/PostgreSQL cookie-/CSRF-authenticated scenarios covering offline replay, session restoration/logout and owner binding across two accounts/two tenants. CI source configures the fixture in the frontend job and the authenticated suite in the root job; no hosted result yet covers these local commits.
- Complete local backend suite passed 35/35 suites and 534/534 tests, including the 215 protected-route unauthenticated matrix and checksum-preserving upgrade. This is not the full authenticated role/object matrix.
- Subsequently the extended authorization-boundary suite passed 16/16 against freshly migrated/seeded PostgreSQL 16. Four reports and CSV are exercised with report-only tenant roles, site grants, missing and removed grants, forged tenant hints and direct shift IDs. Exact aggregates and positive controls ensure denial assertions are not merely empty-fixture results. No new runtime vulnerability was established; this is additional regression evidence, not another comprehensive security review.
- The latest frontend suite passed 175/175 tests with two workers and unchanged default five-second test/hook budgets. Long Roster scenarios were separated; one-shot mocks, duplicate select events and a selector refreshing the wrong section were corrected. Stale-response triggers are positively asserted, not assumed. The real authenticated browser also verifies that a retained old session cookie is rejected after UI logout. Backup/restore passed the full isolated PostgreSQL/MinIO drill through 042, including real mid-DDL failure/rollback, partial-resume stop and backup-health failure/recovery.

## Remaining security gates

- No full route-by-route authorization audit, penetration test, DAST, or production threat-model validation was performed.
- No authenticated physical-device test or real external S3-provider restore was performed.
- Passing CI and focused negative tests do not establish legal, DIN 77200, KRITIS, or BSI conformity.
- The current report-scope correction remains subject to fresh hosted CI, human code review, and production acceptance.
- The ownerless-attachment recovery fix is local to this worktree; no hosted CI result includes it.
- The restore failure-path hardening is local to this worktree; the passing local regression run is not hosted CI or a real provider/production restore.
- The authentication/session/web-security and RLS reviews were bounded static reviews; they do not establish exhaustive route coverage or deployed database/configuration behavior.

**Assessment:** **TEILWEISE BESTANDEN.** The report-scope correction passed focused PostgreSQL-backed integration tests; a full route-by-route security review, production acceptance, and comprehensive security assurance are not established.
