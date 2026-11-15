# Mainline integration and validation status

**Status checked:** 2026-11-15

**Main:** `77fdb0955e3bbbef01690edc93dc630e443bfbe8`

**Project status:** In development; not approved for production.

This report distinguishes implementation in merged code, automated CI, isolated tests, and production/provider acceptance. Passing tests or release-artifact builds do not establish deployment, operational acceptance, legal compliance, or production-provider behavior.

## Pull requests and current main CI

PRs [#25](https://github.com/Xonni-star/SecurityOps-2.0/pull/25) through [#44](https://github.com/Xonni-star/SecurityOps-2.0/pull/44) are merged. At the latest baseline check, no PRs were open. PR #44 (Phase 4) merged on 2026-11-15 with merge commit `77fdb0955e3bbbef01690edc93dc630e443bfbe8`. Main CI run [43702382063](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43702382063) passed all seven jobs on that exact commit; release-artifact run [43702607678](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43702607678) passed both packaging and validation jobs. The older release-artifact failure [43695992978](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43695992978) is historical, not the current mainline result. The verified merge commits for PRs #25–#34 are:

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

The current main CI run [43702382063](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43702382063) passed its seven jobs: root startup, frontend, PostgreSQL/backend, ClamAV adapter, DMS API, isolated restore, and production Docker. The subsequent release-artifact run [43702607678](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43702607678) passed both packaging and validation, including extraction, provenance checks, and production-dependency installation. The older failure [43695992978](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43695992978) exposed the missing-hidden-file issue; the current mainline release run demonstrates that the artifact validates now. These are CI/artifact results, not a production deployment or acceptance result.

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
| Implementation | PRs #25–#44 are merged into the listed mainline; the current main contains their changes. | End-user acceptance or production readiness. |
| Automated CI | All seven jobs passed on exact current main commit `77fdb0955e3bbbef01690edc93dc630e443bfbe8`; both release-artifact jobs passed on the same commit. | Deployed configuration, production traffic, or successful operation in a customer environment. |
| Isolated tests | DMS API/scanner and full-schema restore checks, plus focused planning/offline tests, exercise their stated test scopes. | Full production installation or restore, external-provider acceptance, or all-device/browser behavior. |
| Production/provider acceptance | None established by this report. | Production rollout and restore, external-provider acceptance, browser/device acceptance, and legal/domain review remain outstanding. |

No full production installation or restore, external-provider acceptance, legal review, or browser/device acceptance has been established. The backend development dependency tree's last recorded audit identified a LOW `deepmerge@4.3.1` advisory in Jest/`ts-jest` development dependencies; the production-only audit found no production findings at that snapshot. This is not a production dependency finding.
