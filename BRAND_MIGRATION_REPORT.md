# AlfaSecuritySoft brand migration — correction audit

## Correction round

This correction round started from the local checkpoint `3e36ceaaccda8462a43a10f9eeb77cf20d5599870` on `xonni-star-phase9-docs-and-status-cleanup`. At the start, GitHub `main` was `80ac44f4bccc0d9c1aef0891239017ff51b5e216`, PR #67 was merged, and there were no open PRs. The repository has already been renamed to `Xonni-star/AlfaSecuritySoft`; the prior report's statement that it would retain the old GitHub name was stale. The correction was merged through PR #68 as `c28482f2eb2b5d615df94cee60986ab9760a2ed0`.

The correction adds an additive database migration for the new least-privilege login `alfasecuritysoft_app_user`, which inherits only the existing `secops_app_user` grants. The old role, administrative login, and migrations 001–042 remain intact for upgrade and rollback compatibility. Deployment initializes the same app password on both logins; the API container connects with the new login. Demo seeding now prefers `ALFASECURITYSOFT_DEMO_USER_PASSWORD`, with a warning-producing fallback for the old variable. Compose uses the new subnet/proxy variable names while accepting the old names as fallbacks. Temporary browser-test database/cookie/image identities and the local store's compile-time type were also branded.

Updated **368** occurrences of the old GitHub repository URL in **63** tracked text files. Exact old GitHub URL search now returns no matches; current clone instructions use the renamed repository and `AlfaSecuritySoft` directory. The old `xanni/SecurityOps-2.0` Forgejo reference is a recorded historical mirror and was not changed or claimed to have been renamed.

Locally verified in this round: frontend tests **380/380**, frontend typecheck and production build, backend TypeScript build, focused demo-password tests **3/3**, branding/login tests **3/3**, changed-shell syntax, and `git diff --check`. The initial restore CI run exposed a stale expected-migration list; the restore test was updated to include migration 043 and verified against all 41 repository migrations. PR CI [44061599741](https://github.com/Xonni-star/AlfaSecuritySoft/actions/runs/44061599741) passed **7/7** on `88df849d16a427a7741056a69bcd72360f5f1e86`, including PostgreSQL migration/Jest, restore, browser, Compose and image-build jobs. Post-merge main CI [44062087886](https://github.com/Xonni-star/AlfaSecuritySoft/actions/runs/44062087886) passed **7/7** on merge commit `c28482f2eb2b5d615df94cee60986ab9760a2ed0`. Local Docker/PostgreSQL tooling remained unavailable; hosted CI verified the migration, restore workflow and production Compose validation. These results do not imply production, legal, certification, real-provider or external restore acceptance.

## Result

Product-facing branding, package metadata, deployment defaults, CI/release labels, documentation, tests, and the Linux login screenshot use the exact name **AlfaSecuritySoft**. The correction preserves feature flows, credentials, sessions, tenant keys, historical grants, and persistent offline-storage identities; one additive login-role migration does not rewrite user data.

The existing shield icon has no former wordmark, so it remains in use; the login screenshot was recaptured from the running app and shows the new title. No new logo or favicon was needed.

## Compatibility choices and deployment notes

- GitHub repository: `Xonni-star/AlfaSecuritySoft`; the repository description and local `origin` remote now use the renamed identity.
- Persistent or externally consumed identifiers remain unchanged to avoid orphaning data or disrupting integrations: IndexedDB `SecurityOps2_OfflineVault`, Service Worker cache `secops-core-v2.0.5`, database `securityops_v2`, S3 bucket `securityops-documents`, Redis key prefix `securityops:api-rate-limit:`, event `securityops:unauthorized`, JWT issuer `securityops-auth`, legacy storage path `/var/lib/securityops/storage`, Compose project/network/volume names, `secops_*` production container names, and localStorage keys such as `secops_tenant_id`.
- PostgreSQL roles `secops_admin` and `secops_app_user` remain as compatibility identities. The latter remains the grant source for immutable historical migrations; migration 043 adds `alfasecuritysoft_app_user` with restricted inheritance and refuses an unsafe pre-existing role or unexpected role memberships.
- `SECOPS_DEMO_USER_PASSWORD`, `SECOPS_INTERNAL_SUBNET`, and `SECOPS_PROXY_IPV4` remain accepted only as documented compatibility fallbacks. The new variables are the defaults for new configuration.
- Historical SQL migrations 001–042 were not edited because their checksums are recorded. Migration 043 is additive. The test deliberately checks that the login UI does not render the old product name and that persisted namespaces stay stable.
- Legacy Python CORS origins remain available for existing deployments; production operators must set the actual AlfaSecuritySoft origin in their environment. Example tenant domains and the installer’s new-installation default use the reserved `.example` domain and must be replaced with a real domain before deployment.
- Production Docker image tags changed to `alfasecuritysoft-frontend` and `alfasecuritysoft-backend`; container names and data volumes remain stable. Existing `.env` files are not overwritten by the installer.
- Package names and lockfiles were updated for the private root, frontend, and Node backend packages. No published-package migration was performed.

## First-round validation (commit `3e36cea`)

The following results were collected for the initial branding commit before this correction round; they are retained as historical evidence and are not substituted for the correction checks above.

| Check | Result |
|---|---|
| Frontend Vitest suite | PASS — 37 files, 380 tests |
| Frontend TypeScript check | PASS |
| Frontend production build | PASS |
| Node backend TypeScript build | PASS |
| Focused Node authentication test | PASS — 1 test |
| Focused branding/login/report tests | PASS — 3 files, 14 tests |
| Playwright-rendered login title and heading | PASS — both display AlfaSecuritySoft |
| Production Compose configuration | PASS with explicit non-production validation values |
| Deploy shell syntax, smoke-script syntax, `git diff --check` | PASS |
| Full Node backend Jest suite | BLOCKED/FAIL in this environment — 25 suites passed, 10 failed; migration tests require `DATABASE_MIGRATION_URL` and an initialized test database. Overall: 366 passed, 163 failed. |
| Python pytest suite | BLOCKED at collection — three existing environment/project issues: missing `greenlet` and two imports for `Tenant` / `DeviceStatus` absent from the current `backend.models`. |
| Remote GitHub CI / production restore / real-domain deployment | NOT RUN |

These results do not constitute a production, legal, certification, or external restore approval.

## Files changed in the initial branding commit

The following 165 files were changed or added for this migration (this report is the additional documentation artifact):

```text
.github/workflows/ci.yml
.github/workflows/ci_cd.yml
CHANGELOG.md
DEPLOYMENT_ACCEPTANCE_REPORT.md
FINAL_COMPLETION_REPORT.md
FINAL_PHASE_10_COMPLETION_REPORT.md
FINAL_PROJECT_COMPLETION_REPORT.md
FINAL_SECURITY_AUDIT.md
MAINLINE_INTEGRATION_STATUS.md
MODULE_IMPLEMENTATION_STATUS.md
PHASE_1_INTEGRATION_COMPLETION_REPORT.md
PHASE_4_IMPLEMENTATION_REPORT.md
PHASE_6_IMPLEMENTATION_REPORT.md
PHASE_9_COMPLETION_REPORT.md
PHASE_9_FINAL_ACCEPTANCE.md
PRODUCTION_READINESS_REPORT.md
PRODUCTION_RELEASE_CHECKLIST.md
PROJECT_COMPLETION_REPORT.md
PROJECT_COMPLETION_TRACKER.md
PROJECT_CURRENT_STATUS.md
PROJECT_STATUS.md
README.md
SECURITY_AUDIT_REPORT.md
STEP_5R_2_18_REPORT.md
STEP_5R_2_19_REPORT.md
STEP_5R_2_20_REPORT.md
STEP_5R_2_22_REPORT.md
STEP_5R_2_23_REPORT.md
STEP_5R_2_24_REPORT.md
STEP_5R_2_25_REPORT.md
STEP_5R_2_26_REPORT.md
STEP_5R_2_27_REPORT.md
STEP_5R_2_28_REPORT.md
STEP_5R_2_29_REPORT.md
STEP_5R_2_30_REPORT.md
STEP_5R_2_31_REPORT.md
STEP_5R_2_32_REPORT.md
STEP_5R_2_33_REPORT.md
STEP_5R_2_34_REPORT.md
STEP_5R_3_1_REPORT.md
STEP_5R_3_2_REPORT.md
STEP_5R_3_3_REPORT.md
STEP_5R_3_4_REPORT.md
STEP_5R_3_5_REPORT.md
STEP_5R_3_6_REPORT.md
STEP_5R_3_7_1_REPORT.md
STEP_5R_3_7_REPORT.md
SYSTEM_AUDIT_AND_PRIORITY1_REPORT.md
SYSTEM_AUDIT_REPORT.md
TEST_RESULTS_REPORT.md
frontend/.gitignore
frontend/ADMINISTRATOR_GUIDE.md
frontend/AUTOMATION_ENGINE.md
frontend/AUTOMATION_TEST_REPORT.md
frontend/BACKEND_ARCHITECTURE.md
frontend/BACKUP_RESTORE.md
frontend/BUSINESS_MODULES.md
frontend/CHANGELOG.md
frontend/CONFLICT_RESOLUTION.md
frontend/DATABASE_SCHEMA.md
frontend/DEPLOYMENT_ARCHITECTURE.md
frontend/DEVICE_SECURITY.md
frontend/END_TO_END_TEST_REPORT.md
frontend/INSTALLATION_GUIDE.md
frontend/KNOWN_ISSUES.md
frontend/MOBILE_ACCEPTANCE_REPORT.md
frontend/MOBILE_ARCHITECTURE.md
frontend/MOBILE_TEST_REPORT.md
frontend/MOBILE_USER_GUIDE.md
frontend/MODULE_INTEGRATION_REPORT.md
frontend/OFFLINE_ACCEPTANCE_REPORT.md
frontend/OFFLINE_ARCHITECTURE.md
frontend/OFFLINE_TEST_REPORT.md
frontend/PERFORMANCE_TEST_REPORT.md
frontend/PHASE1_BACKEND_REPORT.md
frontend/PRODUCTION_TEST_REPORT.md
frontend/README.md
frontend/ROLE_PERMISSION_TEST_REPORT.md
frontend/SECURITY_AUDIT.md
frontend/STEP_5R_1_REPORT.md
frontend/STEP_5R_2_11_REPORT.md
frontend/STEP_5R_2_12_REPORT.md
frontend/STEP_5R_2_14_REPORT.md
frontend/STEP_5R_2_17_REPORT.md
frontend/STEP_5R_2_1_REPORT.md
frontend/STEP_5R_2_2_REPORT.md
frontend/STEP_5R_2_3_REPORT.md
frontend/STEP_5R_2_4_REPORT.md
frontend/STEP_5R_2_5_REPORT.md
frontend/STEP_5R_2_6_REPORT.md
frontend/STEP_5R_2_7_REPORT.md
frontend/STEP_5R_2_8_REPORT.md
frontend/STEP_5R_2_9_REPORT.md
frontend/STEP_5R_2_REPORT.md
frontend/STEP_5R_REPORT.md
frontend/SYNC_PROTOCOL.md
frontend/SYSTEM_OVERVIEW.md
frontend/TENANT_ISOLATION_TEST_REPORT.md
frontend/USER_GUIDE.md
frontend/backend/.env.example
frontend/backend/api.py
frontend/backend/config.py
frontend/backend/database.py
frontend/backend/models.py
frontend/backend/package-lock.json
frontend/backend/package.json
frontend/backend/schemas.py
frontend/backend/security.py
frontend/backend/seed.py
frontend/backend/services.py
frontend/backend/src/app.ts
frontend/backend/src/integration/clamavAdapter.integration.ts
frontend/backend/src/integration/dmsApi.integration.ts
frontend/backend/src/integration/phase9CoreWorkflows.integration.ts
frontend/backend/src/seeds/seed.ts
frontend/backend/src/server.ts
frontend/backend/src/tests/api_integration.test.ts
frontend/backend/src/tests/backend_phase1.test.ts
frontend/backend/src/tests/cors.test.ts
frontend/backend/src/tests/migrations.test.ts
frontend/backend/src/tests/sync_and_roles.test.ts
frontend/backend/worker.py
frontend/components/IllustratedUserGuide.tsx
frontend/components/LoginScreen.tsx
frontend/components/MobilePatrolScanner.tsx
frontend/components/ReportsModule.tsx
frontend/deploy/.env.example
frontend/deploy/Caddyfile
frontend/deploy/Dockerfile.backend
frontend/deploy/Dockerfile.frontend
frontend/deploy/PRODUCTION_DEPLOYMENT.md
frontend/deploy/backup_cron.sh
frontend/deploy/docker-compose.production.yml
frontend/deploy/install.sh
frontend/deploy/linux-test/README.md
frontend/deploy/linux-test/images/phase7-login.png
frontend/deploy/linux-test/package.sh
frontend/deploy/restore.sh
frontend/deploy/test_backup_restore.sh
frontend/index.html
frontend/metadata.json
frontend/mockData.ts
frontend/package-lock.json
frontend/package.json
frontend/public/manifest.json
frontend/public/sw.js
frontend/services/apiClient.ts
frontend/services/indexedDbService.ts
frontend/tests/Branding.test.ts
frontend/tests/LoginScreen.test.tsx
frontend/tests/ReportsModule.test.tsx
frontend/tests/storeApiIntegration.test.ts
frontend/tests/store_conflict_contract.test.ts
frontend/tests/test_automation_engine.py
frontend/tests/test_backend_api.py
frontend/tests/test_database.py
frontend/tests/test_e2e_integration.py
frontend/tests/test_mobile_api.py
frontend/tests/test_security_hardening.py
frontend/tests/test_sync_engine.py
frontend/vite.config.ts
memory/2026-11-12.md
package-lock.json
package.json
scripts/ci/smoke-start.mjs
```

## Files changed in the correction round

This list includes every path changed or added in the correction round (91 paths):

```text
.github/workflows/ci.yml
ALARM_EMERGENCY_IMPLEMENTATION_REPORT.md
AUTONOMOUS_WORK_CONTINUATION.md
BRAND_MIGRATION_REPORT.md
DEPLOYMENT_ACCEPTANCE_REPORT.md
DMS_IMPLEMENTATION_REPORT.md
FINAL_COMPLETION_REPORT.md
FINAL_PHASE_10_COMPLETION_REPORT.md
FINAL_PHASE_11_COMPLETION_REPORT.md
FINAL_PROJECT_COMPLETION_REPORT.md
FINAL_SECURITY_AUDIT.md
MAINLINE_INTEGRATION_STATUS.md
PATROL_IMPLEMENTATION_REPORT.md
PHASE_1_INTEGRATION_COMPLETION_REPORT.md
PHASE_2_FINAL_COMPLETION_REPORT.md
PHASE_3_INTEGRATION_TEST_REPORT.md
PHASE_3_PRODUCTION_READINESS_REPORT.md
PHASE_3_SECURITY_AUDIT_REPORT.md
PHASE_4_IMPLEMENTATION_REPORT.md
PHASE_5_IMPLEMENTATION_REPORT.md
PHASE_6_IMPLEMENTATION_REPORT.md
PHASE_7_READINESS_REPORT.md
PHASE_8_COMPLETION_REPORT.md
PHASE_9_COMPLETION_REPORT.md
PHASE_9_FINAL_ACCEPTANCE.md
PRODUCTION_READINESS_REPORT.md
PROJECT_COMPLETION_REPORT.md
PROJECT_COMPLETION_TRACKER.md
PROJECT_CURRENT_STATUS.md
PROJECT_STATUS.md
README.md
SECURITY_AUDIT_REPORT.md
SOP_FINAL_COMPLETION_REPORT.md
STEP_5R_2_20_REPORT.md
STEP_5R_2_22_REPORT.md
STEP_5R_2_23_REPORT.md
STEP_5R_2_24_REPORT.md
STEP_5R_2_25_REPORT.md
STEP_5R_2_26_REPORT.md
STEP_5R_2_27_REPORT.md
STEP_5R_2_28_REPORT.md
STEP_5R_2_29_REPORT.md
STEP_5R_2_30_REPORT.md
STEP_5R_2_31_REPORT.md
STEP_5R_2_32_REPORT.md
STEP_5R_2_33_REPORT.md
STEP_5R_2_34_REPORT.md
STEP_5R_3_1_REPORT.md
STEP_5R_3_2_REPORT.md
STEP_5R_3_3_REPORT.md
STEP_5R_3_4_REPORT.md
STEP_5R_3_5_REPORT.md
STEP_5R_3_6_REPORT.md
STEP_5R_3_7_1_REPORT.md
STEP_5R_3_7_REPORT.md
SYSTEM_AUDIT_REPORT.md
TEST_RESULTS_REPORT.md
docs/development/NEXT_DEVELOPMENT_REPORT.md
frontend/BACKEND_ARCHITECTURE.md
frontend/BACKUP_RESTORE.md
frontend/BUSINESS_MODULES.md
frontend/DEPLOYMENT_ARCHITECTURE.md
frontend/INSTALLATION_GUIDE.md
frontend/OFFLINE_ARCHITECTURE.md
frontend/OFFLINE_TEST_REPORT.md
frontend/PHASE1_BACKEND_REPORT.md
frontend/README.md
frontend/backend/.env.example
frontend/backend/src/config/database.ts
frontend/backend/src/config/demoUserPassword.ts
frontend/backend/src/config/env.ts
frontend/backend/src/integration/dmsApi.integration.ts
frontend/backend/src/migrations/043_alfasecuritysoft_application_role.sql
frontend/backend/src/scripts/setAppPassword.ts
frontend/backend/src/seeds/seed.ts
frontend/backend/src/tests/api_integration.test.ts
frontend/backend/src/tests/demoUserPassword.test.ts
frontend/backend/src/tests/migrations.test.ts
frontend/backend/src/tests/testUtils.ts
frontend/deploy/.env.example
frontend/deploy/PRODUCTION_DEPLOYMENT.md
frontend/deploy/docker-compose.production.yml
frontend/deploy/install.sh
frontend/deploy/linux-test/compose.yml
frontend/deploy/linux-test/demo-seed.sh
frontend/e2e/authenticated-guardbook.spec.js
frontend/e2e/run-backend-test.sh
frontend/e2e/seed-browser-accounts.cjs
frontend/e2e/test-server.js
frontend/store.ts
frontend/tests/Branding.test.ts
```
