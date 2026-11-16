# SecurityOps 2.0 — Current project status

**Last verified:** 2026-11-16

**Verified `main`:** [`9df02aaa5ef01de78e0fe5d53be446b2037db24d`](https://github.com/Xonni-star/SecurityOps-2.0/commit/9df02aaa5ef01de78e0fe5d53be446b2037db24d)

**GitHub pull requests:** [#66](https://github.com/Xonni-star/SecurityOps-2.0/pull/66) is the only open PR; PRs #50–#65 are merged, including [#62](https://github.com/Xonni-star/SecurityOps-2.0/pull/62).

**Overall readiness:** **TEILWEISE IMPLEMENTIERT / OFFEN — not approved or verified for production.**

**Fully hosted-verified code revision:** `3617576a8408002a99e1ed4f66e5a94b17a13cf5`
on the existing isolated PR branch `xonni-star-phase9-docs-and-status-cleanup`.
The Phase 10/11 changes have been pushed; no merge, tag or deployment was performed.
Later documentation-only commits are outside this code-revision identifier.

**Rejected-attachment extension — IMPLEMENTIERT UND GETESTET:** The complete real
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

**Latest regression package:** `authorization_boundaries.integration.test.ts`
passes **16/16** against fresh migrated/seeded PostgreSQL 16: four reports and
CSV, tenant/site grants, missing/revoked grants, forged tenant hints and direct
shift IDs. The full frontend suite now passes **184/184** with two workers and
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
| Published Phase 11 CI | **IMPLEMENTIERT UND GETESTET** | Photo code `31e63726d8b377abafe564da349c3aa622468291` passed 7/7 in 43916713656, including all 4 real browser journeys. Cleanup `3aeebc0` and fixture/ownership `4524f12` each previously passed 7/7. Failed 5/7 and 6/7 runs remain recorded; later documentation-only commits are outside this code ID. |
| Reporting UI | **IMPLEMENTIERT UND GETESTET** | PR #66's frontend uses approved actual hours, calendar ranges, and safe CSV export; its frontend checks passed for the identified revision. |
| Report site-scope correction | **IMPLEMENTIERT UND GETESTET** | All four report handlers and work-hours CSV use authenticated site grants. Local scope-helper/integration tests and the hosted backend job on `6ead55c` passed. Production acceptance and the full role/object matrix remain outstanding. |
| Prior backend validation | **IMPLEMENTIERT UND GETESTET** | On an earlier PR revision, migration and seed ran against isolated PostgreSQL 16; backend build and 34 Jest suites / 315 tests passed. These results do not cover the current report-scope change. |
| Phase 11 backend and migrations | **IMPLEMENTIERT UND GETESTET** | Latest full local backend suite: 35/35 suites, 546/546 tests, no open-handle warning. API/sync integration budget is explicitly 30 s, Patrol 60 s; no assertions removed and no application/PostgreSQL defaults changed. Earlier 5-s/30-s timeout runs are documented above, not reclassified as passing. A real 041→042 upgrade preserves earlier checksums, rejects GuardBook DELETE/core-field UPDATE and becomes a no-op on rerun. Published 001/004 remain unchanged; text correction is additive in 042. |
| Authenticated report authorization | **IMPLEMENTIERT UND GETESTET** | Extended boundary suite: 16/16, with two tenants/three sites, report-only and site grants, absent/removed permissions, CSV, exact aggregates, forged tenant hints and direct shift IDs. Existing sessions immediately lose removed report grants. No new runtime authorization defect found; other endpoint/object combinations remain open. |
| Phase 11 frontend and browser | **IMPLEMENTIERT UND GETESTET** | Local frontend 29 files/184 tests with two workers and unchanged default 5-s budgets; typecheck/build passed, and hosted frontend job passed on the photo code SHA. Separate fixture 1/1; real suite 4/4 locally and hosted covers session/replay/logout/identity/SOP and a synthetic photo through private S3/ClamAV. Exact photo assertions and unchanged case budgets are stated above. No physical-device/provider, representative-file or complete identity-matrix acceptance is inferred. |
| API authentication boundary | **IMPLEMENTIERT UND GETESTET** | All 215 currently registered protected method/path pairs return 401 without a session in the local backend suite. Health, login and password-reset completion are explicit public exceptions. Full per-role/site/object matrix remains open. |
| Module/architecture inventory | **IMPLEMENTIERT** | [13-module evidence matrix](./MODULE_IMPLEMENTATION_STATUS.md) identifies active UI/API/database/test paths and remaining limits. npm and production Docker use Node/TypeScript; historical Python/Alembic files were not validated by these runs. Not a complete product acceptance. |
| Test-only Linux install | **IMPLEMENTIERT UND GETESTET** | PR #56 merged. The tar/deb installer and lifecycle guidance target isolated testing; they are not production installers. |
| Backup/restore | **TEILWEISE IMPLEMENTIERT** | Full local PostgreSQL/MinIO drill through 042 passed again after matching backup UID/GID to the invoking restore user; archive ownership, readability and private mode 0600 are asserted. Mid-DDL rollback, stopped services on restore/resume failure and backup-health failure/recovery remain covered. Previous hosted Linux archive-access failure and correction CI are tracked above. Health is not an integrity/restore check or external alert; real-provider restore and measured RPO/RTO remain open. |
| Offline and SOP workflows | **TEILWEISE IMPLEMENTIERT** | Ownerless-attachment disclosure UI is removed; legacy attachments stay local without a secure recovery flow. Real suite including synthetic photo/S3/ClamAV passes 4/4 locally and hosted; separate fixture 1/1. This is not complete photo/file/identity-matrix or physical-device acceptance. |
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
