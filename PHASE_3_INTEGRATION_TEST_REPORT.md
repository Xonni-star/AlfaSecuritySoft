# Phase 3 Integration Test Report

**Status checked:** 2026-11-15  
**Reviewed baseline:** `main` at `ba9ab4ddc5d9ef03a3d147a023f002a0abb0e547`
**Project status:** In development; not approved for production.

## Phase 3 workflow coverage

The authenticated PostgreSQL-backed API integration suite now exercises a customer-to-site-to-employee workflow: log in, create a customer, link a site to that customer, assign an employee to the site, then read the persisted relationships after a fresh login. This covers the actual Express API and database rather than only testing endpoint status codes.

The targeted API integration suite passed **21/21 tests** on the isolated migrated and seeded database. The complete backend suite passed **29 suites / 286 tests**, including migration, tenant-isolation, authentication, synchronization, DMS, SOP, alarm, handover, patrol, and planning tests.

The Phase 3 frontend validation passed **strict TypeScript checking, 18 test files / 118 tests, and the production build**. The mobile navigation accessibility tests cover semantic control roles, keyboard activation, current-page state, and accessible navigation names. A store/API regression test simulates a server commit followed by a lost receipt and client restart, then verifies same-ID replay produces only one server-side effect.

## Existing integration evidence

- Main CI run [43695784002](https://github.com/Xonni-star/AlfaSecuritySoft/actions/runs/43695784002) passed all seven jobs on the reviewed main commit, including PostgreSQL/migrations/backend tests, frontend tests/build, isolated DMS/scanner integration, restore validation, and Docker checks.
- Main release-artifact run [43695992978](https://github.com/Xonni-star/AlfaSecuritySoft/actions/runs/43695992978) failed validation because the uploaded artifact omitted the tracked `frontend/deploy/.env.example`; the packaging workflow is being corrected. The failure does not invalidate the passing CI jobs but means a validated release bundle was not produced.
- The startup smoke test checks backend health and frontend HTML availability; it is not a business-workflow E2E test.

## Coverage limits

- The new customer/site/employee test does not constitute a single end-to-end journey across all 15 listed modules.
- DMS/scanner and backup/restore checks use isolated test services; they do not prove production provider availability or production recovery.
- Browser/device acceptance, real mobile camera/NFC operation, and offline behavior across all modules remain unverified.
- Cross-module flows involving service publication, SOP acknowledgement, alarm escalation, handover, patrol completion, and audit review still need dedicated end-to-end acceptance.

## Phase 4 branch validation

On the Phase 4 worktree, the frontend suite passed **19 test files / 122 tests**, strict TypeScript checking, and the production build. The backend suite passed **29 suites / 286 tests** against an isolated PostgreSQL 16 database, and the backend TypeScript build passed. The full isolated database/MinIO restore test passed, including the new failed-restore service-recovery case. A local release bundle passed the verifier with all 36 migration assets. These are local results for this branch; hosted PR CI is still pending, and the release-artifact workflow cannot be hosted-verified without a successful `main` CI run.
