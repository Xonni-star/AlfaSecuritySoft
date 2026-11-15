# Test results — SecurityOps 2.0

**Run date:** 2026-11-15  
**Scope:** Current local PR #66 worktree. This report is evidence for the listed commands only; it is not a complete production acceptance.

| Area | Result | Evidence and limits |
|---|---|---|
| Frontend unit tests | **BESTANDEN** | `cd frontend && npm test`: 28 test files, 157 tests passed. |
| Frontend typecheck | **BESTANDEN** | `cd frontend && npm run typecheck`. |
| Frontend production build | **BESTANDEN** | `cd frontend && npm run build`. Vite printed an existing `configLoader: 'native'` / `__dirname` deprecation warning. |
| Backend build | **BESTANDEN** | `cd frontend/backend && npm run build`. |
| PostgreSQL migrations and seed | **BESTANDEN** | All migrations and seed ran against a temporary, isolated PostgreSQL 16 container using synthetic test data. The container was stopped after the run. |
| Backend tests | **BESTANDEN** | `cd frontend/backend && npm test -- --runInBand`: 34 suites, 315 tests passed against that isolated database. `apiRateLimit.test.ts` emitted an express-rate-limit diagnostic for a forwarded header; the suite passed. |
| Production Compose configuration | **BESTANDEN** | `docker compose -f frontend/deploy/docker-compose.production.yml config --no-interpolate --quiet`. This validates configuration only; it does not deploy services. |
| Hosted PR CI | **BESTANDEN** | Run [43767322367](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43767322367) passed 7/7 on `ebc57a4`. |
| Browser E2E on real authenticated services/device | **NICHT GETESTET** | No physical-device or authenticated live-backend acceptance was performed in this worktree. |
| External S3 restore and measured RPO/RTO | **NICHT GETESTET** | No external provider restore or operational recovery-time measurement was performed. |

No test was removed or disabled. The PostgreSQL test database contained only synthetic data and was stopped after testing.
