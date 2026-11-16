# SecurityOps 2.0 — Current project status

**Last verified:** 2026-11-16

**Verified `main`:** [`9df02aaa5ef01de78e0fe5d53be446b2037db24d`](https://github.com/Xonni-star/SecurityOps-2.0/commit/9df02aaa5ef01de78e0fe5d53be446b2037db24d)

**GitHub pull requests:** [#66](https://github.com/Xonni-star/SecurityOps-2.0/pull/66) is the only open PR; PRs #50–#65 are merged, including [#62](https://github.com/Xonni-star/SecurityOps-2.0/pull/62).

**Overall readiness:** **TEILWEISE IMPLEMENTIERT / OFFEN — not approved or verified for production.**

**Current worktree:** branch `xonni-star-phase9-docs-and-status-cleanup` includes local report-scope/offline-privacy work, Phase 10 evidence, restore failure-path hardening and tests (`a55ac4b`), and updated audit/status wording through `1f3adbd`. The commits have not been pushed; PR #66 and hosted CI still refer to remote head `785e9eabc9e6ab5f1ce4e726fdff2cbfa49367e4`.

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
| Current remote PR validation | **IMPLEMENTIERT UND GETESTET** | PR #66 remote head `785e9eabc9e6ab5f1ce4e726fdff2cbfa49367e4`; [CI run 43843645961](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43843645961) passed 7/7. This run does not include local worktree changes. |
| Reporting UI | **IMPLEMENTIERT UND GETESTET** | PR #66's frontend uses approved actual hours, calendar ranges, and safe CSV export; its frontend checks passed for the identified revision. |
| Report site-scope correction | **IMPLEMENTIERT UND GETESTET** | This worktree explicitly filters all four report handlers and the work-hours CSV by authenticated site grants. Backend TypeScript build, three scope-helper tests, and `sync_and_roles.test.ts` (33/33) passed against isolated PostgreSQL 16. Hosted CI and production acceptance for this change remain outstanding. |
| Prior backend validation | **IMPLEMENTIERT UND GETESTET** | On an earlier PR revision, migration and seed ran against isolated PostgreSQL 16; backend build and 34 Jest suites / 315 tests passed. These results do not cover the current report-scope change. |
| Test-only Linux install | **IMPLEMENTIERT UND GETESTET** | PR #56 merged. The tar/deb installer and lifecycle guidance target isolated testing; they are not production installers. |
| Backup/restore | **TEILWEISE IMPLEMENTIERT** | The current worktree's full isolated PostgreSQL/MinIO drill passed, including restore failure (transactional rollback; services remain stopped) and partial-resume failure (partially started service is stopped). Commit `a55ac4b` is local and not covered by hosted CI. A real S3-provider restore and measured RPO/RTO are not evidenced. |
| Offline and SOP workflows | **TEILWEISE IMPLEMENTIERT** | PR #64 offline sync is verified at its identified revision. The current worktree removes the tenant-wide ownerless-attachment recovery UI after a confirmed disclosure issue; focused regression tests and broader authenticated-backend/device acceptance remain. Legacy ownerless attachments stay local and cannot yet be securely recovered. |
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
- [Phase 9 completion report](./PHASE_9_COMPLETION_REPORT.md) — operational/documentation audit, evidence boundaries, and gates.
- [Linux test installation runbook](./frontend/deploy/linux-test/README.md) — isolated, non-production installation, update, backup and restore.
- [Frontend architecture](./frontend/FRONTEND_ARCHITECTURE.md), [authentication and session security](./frontend/AUTHENTICATION_SECURITY.md), and [system overview](./frontend/SYSTEM_OVERVIEW.md) — current implementation boundaries.
- [Production deployment and recovery guide](./frontend/deploy/PRODUCTION_DEPLOYMENT.md) — Compose operations, provider boundaries, and rollback constraints.
- [Offline architecture](./frontend/OFFLINE_ARCHITECTURE.md) and [SOP API](./frontend/SOP_API.md) — workflow-specific behavior and limitations.
- [Mainline integration history](./MAINLINE_INTEGRATION_STATUS.md) and [Phase 8 report](./PHASE_8_COMPLETION_REPORT.md) — preserved dated evidence; consult this file for current GitHub state.

No PR is being merged or deployment performed as part of this status update.
