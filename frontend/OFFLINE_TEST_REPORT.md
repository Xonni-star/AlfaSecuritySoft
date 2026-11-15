# SecurityOps 2.0 - Phase 6: Offline-Testbericht

> **Historische Szenariomatrix:** Die 18 Einträge unten dokumentieren damalige lokale Prüfungen, keine aktuelle Browser-/Geräteabnahme. Insbesondere Szenario 2 prüft nur lokale IndexedDB-Validierung; es gibt keinen Foto-Upload-/Replay-Pfad, daher werden Fotos nicht synchronisiert.

## 1. Testergebnisse der 18 Szenarien
| Nr | Szenario | Status | Verifikation |
|---|---|---|---|
| 1 | Offline-Wachbucheintrag und spätere Synchronisation | **BESTANDEN** | Eintrag wird in IndexedDB Outbox gespeichert und bei Reconnect übertragen |
| 2 | Offline-Ereigniserfassung mit Foto | **BESTANDEN (lokale Prüfung)** | Foto wird lokal in IndexedDB `attachments` validiert (<= 5 MB); kein Foto-Upload-/Replay-Pfad und keine Foto-Synchronisation |
| 3 | Verbindungsabbruch während Sync | **BESTANDEN** | Transaktion wird zurückgerollt, Outbox bleibt `PENDING` |
| 4 | Browser während Sync geschlossen | **BESTANDEN** | Wiederaufnahme beim nächsten Start ohne Datenverlust |
| 5 | Idempotente Mehrfachübertragung | **BESTANDEN** | `client_mutation_id` verhindert Duplikate |
| 6 | Zwei Geräte bearbeiten dieselbe Aufgabe | **BESTANDEN** | Kollision erkannt, Status `CONFLICT` generiert |
| 7 | Konflikte in UI angezeigt | **BESTANDEN** | Side-by-Side Diff im `SyncManagerModal` nutzbar |
| 8 | Wachbuch nicht still überschreibbar | **BESTANDEN** | Append-Only `LogbookRevisionEntry` greift |
| 9 | Revisionshistorie nachvollziehbar | **BESTANDEN** | Dialog zeigt vollständigen Audit-Trail |
| 10 | Mandantentrennung bei Sync | **BESTANDEN** | Tenant A kann keine Mutationen für Tenant B pushen/pullen |
| 11 | Widerruf eines Gerätes | **BESTANDEN** | `DeviceStatus.REVOKED` blockiert Sync sofort |
| 12 | Große Anhänge (>5 MB) | **BESTANDEN** | Validierung wirft verständliche Fehlermeldung |
| 13 | Veraltete Sync-Cursor | **BESTANDEN** | Incremental Pull liefert alle Änderungen ab `since_sequence` |
| 14 | Teilweise fehlgeschlagene Batches | **BESTANDEN** | Erfolgreiche Einträge quittiert, fehlerhafte bleiben in Outbox |
| 15 | Falsche Gerätezeit | **BESTANDEN** | `received_at` und Sequenznummer steuern Reihenfolge |
| 16 | IndexedDB Migrationen | **BESTANDEN** | Schema-Upgrade auf DB_VERSION 2 erfolgreich |
| 17 | Wiederherstellung nach Absturz | **BESTANDEN** | Outbox bleibt persistent erhalten |
| 18 | Background Sync & Fallback | **BESTANDEN** | Service Worker sync Event + manueller Fallback |

## Phase 2 frontend verification snapshot (2026-11-13)

The table above is historical project documentation, not evidence of real-device or cross-browser execution for this Phase 2 change. Current local automated verification:

- `cd frontend && npm test` — 15 test files, 94 tests passed.
- `cd frontend && npm run build` — passed; existing Vite `__dirname` config-loader and >500 kB chunk warnings remain.
- `cd frontend && npm audit` — 0 vulnerabilities.
- `cd frontend/backend && npm audit` — 7 low-severity findings in the Jest/`ts-jest` development-test toolchain, including `deepmerge` GHSA-gcqx-w48m-w2h4. `cd frontend/backend && npm audit --omit=dev` — 0 vulnerabilities. The suggested forced remediation downgrades Jest with a breaking change and was not applied.

Focused frontend tests cover startup replay while already online, exact tenant/user outbox ownership (including unknown owners), visible date-range limits of the single planning cache, approval-gated variance/minus-hours, separate actual-time approval, planning notification read state, and planning UI regressions. These tests do not establish device/browser compatibility, background execution after the browser is closed, production operation, or legal compliance. Exact PR CI head/run mapping is maintained in the [Phase 2 final status report](../PHASE_2_FINAL_COMPLETION_REPORT.md).

CI mapping for this verification snapshot: PR #16 head `a167379546d239ae7241974a3fbb4f9adb7e1868`, run `43498580680` (all four jobs passed); PR #19 head `811de4980835c16df03adc625dc76d55951d657a`, run `43499283441` (all four jobs passed). PR #19 is stacked on PR #16; both remain open and unmerged.

## Current browser validation snapshot (PR #52, 2026-11-15; status checked 20:30 CET)

Open PR [#52](https://github.com/Xonni-star/SecurityOps-2.0/pull/52) adds a Playwright/Chromium loopback scenario covering offline guardbook capture, reload persistence of the outbox entry and photo, reconnect, and retry after a deliberately lost receipt. The retry uses the same mutation ID and produces one effect in the local fixture. The PR reports three focused Vitest files / 48 tests, typecheck, production build, and `npm run test:browser -- --workers=1` passing on head `9dddf9e5a4c4ca2cbd0cfee7e924a30d3d7eefd1`; hosted CI run [43750985353](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43750985353) passed 7/7 jobs. The PR remains open and unmerged.

This browser test uses a loopback fixture, not the authenticated application backend or production services; backend/device acceptance remains incomplete. The DMS upload API has no idempotency key or retry lookup and generates a new document ID, so photo upload/replay is not implemented. Photos persist locally as **unsynced**. No UI or report should claim that a photo has synchronized.

## Offline guardbook exercise (2026-11-15)

Current local verification:

- `cd frontend && npm test` — 24 test files, 140 tests passed.
- `cd frontend && npm run typecheck` — passed.
- `cd frontend && npm run test:browser -- --workers=1` — passed in Chromium against a dedicated fixture server bound to `127.0.0.1`; no production endpoint, shared service, or Docker container was used.
- `tests/offlineGuardbookReconnect.test.ts` uses jsdom events, an isolated `fake-indexeddb` database, and a mocked API. It simulates offline capture, IndexedDB close/reopen, reconnect, a missing receipt followed by retry with the same mutation ID, and a guardbook conflict receipt retained in the outbox.
- `tests/storeApiIntegration.test.ts` separately checks partial/missing receipts and retry behavior. `tests/GuardBookModule.test.tsx` checks duplicate submission protection and retrying a failed local photo write without recreating the entry.

The browser test exercises Chromium's actual offline/online network transition with `context.setOffline`, service-worker control, an offline queue write, reload while offline, and IndexedDB persistence of the same mutation and unsynced photo record. On reconnect, the local fixture commits the mutation but deliberately drops the first response; the browser retries with the same mutation ID, receives the same receipt, and the fixture reports exactly one server-side effect. The browser test uses an isolated in-memory test fixture, not the application backend; unit tests remain the evidence for conflict receipts, partial receipts, and duplicate-submit protection.

### Chromium offline/reconnect scenario — PASSED against isolated fixture

The first probe found that the app did not register its service worker and the service worker precache referenced paths not emitted by Vite. Production builds now register the worker and precache the built root/manifest files. The Playwright test now serves the built app and API fixture from a separate loopback-only Node server; it uses Chromium offline emulation rather than Playwright request interception. This validates browser persistence/reconnect behavior against a controlled local fixture, not a live backend or physical device.

Full backend/device acceptance and photo replay remain **INCOMPLETE**. The guardbook form only writes photo data to IndexedDB. The existing DMS `POST /api/v1/documents` contract can upload raw bytes and link a persisted same-tenant guardbook entry with `relationshipType=incident` and `relationshipId`, but it generates a new server document ID per upload and defines no idempotency key or retry lookup. That is insufficient for safe replay after a lost response; no attachment upload/replay implementation was added without that API contract.
