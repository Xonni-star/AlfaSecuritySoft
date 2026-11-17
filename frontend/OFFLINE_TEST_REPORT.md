# AlfaSecuritySoft - Phase 6: Offline-Testbericht

> **Aktueller verifizierter Code:** `5ee9f36665616178c331e9c53526b1e35396b7bd`,
> [CI43972242288](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43972242288)
> **7/7**, gelesene Logs **378 Frontend/553 Backend/10 echte Browserjourneys**
> und Containerbereinigung. Das umfasst echte Quittungsverluste und erneute
> Übertragung, Dokumentantworten, Entwurfs-/Besitzeraktivierungen und
> serialisierte Sync-Refreshs im jeweils getesteten Umfang.
> Die älteren Nachweise unten sind historische Teilstände. Gerätewiderruf und
> sequenzbasierter Delta-Pull sind im aktiven Express-Pfad nicht implementiert.

> **Aktueller Anhang-Fehlernachweis:** Die echte Suite besteht lokal und gehostet
> **5/5** auf `3617576a8408002a99e1ed4f66e5a94b17a13cf5`;
> [CI 43921057411](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43921057411)
> besteht 7/7 Jobs, das Root-Protokoll bestätigt 5/5 und Cleanup.
> Eine synthetische ungültige GIF-Datei erhält tatsächlich HTTP 415 vom Backend.
> Originaldaten, Besitzer, Schlüssel und Uploadfehler überstehen Offline-Reload;
> derselbe Benutzer unter anderem Mandanten lädt nicht hoch. Beim ursprünglichen
> Mandanten erfolgen echte weitere Ablehnungen mit gleichem Schlüssel.
> Der Wachbucheintrag existiert einmal, kein zugehöriges DMS-Dokument und kein
> neues S3-Objekt. Ein erster Test erwartete fälschlich exakt zwei automatische
> Versuche; der finale Test prüft stattdessen wiederholte Ablehnung und stabilen
> Schlüssel. Neuer Fall 120 s, übrige Budgets unverändert. Dateitypprüfung vor
> dem Scan; keine Malware-, Geräte- oder Providerabnahme.

> **Vorheriger Foto-Replay-Nachweis:** Die echte Suite bestand lokal und gehostet **4/4** mit
> PostgreSQL, privatem MinIO und verpflichtendem ClamAV. Ein synthetisches Foto
> überlebt Offline-Reload und fremdes Konto ohne Upload. Beim ursprünglichen
> Besitzer geht die erste echte erfolgreiche Quittung verloren; erst nach
> nachgewiesenem lokalem Fehlerzustand wird der echte Retry freigegeben.
> Gleicher Schlüssel/Autor/Dokument, genau eine Version und ein Upload-/Clean-
> Audit; Originalbytes im tatsächlichen S3-Objekt und autorisierten Download.
> Anonymes S3 liefert 403, ein Fremdmandant mit Downloadrecht 404.
> Der Teststarter wählt den echten S3-Adapter explizit statt des In-Memory-
> Testdefaults. Fotofall 120 s; bestehende Budgets unverändert (Wachbuch/
> Identität 120 s, SOP 180 s); eigene Container entfernt.
> Ein vorheriger ungesteuerter Zustandscheck war racy und bleibt als Fehlversuch
> dokumentiert. [CI 43916713656](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43916713656)
> bestand auf `31e63726d8b377abafe564da349c3aa622468291` 7/7;
> Root-Protokoll: 4/4 und Cleanup. Keine Geräte-/Providerabnahme.

> **Gehostete Phase-11-Evidenz:** Run [43906594339](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43906594339)
> auf `6ead55c` bestand insgesamt nur 5/7, aber die drei echten Browserjourneys
> im Root-Job bestanden. Der separate Offline-Fixture scheiterte nach dem
> Rechte-Gating an fehlenden Standort-/Mitarbeiter-Leserechten. `4524f12` ergänzt
> genau diese Fixture-Grants und prüft geladene Referenz-IDs; lokal wieder 1/1.
> Korrekturlauf [43908926864](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43908926864)
> bestand auf `4524f121420dd66829feafe7b7aed07aece7a338` **7/7 Jobs**,
> einschließlich beider getrennter Browser-Suiten und des Linux-Restore-Drills.
> Aktuelle Korrektur-CI und exakte SHAs: [Projektstatus](../PROJECT_CURRENT_STATUS.md).

> **Vorheriger Phase-11-Browsernachweis:** Die echte Chromium-/Express-/PostgreSQL-
> Suite bestand lokal **3/3**. Zusätzlich zu den beiden Wachbuch-/Identitätsfällen
> erfolgt eine SOP-Veröffentlichung mit getrennten Erstellungs-, Prüfungs- und
> Freigabekonten. Ein reines Mitarbeiterkonto öffnet ohne automatische Bestätigung,
> bestätigt bewusst offline, lädt offline neu und wiederholt nach verlorener echter
> Serverquittung exakt dieselbe Mutations-/Versions-/Zuweisungsbindung. Die Queue
> verschwindet erst nach erfolgreicher Wiederholung; ein weiterer Reload zeigt
> „Serverbestätigt“. Dabei wurden ungültige leere optionale SOP-Formularwerte und
> fehlende `version_id`-Werte der Mitarbeiterantwort korrigiert. Der Wachbuchtest
> wartet nach Reload auf tatsächlich valide geladene Formularfelder; ersetzte
> Referenzdaten verwenden dieselben gültigen Defaults für Anzeige und Submit.
> Der SOP-only-Mitarbeiter erzeugt über Login und Reloads keine unberechtigten
> Basis-GETs mehr; die Navbar zeigt durchgehend seine tatsächliche Sitzungsrolle.
> Storetests erhalten Tenant-/Site-/Own-Grants getrennt und zeigen echte
> Serverablehnungen weiterhin an. Voller Frontendlauf 184/184 mit unverändertem
> Standard-5-s-Budget; keine Performance- oder vollständige Rollenabnahme.
> Keine Browser-Foto-/Scanner-/Provider-/physische Geräteabnahme; gehostete
> Ergebnisse der getrennten Suiten siehe Evidenzblock oben.

> **Vorheriger Phase-11-Nachweis:** Die authentifizierte Chromium-/Express-/PostgreSQL-Suite bestand damals **2/2**. Zusätzlich zum Replay-/Abmeldetest bleibt eine offene Mutation bei Wechsel zu einem anderen Konto desselben Mandanten und zum ursprünglichen Konto in einem anderen Mandanten unangetastet und unsichtbar; erst nach Rückkehr zur ursprünglichen Identität wird sie genau einmal übertragen und persistiert. Der Test fand außerdem, dass `restoreSession` das reale `userId`-Feld von `/auth/me` nicht las; die Korrektur ist durch Unit- und echte Browser-Erfassung nach Reload belegt. Keine Foto-/SOP-/Geräteabnahme in diesem damaligen Umfang.

> **Historischer erster Phase-11-Browsertest (16.11.2026):** `npm run test:browser:backend` bestand damals lokal **1/1** mit echtem Express-Backend, Cookie-/CSRF-Sitzung, frischer PostgreSQL-16-Datenbank und Migrationen bis 042. Chromium erfasst offline, lädt offline neu und meldet sich nach Wiederverbindung erneut an. Der Test lässt den echten Server die erste Mutation speichern, verwirft ausschließlich die Antwort im Browser und prüft beim Retry dieselbe Mutation-ID, dieselbe Server-ID, eine geleerte Outbox und genau einen über die authentifizierte API nach Reload lesbaren Wachbucheintrag. Keine API-Antworten werden hierfür erfunden. Gehostete Ausführung stand zu diesem Zeitpunkt noch aus; spätere Ergebnisse stehen oben. Foto-/Scanner-/Providerbetrieb, Konten-/Tenantwechsel und physische Geräte waren nicht Teil dieses ersten Tests.
>
> Der erste reale Durchlauf deckte leere Standort-/Mitarbeiter-IDs auf, wenn das Wachbuch vor Abschluss der Stammdatenladung montiert wurde. Die Form verwendet nun dieselben nachgeladenen Standardwerte für Anzeige und Speicherung und weist fehlende Referenzen sichtbar zurück. Ein zusätzlicher Vitest-Regressionstest und der echte Backend-Browsertest bestanden nach der Korrektur.

> **Historische Phase-11-CI-Konfiguration (16.11.2026):** Der vorhandene isolierte Chromium-Test wurde im Frontend-CI-Job eingerichtet (Chromium-Installation, Fehler-Trace und Screenshot). Lokal bestand er damals 1/1; gehostete Ausführung stand noch aus. Der Test bleibt eine Loopback-Fixture und keine authentifizierte Backend-/Geräteabnahme. Der aktuelle Ausführungsstand steht oben.

> **Historische Szenariomatrix:** Die 18 Einträge unten dokumentieren damalige lokale Prüfungen, keine aktuelle Browser-/Geräteabnahme. Insbesondere Szenario 2 prüft nur lokale IndexedDB-Validierung und ist kein Nachweis für Upload-/Replay-Verhalten; dieses Verhalten wird in aktuellen Offline-Sync-Tests separat geprüft.
> **Aktueller Stand (15.11.2026):** PR [#64](https://github.com/Xonni-star/SecurityOps-2.0/pull/64) ist in `main` gemergt (`621874535ee480e56716ae8a7bd992272bc7a51a`). Migration 041 ergänzt tenant-scoped Idempotenzquittungen für den Wachbuchanhang-Upload. Anhänge mit gespeicherter `userId` können nach Wiederverbindung idempotent hochgeladen werden. Lokale Altanhänge ohne `userId` werden nicht automatisch hochgeladen oder einem Benutzer zugewiesen; die UI warnt davor, und der Benutzer muss sie erneut hinzufügen. Ein Altanhang mit bereits bestätigtem Eintrag und nicht-UUID lokaler ID kann nicht verknüpft werden. Main-CI-Lauf [43760703980](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43760703980) lief beim letzten Statuscheck noch.
> **Veröffentlichte Korrektur (16.11.2026):** Ein bestätigtes MEDIUM-Finding zur tenantweiten Sichtbarkeit und zum Export ownerloser lokaler Anhänge wurde behoben. Die Oberfläche zeigt weder Dateimetadaten noch Inhalte; die Daten bleiben lokal. Frontend-Regressionstests, Typcheck und Produktionsbuild bestanden. Die Revision ist veröffentlicht; exakte CI-Prüfgrenzen stehen im aktuellen Projektstatus. Ein sicherer Recovery-Pfad bleibt offen.

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
| 11 | Widerruf eines Gerätes | **OFFEN (aktiver Stack)** | Historisch als BESTANDEN bezeichnet; aktiver Push-Controller prüft keinen Gerätewiderruf. Kein aktueller Nachweis. |
| 12 | Große Anhänge (>5 MB) | **BESTANDEN** | Validierung wirft verständliche Fehlermeldung |
| 13 | Veraltete Sync-Cursor | **OFFEN (aktiver Stack)** | Historisch als BESTANDEN bezeichnet; kein registrierter Delta-Pull-Endpunkt im aktiven Express-Backend. |
| 14 | Teilweise fehlgeschlagene Batches | **BESTANDEN** | Erfolgreiche Einträge quittiert, fehlerhafte bleiben in Outbox |
| 15 | Falsche Gerätezeit | **NICHT VERIFIZIERT für alle Module** | Historische Sequenzzusage nicht auf den aktiven Stack übertragbar; Zeitprüfungen sind modulabhängig. |
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

## Historical browser validation snapshot (PR #52, 2026-11-15; status checked 20:30 CET)

> PR #52 has since merged. The test results and fixture/device limitations below describe that snapshot and remain useful evidence, but the open-PR state is historical. See [current project status](../PROJECT_CURRENT_STATUS.md) and the [Phase 9 report](../PHASE_9_COMPLETION_REPORT.md).

Open PR [#52](https://github.com/Xonni-star/SecurityOps-2.0/pull/52) adds a Playwright/Chromium loopback scenario covering offline guardbook capture, reload persistence of the outbox entry and photo, reconnect, and retry after a deliberately lost receipt. The retry uses the same mutation ID and produces one effect in the local fixture. The PR reports three focused Vitest files / 48 tests, typecheck, production build, and `npm run test:browser -- --workers=1` passing on head `9dddf9e5a4c4ca2cbd0cfee7e924a30d3d7eefd1`; hosted CI run [43750985353](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43750985353) passed 7/7 jobs. The PR remains open and unmerged.

This browser test uses a loopback fixture, not the authenticated application backend or production services; backend/device acceptance remains incomplete. The DMS upload API has no idempotency key or retry lookup and generates a new document ID, so photo upload/replay is not implemented. Photos persist locally as **unsynced**. No UI or report should claim that a photo has synchronized.

## Offline guardbook exercise (2026-11-15; pre-PR-64)

> **Historischer Teststand vor PR #64:** Die folgenden lokalen Tests und Aussagen zum fehlenden Foto-Replay beschreiben den Vor-Merge-Stand. Sie dürfen nicht als aktueller Mainline-Verhaltensstand gelesen werden; aktueller Stand und Grenzen stehen oben.

Current local verification:

- `cd frontend && npm test` — 24 test files, 140 tests passed.
- `cd frontend && npm run typecheck` — passed.
- `cd frontend && npm run test:browser -- --workers=1` — passed in Chromium against a dedicated fixture server bound to `127.0.0.1`; no production endpoint, shared service, or Docker container was used.
- `tests/offlineGuardbookReconnect.test.ts` uses jsdom events, an isolated `fake-indexeddb` database, and a mocked API. It simulates offline capture, IndexedDB close/reopen, reconnect, a missing receipt followed by retry with the same mutation ID, and a guardbook conflict receipt retained in the outbox.
- `tests/storeApiIntegration.test.ts` separately checks partial/missing receipts and retry behavior. `tests/GuardBookModule.test.tsx` checks duplicate submission protection and retrying a failed local photo write without recreating the entry.

The browser test exercises Chromium's actual offline/online network transition with `context.setOffline`, service-worker control, an offline queue write, reload while offline, and IndexedDB persistence of the same mutation and unsynced photo record. On reconnect, the local fixture commits the mutation but deliberately drops the first response; the browser retries with the same mutation ID, receives the same receipt, and the fixture reports exactly one server-side effect. The browser test uses an isolated in-memory test fixture, not the application backend; unit tests remain the evidence for conflict receipts, partial receipts, and duplicate-submit protection.

### Chromium offline/reconnect scenario — PASSED against isolated fixture

The first probe found that the app did not register its service worker and the service worker precache referenced paths not emitted by Vite. Production builds now register the worker and precache the built root/manifest files. The Playwright test now serves the built app and API fixture from a separate loopback-only Node server; it uses Chromium offline emulation rather than Playwright request interception. This validates browser persistence/reconnect behavior against a controlled local fixture, not a live backend or physical device.

At the time of this pre-PR-64 exercise, authenticated backend/device acceptance and photo replay were **INCOMPLETE**. The guardbook form wrote photo data only to IndexedDB; the then-existing DMS upload contract did not support safe idempotent retry after a lost response. PR #64 subsequently added that server-side idempotency support and a user-owned upload path, with the legacy-data limitations described above. Authenticated-backend/device acceptance remains incomplete.
