# Phase 7 readiness report

> **Historical status snapshot:** The GitHub/PR paragraph below was checked at **2026-11-15 20:30 CET**. PRs #50–#59 have since merged; retain the paragraph as dated evidence, not live status. See [PROJECT_CURRENT_STATUS.md](./PROJECT_CURRENT_STATUS.md) and [PHASE_9_COMPLETION_REPORT.md](./PHASE_9_COMPLETION_REPORT.md) for the current state.

**Snapshot status refreshed:** 2026-11-15 20:30 CET. PRs #47–#49 are merged; PRs [#50](https://github.com/Xonni-star/SecurityOps-2.0/pull/50)–[#58](https://github.com/Xonni-star/SecurityOps-2.0/pull/58) are open against `main`. Hosted CI passed 7/7 for every PR #50–#58. PR #56's earlier Backend/DMS failures, #57's earlier Restore failure, and #58's pending checks are superseded by passing runs; #58's local full-Jest results remain separate from hosted checks. See [MAINLINE_INTEGRATION_STATUS.md](./MAINLINE_INTEGRATION_STATUS.md) for the exact main SHA and CI evidence, and [PHASE_8_COMPLETION_REPORT.md](./PHASE_8_COMPLETION_REPORT.md) for the broader PARTIAL/BLOCKED assessment.
**Phase 7 assessment date:** 2026-11-15
**Original base branch and commit:** `main` at `98554b7e20786d86f5447dccac42857ac5db355f`
**Implementation commit:** `01b0741376d5234cdb5395936477ed77c7b34c58`.
**Pull request:** [#47](https://github.com/Xonni-star/SecurityOps-2.0/pull/47) is merged; merge commit `9971567af1395aed267aaf19264c1112accad596`.
**Final hosted PR CI:** Run [43726242269](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43726242269) passed **7/7 jobs** on merged PR head `1ef6836c389a0cde8f2eedb9599417c33fd7bcd7`. Current-main CI and release-artifact checks subsequently passed on `d06c2d835270b43bd36bb3585fc45d7da7d58a50` (see the mainline report).
**Production status:** Not approved. PR merge and passing CI do not establish production readiness.

## Executive assessment

This increment adds a distinct, server-enforced system tenant-management surface for listing, creating, editing, activating, and soft-deactivating tenant registry entries. It is not tenant switching and does not manage tenant users, memberships, roles, or permissions. A database-backed regression test also closes a site-scoped user-listing exposure found during the read-only review of the verified mainline.

The complete local frontend and backend suites pass, as do the targeted builds/typecheck recorded below. Hosted PR CI passed 7/7 jobs on the verified PR head recorded above. This evidence does not establish production deployment, external-provider operation, device acceptance, a production restore drill, RPO/RTO, or performance targets. Production readiness remains unconfirmed.

## Baseline before Phase 7 implementation (historical snapshot)

Before implementation, GitHub `main` and the worktree base were verified at `98554b7e20786d86f5447dccac42857ac5db355f`. PRs #45 and #46 were merged, and no open PRs were found at that point. Main CI run [43714424241](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43714424241) passed 7/7 jobs and release-artifact run [43714617237](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43714617237) passed 2/2 jobs on that earlier SHA. PR #47 was subsequently opened; an earlier CI run [43725923582](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43725923582) passed 7/7 jobs on PR head `73b553319bd38bc23a4e5f5933660443aacd4a87`, followed by final-head run [43726242269](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43726242269) on `1ef6836c389a0cde8f2eedb9599417c33fd7bcd7`. PR #47 later merged as recorded above. The release-artifact workflow is mainline-only and did not run for this PR. None of these CI/artifact results is evidence of deployment.

The local release-test environment was left untouched. Database verification used only the separately named, disposable `secops-phase7-test-postgres` PostgreSQL 16 instance on port 55073; it was stopped after testing.

## Security review and remediation

The requested read-only review of the verified mainline reported one medium-confidence finding. The site filter in `frontend/backend/src/controllers/userAdministrationController.ts:140` previously allowed `fs.site_id IS NULL`, so a user with only a tenant-wide role assignment could satisfy a site-scoped user-list query. The predicate now requires an explicit matching site assignment. A PostgreSQL regression assertion in `frontend/backend/src/tests/sync_and_roles.test.ts` verifies that the tenant-wide-only user is absent from the site-filtered result.

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟡 MEDIUM | `frontend/backend/src/controllers/userAdministrationController.ts` | 137-140 | Site-scoped user listing could include a tenant-wide-only membership because the site predicate accepted `site_id IS NULL`; fixed by requiring an exact site assignment, with a regression assertion. | 8/10 |

No other findings were reported by that review. It was a review of the specified mainline state, not a claim that every dependency, deployment environment, or production configuration has been independently audited.

A separate read-only security review of the full PR #47 diff found no additional vulnerabilities; it confirmed the site-scoped user-listing issue described above was already fixed and covered by the regression assertion.

## Implemented scope

| Area | Phase 7 change / current behavior | Verification and limits |
|---|---|---|
| System tenant administration | Added authenticated system routes to list, create, update, activate, and soft-deactivate tenant metadata; added a separate administration screen and navigation entry. | Controller tests, API integration tests, and UI tests pass. No hard deletion or tenant-data cascade is provided. |
| Authorization boundary | Both route middleware and controller require the authenticated account's `users.is_superadmin` flag. Tenant roles and permissions do not grant system tenant administration. | API denial tests cover non-system-admin requests. System-admin status does not bypass ordinary tenant permissions. |
| Tenant isolation | Global tenant-registry operations use the existing system transaction. Audit entries are written in the affected tenant context. Ordinary business APIs remain bound to the tenant in the authenticated session. | PostgreSQL integration coverage verifies tenant creation/update and audit behavior; full production isolation has not been operationally certified. |
| Tenant switching | The header displays the session's tenant rather than a client-side tenant selector. | There is no session-switch endpoint in this change. A future switch must validate tenant membership server-side. |
| Tenant users and roles | Existing tenant-scoped user/role administration remains separate. | This increment does not create memberships, roles, or tenant users. |
| Offline synchronization | No offline protocol or outbox behavior was changed. | Existing offline/sync tests ran as part of the complete backend suite; no new offline-specific acceptance evidence is claimed. |
| Other operational modules | Alarm, sync authorization, authentication/site scope, and tenant-admin tests ran in the full backend suite. | No new device, external-provider, or end-to-end operational workflow acceptance was performed. |

### Permission matrix

| Principal | List/create/edit/deactivate tenants | Tenant-scoped user/role operations | Ordinary business resources |
|---|---:|---|---|
| System administrator (`is_superadmin=true`) | Allowed by system routes | Still subject to the ordinary tenant-scoped permissions and authenticated tenant context | Still subject to the ordinary tenant-scoped permissions and authenticated tenant context |
| Tenant administrator / role with `users:manage`, `roles:manage`, or `roles:delegate_admin` | Denied | Allowed only as defined by existing tenant-scoped authorization | Allowed only as defined by existing resource authorization |
| Ordinary tenant user | Denied | Denied unless separately granted by existing policy | Allowed only as defined by existing resource authorization |
| Unauthenticated caller | Denied by authentication middleware | Denied | Denied |

### Changed-file inventory

- Status and evidence documentation: `README.md`, `PHASE_6_IMPLEMENTATION_REPORT.md`, `MAINLINE_INTEGRATION_STATUS.md`; added `PHASE_7_READINESS_REPORT.md`.
- Tenant administration API and identity/authentication: `frontend/backend/src/app.ts`, `frontend/backend/src/controllers/authController.ts`, `frontend/backend/src/controllers/tenantAdministrationController.ts`, `frontend/backend/src/controllers/userAdministrationController.ts`, `frontend/backend/src/middleware/auth.ts`.
- Backend tests: `frontend/backend/src/tests/alarmWorkflowController.test.ts`, `frontend/backend/src/tests/auth_site_scope.test.ts`, `frontend/backend/src/tests/syncAuthorization.test.ts`, `frontend/backend/src/tests/sync_and_roles.test.ts`, `frontend/backend/src/tests/tenantAdministration.integration.test.ts`, `frontend/backend/src/tests/tenantAdministrationController.test.ts`.
- UI and API documentation: `frontend/App.tsx`, `frontend/components/Navbar.tsx`, `frontend/components/Sidebar.tsx`, `frontend/components/TenantAdministration.tsx`, `frontend/store.ts`, `frontend/tests/NavbarAccessibility.test.tsx`, `frontend/tests/TenantAdministration.test.tsx`, `frontend/TENANT_ADMINISTRATION_API.md`.

No database migration, dependency-manifest change, or lockfile change was required.

## Local verification

| Check | Result | Evidence boundary |
|---|---|---|
| Full frontend Vitest suite | **21/21 files, 131/131 tests passed** | Local test run on this worktree. Vite emitted an existing `__dirname` config-loader warning. |
| Full backend Jest suite | **31/31 suites, 297/297 tests passed** | Local run with test-only environment values against isolated PostgreSQL 16. Expected negative-path API error logging appeared in test output. |
| Frontend typecheck and production build | Passed | Local checks performed on this worktree before the final full-suite run. |
| Backend TypeScript build | Passed | Local check performed on this worktree before the final full-suite run. |
| PostgreSQL migration and seed | **37 migrations and seed completed** | Disposable, isolated test database only. |
| `git diff --check` | Passed | No whitespace errors detected in the worktree diff at report preparation. |
| Hosted CI for this Phase 7 PR | **7/7 jobs passed**, final-head run [43726242269](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43726242269) | Exact merged PR head `1ef6836c389a0cde8f2eedb9599417c33fd7bcd7`; includes backend/PostgreSQL, frontend, DMS, ClamAV, restore, root checks, and production Docker configuration/image builds. |
| Local production-service validation | No production services were started or modified | Docker validation ran in GitHub-hosted CI; this local increment changed no container/deployment configuration. |

## Readiness evidence and gaps

| Gate | Phase 7 evidence | Assessment |
|---|---|---|
| Code and automated tests | Local builds/typecheck and complete local frontend/backend suites pass. PR CI run [43725923582](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43725923582) passed 7/7 jobs on `73b553319bd38bc23a4e5f5933660443aacd4a87`. | Implemented and locally/hosted-CI verified; not a production-readiness claim. |
| Database and audit integration | Tenant API integration tests use isolated PostgreSQL and verify audit behavior. | Isolated test evidence only. |
| Offline behavior | No offline implementation changes; existing tests are included in the backend run. | No new offline acceptance claim. |
| External providers | No Phase 7 tests against production or external provider accounts/services. | Unverified. |
| Devices, browsers, and customer acceptance | No field-device matrix, customer acceptance, or production browser/device exercise was performed. | Unverified. |
| Backup/restore | No Phase 7 production backup/restore drill. Previously documented isolated CI restore results apply only to their stated commits and test scope. | Production restore unverified. |
| RPO/RTO | No measured or approved recovery-point or recovery-time evidence was produced for this increment. | Unverified. |
| Performance and capacity | No Phase 7 load, latency, or capacity benchmark was run. | Unverified. |
| Legal/compliance and certification | The DIN 77200 field is labeled as an operator-provided indication; this change does not verify certification or establish compliance. | Unverified. |
| Deployment and stable release | PR #47 was merged after its assessment; no production deployment or stable production release is established by the merge or CI evidence. | Not approved. |

## Remaining work / release gates

PR #47 review and merge are complete. Remaining production gates:

1. Obtain and document the required device/browser and customer acceptance evidence.
2. Validate external-provider setup and operation without inferring success from local integration tests.
3. Perform and document an isolated, full-scope restore drill, then establish measured and approved RPO/RTO targets.
4. Run representative performance/capacity tests and compare measured results with explicit acceptance thresholds.
5. Review, merge, and verify the separate documents permission-scope correction; the cross-site customer-document exposure remains unremediated on `main`.
6. Complete operational, security, and legal/compliance review before any production-readiness decision.

Passing local or hosted automation is not a substitute for these production gates.

## Separate worktree audit evidence (not merged)

Follow-up offline field-test, backup/restore, performance-baseline, documents permission-scope, mobile usability, E2E/API, Linux test-installer, and dependency-advisory results were reported from other worktrees after this Phase 7 assessment. They are not part of PR #47 or current `main` and must not be presented as shipped behavior:

| Separate branch/worktree | Reported evidence | Limitation |
|---|---|---|
| Offline field test | 24 frontend test files / 140 tests passed; typecheck and production build passed. A branch-local change avoids falsely reporting photo sync. | Photos have no upload/replay path and are not synchronized. IndexedDB/jsdom simulation only; no real browser, device, or backend conditions. Fix remains unmerged. |
| Backup/restore drill | Practical PostgreSQL+DMS snapshot/restore passed with SHA-256 object checks and a post-restore health smoke check. | Separate and unmerged; no ClamAV or real-provider validation and no measured RPO/RTO. Not a production restore drill. |
| Performance baseline / PR #53 | Open PR #53 at head `67c048fa11ae169f7be70b128df75a8fb2779e2e`: customer list p50/p95/p99 **116.833/198.906/201.681 ms**, 27.42 req/s; customer sync create **80.700/130.542/132.600 ms**, 51.56 req/s; SOP assignment **99.860/108.203/133.152 ms**, 40.03 req/s. An earlier same-shape worktree run had materially higher p50 values **210.979/102.074/174.410 ms**, demonstrating variability. | Unmerged PR. 5 warmups, 50 measured requests/workflow, max 4 parallel, 10s timeout, 0 errors; PostgreSQL 16 capped at 1 CPU/1 GiB, API on macOS/Node 26.7 without process limits. No resource-peak data; not a production capacity claim. CI [43751041486](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43751041486) passed 7/7. |
| Documents permission-scope correction / PR #57 | Confirmed finding: site-scoped `documents:read` exposed customer-linked documents across sites. Open PR #57 at current head `4af714b664ac0ba0d30869a8f76a9170e604b001` contains migration `frontend/backend/src/migrations/040_customer_document_tenant_scope.sql`, which requires tenant-wide scope for customer relationships. The bypass reproduces through migration 039 and is denied with 040. RLS and documents read/download route coverage exercises `TENANT` / `SITE` / `OWN`; backend build, `auth_site_scope.test.ts` (14/14), targeted migrations/RLS (4/4), diff checks, and updated full restore test passed in the branch. | PR #57 is open/unmerged. The fix is not on `main`, where the finding remains. Hosted CI [43752115003](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43752115003) passed 7/7, including Backend, DMS, and Restore. The earlier restore failure was on a previous head and is superseded. |
| Mobile usability worktree / PR #51 | PR #51 open at head `39cbcd10afb877cdd704f39aca00ec1f96985160`; 24 frontend files / 137 tests, typecheck and build passed. Reported improvements: 80px bottom-nav content clearance, labeled shift-swap modal with focus management/trapping/restoration and Escape handling, and 44px controls. | Hosted CI run [43750953557](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43750953557) passed 7/7, but PR is still unmerged. Browser preview reached only login due to no authenticated backend session; authenticated visual verification remains incomplete. |
| Offline browser worktree / PR #52 | PR #52 open at head `9dddf9e5a4c4ca2cbd0cfee7e924a30d3d7eefd1`; Playwright/Chromium loopback scenario passed for offline guardbook capture, reload persistence of outbox/photo, reconnect, and retry after a deliberately lost receipt. Three focused Vitest files / 48 tests, typecheck and build passed. | Hosted CI run [43750985353](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43750985353) passed 7/7, but PR is still unmerged. The fixture is not the application backend or production. Photos remain unsynced because the DMS API lacks idempotency/retry lookup; real device/backend acceptance incomplete. |
| CORS error handling / PR #54 | Open PR #54 at head `d3d7fe3e48f80aea2284664e0224675a60cad153` returns a generic `403` for disallowed origins and omits `Access-Control-Allow-Origin`; backend build and focused tests passed locally. | Hosted CI [43751167295](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43751167295) passed 7/7; the full local CORS test file required unavailable PostgreSQL. Not merged. |
| E2E/API tenant selection / PR #55 | Open PR #55 at head `f9f1fa05e13361e1ee52805515a13cf06b0e15e6` preserves `availableTenants` and submits explicit `requestedTenantId` for ambiguous login; single-tenant behavior unchanged. PR-specific validation: three focused test files / 47 tests, frontend 24 files / 139 tests, typecheck/build, backend 31 suites / 297 tests on isolated PostgreSQL. The separate workstream reported a full workflow through scheduling, SOP, alarm/logbook/handover/task, patrol and DMS, plus isolated MinIO/ClamAV checks. | CI [43751274599](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43751274599) passed 7/7. No production data/services or browser/device acceptance; not merged or deployed. |
| Linux test installer / PR #56 | Open PR #56 at head `27e9caaa4bf51ff3cc747818b2754e52cbce8404` adds test-only Compose tar/deb installers, guarded bootstrap, `.env` mode 0600, isolated PostgreSQL/Redis/MinIO/ClamAV, lifecycle scripts and runbook/screenshots. The earlier 429s were account lockout from stale hard-coded test credentials, not global rate limiting. Backend and DMS integration logins now use `SECOPS_DEMO_USER_PASSWORD`; DMS CI sets a test-only password and Jest keeps the locally exported value. Focused PostgreSQL API integration (23/23), DMS PostgreSQL/MinIO/ClamAV flow, backend build and hosted CI passed. | CI [43752256912](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43752256912) passed 7/7. A local full Jest run had one unrelated patrol timeout at 5s; hosted backend suite passes. No production rate limits were weakened and no tests removed. Installer remains test-only, not production-ready. |
| Development dependency advisory / PR #58 | Open PR #58 at head `b3099483938fe9045659af35816e5fbf7b7308f8` adds a backend development-only npm override to `deepmerge@4.1.1`. GHSA-gcqx-w48m-w2h4 affects versions >=4.2.0 through 4.3.1 and has no patched upstream release; 4.1.1 is outside that affected range. Branch-local `npm audit`, `npm audit --omit=dev`, backend build, and focused `migrationParser` tests (22 tests) passed. | PR #58 is open/unmerged. The local full Jest run reported 10 failing suites / 171 tests, including integration tests requiring unavailable local PostgreSQL and CORS expectation failures; hosted CI [43752479801](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43752479801) passed 7/7. Local results are distinct from hosted checks; the override is not in `main`. |

The offline workstream has now demonstrated a Playwright/Chromium scenario against a loopback fixture in open PR #52. Authenticated application-backend and device acceptance remain incomplete; the Browser canvas has no offline/network toggle and no local backend test database is configured. Photos are retained locally but remain unsynced because upload/replay is not implemented. These reports do not change the production-readiness decision. Branch names and SHAs were not consistently supplied, so this report does not associate separate worktree results with `main`.
