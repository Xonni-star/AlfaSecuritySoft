# Mainline integration and validation status

**Current status checked:** 2026-11-15

**Verified `main`:** `98554b7e20786d86f5447dccac42857ac5db355f`

**Current PR status:** PRs #45 and #46 are merged. Phase 7 PR [#47](https://github.com/Xonni-star/SecurityOps-2.0/pull/47) is open against `main`; hosted CI passed 7/7 jobs on `68e9ddacfa7fb9c2bc185abbd4085070c5f208dd` (run [43718982721](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43718982721)). It has not been merged or deployed.

**Production status:** In development; not approved for production.

## Latest verified mainline state

GitHub `main` and the Phase 7 worktree base point to `98554b7e20786d86f5447dccac42857ac5db355f`. PR #45 merged at `24c14ba599017d1f35e94533393c209300caf28d`; PR #46 merged at the current main commit. At the baseline check, no PRs were open; Phase 7 PR #47 was created after implementation. Main CI run [43714424241](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43714424241) completed successfully with **7/7 jobs**; release-artifact run [43714617237](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43714617237) completed successfully with **2/2 jobs**. Both runs target the exact current main SHA. Phase 7 PR CI [43718982721](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43718982721) also completed successfully with **7/7 jobs** on PR head `68e9ddacfa7fb9c2bc185abbd4085070c5f208dd`. These results establish CI/artifact checks only, not production deployment or acceptance.

The remote branch check found no additional unmerged file changes except `origin/openclaw/health-error-disclosure`, whose single ahead commit changes two CORS test assertions to align with redacted error responses. It has no associated open PR in the verified PR list and is not included here because it only adjusts a test expectation; review/merge decision remains outstanding. `origin/xonni-star-phase-2-planning-ui` is one merge commit ahead by ancestry, with no unique diff from `main`. Other checked remote branches have no commits ahead of `main`.

The detailed pre-Phase-6 baseline and PR #46 pre-merge status below are retained as a **historical snapshot**. For the Phase 7 implementation and current evidence limits, see [PHASE_7_READINESS_REPORT.md](./PHASE_7_READINESS_REPORT.md).

---

## Historical snapshot (pre-Phase-6 merge)

**Historical main:** `24c14ba599017d1f35e94533393c209300caf28d`

This report distinguishes implementation in merged code, automated CI, isolated tests, and production/provider acceptance. Passing tests or release-artifact builds do not establish deployment, operational acceptance, legal compliance, or production-provider behavior.

## Pull requests and current main CI

PRs [#25](https://github.com/Xonni-star/SecurityOps-2.0/pull/25) through [#45](https://github.com/Xonni-star/SecurityOps-2.0/pull/45) are merged. PR #45 (Phase 5) merged on 2026-11-15 at `24c14ba599017d1f35e94533393c209300caf28d`. No PRs were open at the mainline baseline check. Main CI run [43710871856](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43710871856) passed all seven jobs on that exact commit; release-artifact run [43711105799](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43711105799) passed both packaging and validation jobs. The preceding Phase 4 mainline run [43702382063](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43702382063) and release run [43702607678](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43702607678) remain valid historical evidence for commit `77fdb0955e3bbbef01690edc93dc630e443bfbe8`, not the current mainline result. The older release-artifact failure [43695992978](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43695992978) is also historical. Verified merge commits for PRs #25–#34 are:

| PR | Merged commit |
|---|---|
| #25 | `3337d8c` |
| #26 | `5c8fed8` |
| #27 | `d3291f0` |
| #28 | `8948dc3` |
| #29 | `ed7f5f0` |
| #30 | `639f3a1` |
| #31 | `a16e5df` |
| #32 | `1bf310b` |
| #33 | `fe8c7c1` |
| #34 | `7ee8ce6` |

PRs [#35](https://github.com/Xonni-star/SecurityOps-2.0/pull/35) through [#38](https://github.com/Xonni-star/SecurityOps-2.0/pull/38) subsequently merged:

| PR | Merged commit | Scope |
|---|---|---|
| #35 | `f0bacbc` | Refresh status reports through PR #34. |
| #36 | `5f2a6b5` | Add configured monthly work-limit validation. |
| #37 | `2ebb810` | Add isolated PostgreSQL, private MinIO, and real-ClamAV DMS API-flow coverage. |
| #38 | `e2d57f6` | Validate full-schema backup/restore and synthetic tenant/DMS data in CI. |
| #39 | `4b7cd7d` | Reject malformed ClamAV scanner responses. |
| #40 | `4de3d64` | Prevent offline outbox mutation ID collisions. |
| #41 | `62ee68d` | Refresh verified mainline and storage status documentation. |
| #42 | `556d7b7` | Harden offline sync and SOP assignment workflows, enforce document relationship/owner scope, and update restore migration expectations. |
| #43 | `ba9ab4d` | Phase 3 security, integration, and release hardening. |
| #44 | `77fdb09` | Phase 4 integration hardening. |
| #45 | `24c14ba` | Phase 5 scoped alarm workflows and offline safety. |

The current main CI run [43710871856](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43710871856) passed its seven jobs: root startup, frontend, PostgreSQL/backend, ClamAV adapter, DMS API, isolated restore, and production Docker. Its test output reports 29/29 backend suites and 291/291 Jest tests, and 19/19 frontend test files passed. The separate release-artifact run [43711105799](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43711105799) passed both packaging and validation jobs, including extraction, provenance checks, and production-dependency installation. The older failure [43695992978](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43695992978) exposed the missing-hidden-file issue; the current mainline release run demonstrates that the artifact validates now. These are CI/artifact results, not a production deployment or acceptance result.

## Phase 6 PR #46 validation

PR [#46](https://github.com/Xonni-star/SecurityOps-2.0/pull/46) is open against `main` from the exact remote branch `phase-6-technical-consolidation`. It contains the local Phase 6 increment in `frontend/components/Navbar.tsx` and `frontend/tests/NavbarAccessibility.test.tsx`; these changes are not part of the `main` baseline above. Dashboard and quick-search navigation now use semantic keyboard-operable buttons, icon-only actions have accessible names, and the online/offline control exposes its state. One focused regression case was added.

Hosted CI run [43713451943](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43713451943) passed **7/7 jobs** on code/test commit `f6df5f509db530bcf780824442cf54becc305e23`: root startup, frontend, PostgreSQL/backend, ClamAV adapter, DMS API, full-schema/object-snapshot restore, and production Docker. This run validates that exact PR head only. For any later PR head, check the PR Checks tab for its current result.

The CD release-artifact workflow is triggered by `workflow_run` on `main` only, so it was not triggered for PR #46. Release-artifact run [43711105799](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43711105799) remains baseline evidence for main commit `24c14ba599017d1f35e94533393c209300caf28d`; it does not validate the Phase 6 PR head. PR #46 remains open; no merge or deployment is claimed.

Local test inventory changed from the Phase 5/main baseline of 29 backend suites / 291 tests and 19 frontend files / 128 tests to 29 / 291 and 20 frontend files / 129 tests. No cases were removed. The following local checks passed:

- Frontend typecheck, 20/20 Vitest files and 129/129 tests, and production build.
- Backend TypeScript build and 29/29 Jest suites / 291/291 tests against an isolated PostgreSQL 16 instance after applying and seeding the full schema.
- 37 migrations applied; database-only backup/restore passed, including post-restore migration/RLS checks and the failed-restore service-restart path.
- Root `npm ci` and root structure check; production Compose validation and backend/frontend Docker image builds; `git diff --check`.
- Dependency audits: frontend 0 findings; backend full dependency tree 7 LOW `deepmerge@4.3.1` findings (GHSA-gcqx-w48m-w2h4) in development dependencies; backend `--omit=dev` 0 findings. Do not force the breaking Jest downgrade suggested by npm.

The first local backend test attempt without the required test environment failed at the deliberate configuration guard. The complete run with test-only environment configuration and isolated PostgreSQL 16 passed; the initial guarded failure is not counted as a passing test run. The database-only restore excluded S3 and ClamAV. External providers, physical devices, and production deployment have not been tested. See [PHASE_6_IMPLEMENTATION_REPORT.md](./PHASE_6_IMPLEMENTATION_REPORT.md) for scope and limits.

Main CI run [43612331431](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43612331431) passed all seven jobs on `4b7cd7de1b26755a0379b67f7222d55ef2deeb4b`, including root checks/startup, frontend tests/build, backend PostgreSQL/migration/build/Jest, ClamAV adapter integration, full DMS API integration, full-schema backup/restore integration, and production Docker configuration/image builds. Release-artifacts run [43612645484](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43612645484) also succeeded on the same commit, building a package from CI artifacts. This is artifact generation, not a production deployment.

The merged changes include:

- PRs #29–#30: isolated backup/restore validation and credential/mount isolation.
- PR #31: ClamAV INSTREAM adapter integration coverage in CI.
- PR #32: persisted, bounded retry backoff for eligible generic offline-outbox failures.
- PR #33: optional configurable daily work limit and focused PostgreSQL DST-boundary tests.
- PR #34: documentation snapshot; its former PR/main/CI status has been superseded by the current status above.

## Restore and malware-scanning evidence

The isolated MinIO and SeaweedFS checks associated with PRs #29–#30 passed with documented image overrides. They exercise selected test database metadata and S3-compatible object snapshots, hash/metadata comparisons, credential and mount isolation, and disposable-resource cleanup. They are **not** a full SecurityOps installation, full migrated-schema restore, or production/external-provider restore.

The ClamAV adapter check exercises the application INSTREAM protocol against clean content and benign EICAR. The separate PR #37 CI job exercises the DMS API with PostgreSQL, private MinIO, and ClamAV, including type/size checks, clean release, authorized download, EICAR quarantine, tenant/auth boundaries, private storage, and audit events. These isolated checks do not establish that production storage/scanner services are configured or reachable. A separate isolated `clamdscan --stream` smoke check also recognized benign EICAR; that result is limited to the test runtime.

The PR #38 restore job runs the repository migration runner across the full current schema and verifies synthetic tenant/user/DMS metadata, RLS behavior, object hashes, and object metadata after restore. It is an isolated CI infrastructure test, not a production backup/restore drill.

## Evidence categories and limits

| Evidence type | What is established | What is not established |
|---|---|---|
| Implementation | PRs #25–#45 are merged into the listed mainline; the current main contains their changes. | End-user acceptance or production readiness. |
| Automated CI | All seven jobs passed on exact current main commit `24c14ba599017d1f35e94533393c209300caf28d`; both release-artifact jobs passed for that commit. | Deployed configuration, production traffic, or successful operation in a customer environment. |
| Isolated tests | DMS API/scanner and full-schema restore checks, plus focused planning/offline tests, exercise their stated test scopes. | Full production installation or restore, external-provider acceptance, or all-device/browser behavior. |
| Production/provider acceptance | None established by this report. | Production rollout and restore, external-provider acceptance, browser/device acceptance, and legal/domain review remain outstanding. |

No full production installation or restore, external-provider acceptance, legal review, or browser/device acceptance has been established. The backend development dependency tree's last recorded audit identified a LOW `deepmerge@4.3.1` advisory in Jest/`ts-jest` development dependencies; the production-only audit found no production findings at that snapshot. This is not a production dependency finding.

Phase 5's implementation details and its local/hosted test snapshot are preserved in [PHASE_5_IMPLEMENTATION_REPORT.md](./PHASE_5_IMPLEMENTATION_REPORT.md). Phase 6's implementation, local verification, PR #46 hosted result, evidence limits, and next-phase recommendations are in [PHASE_6_IMPLEMENTATION_REPORT.md](./PHASE_6_IMPLEMENTATION_REPORT.md).
