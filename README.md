# SecurityOps 2.0 — Sicherheitsdienstverwaltung

Mandantenfähige Verwaltungssoftware für Sicherheitsunternehmen mit Prozessbezug zu **DIN 77200** und **§ 34a GewO**: Dienstplanung, Objekt- und Mitarbeiterverwaltung, digitales Wachbuch, Übergabe- und Kontrollgangsmanagement, Schlüssel- und Aufgabenverwaltung sowie Offline-Synchronisation für den mobilen Einsatz. Das ist keine Zertifizierungs- oder Rechtskonformitätsaussage.

> **Projektstatus: In Entwicklung; nicht für Produktion freigegeben.**
> Die Backend- und Frontend-Funktionen werden durch lokale Tests und CI geprüft. Das ist kein Nachweis eines Produktions-Rollouts, einer fachlichen Abnahme oder der Rechtskonformität im konkreten Einsatz.
> Der aktuelle quellcodebasierte Stand, Befunde und Prüfgrenzen stehen im [Phase-1-Abschlussbericht](./PHASE_1_INTEGRATION_COMPLETION_REPORT.md). Frühere Umsetzungsberichte sind historische Snapshots.
> Alarmmanagement (#12), Übergaben (#13) und Kontrollgänge (#14) sind in `main` integriert. Details: [Handovers-API](./frontend/HANDOVERS_API.md), [Alarm-API](./frontend/ALARM_EMERGENCY_API.md) und [Kontrollgang-Modul](./frontend/PATROL_MANAGEMENT.md).
> **GitHub-Status (geprüft 15.11.2026, 20:30 CET):** `main` steht auf `d06c2d835270b43bd36bb3585fc45d7da7d58a50` ([Commit](https://github.com/Xonni-star/SecurityOps-2.0/commit/d06c2d835270b43bd36bb3585fc45d7da7d58a50)); PRs #47–#49 sind gemergt. PRs [#50](https://github.com/Xonni-star/SecurityOps-2.0/pull/50)–[#58](https://github.com/Xonni-star/SecurityOps-2.0/pull/58) sind gegen `main` offen. Hosted CI bestand 7/7 Jobs für alle PRs #50–#58. PR #56s frühere Backend/DMS-Fehler, PR #57s Restore-Fehler und PR #58s ausstehende Jobs wurden durch grüne Läufe ersetzt. PR #57s RLS-Korrektur und PR #58s Dependency-Override sind offen/unmerged. Main-CI [43726729355](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43726729355) bestand 7/7 Jobs und Release-Artefakt-Prüfung [43726964671](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43726964671) 2/2 auf genau diesem Commit. Der CD-Workflow erzeugt und prüft ein Artefakt, deployed aber nicht. Weitere Offline-, Restore-, Performance-, Berechtigungs-, Mobile-UI-, E2E/API-, Installer- und Dependency-Ergebnisse sind teils worktree-lokal oder in offenen PRs und nicht Teil dieses Mainline-Nachweises. Foto-Upload/-Replay fehlt; Performancewerte sind keine Produktions-Kapazitätsaussage und die mobile UI wurde nicht authentifiziert visuell geprüft. Details: [Mainline-Status](./MAINLINE_INTEGRATION_STATUS.md), [Phase-8-Prüfbericht (PARTIAL/BLOCKED)](./PHASE_8_COMPLETION_REPORT.md) und [Deployment-/Restore-Status](./frontend/deploy/PRODUCTION_DEPLOYMENT.md). Keine Produktionsabnahme oder -freigabe.
> **Offener Berechtigungsbefund auf `main`:** Site-scoped `documents:read` legt kundenverknüpfte Dokumente über Site-Grenzen hinweg offen. Das separate Worktree reproduziert den Bypass mit Migration 039; offenes PR [#57](https://github.com/Xonni-star/SecurityOps-2.0/pull/57) (Head `4af714b664ac0ba0d30869a8f76a9170e604b001`) enthält Migration `frontend/backend/src/migrations/040_customer_document_tenant_scope.sql` und weist den Zugriff mit 040 ab. `auth_site_scope.test.ts` (14/14), Migration/RLS-Tests (4/4), Backend-Build und der aktualisierte vollständige Restore-Test bestanden im Branch. Hosted CI bestand 7/7 Jobs einschließlich Backend, DMS und Restore. Migration 040 ist nicht auf `main`; bis zum Merge und zur Verifikation bleibt der Befund dort offen. Details: [Mainline-Status](./MAINLINE_INTEGRATION_STATUS.md).
> **Dependency-Audit PR #58:** Offenes PR [#58](https://github.com/Xonni-star/SecurityOps-2.0/pull/58) begrenzt eine Backend-Dev-Abhängigkeit auf `deepmerge@4.1.1`, unterhalb des betroffenen Bereichs der bestätigten GHSA-gcqx-w48m-w2h4 (`>=4.2.0` bis `4.3.1`). Branch-local audit/build/focused tests bestanden; das lokale Full Jest meldete 10 failing suites / 171 tests, darunter Integrationen ohne lokales PostgreSQL und CORS-Erwartungsfehler. Hosted CI ist aktuell 7/7 grün; die lokalen Full-Suite-Ergebnisse sind davon getrennt. Das Override ist unmerged und belegt keine Behebung auf `main`. Details: [Mainline-Status](./MAINLINE_INTEGRATION_STATUS.md).
> **Phase 6:** Die Navbar verwendet semantische, tastaturbedienbare Buttons für Dashboard- und Suche-Navigation, zugängliche Namen für Icon-Aktionen und einen beschrifteten Online-/Offline-Schalter. PR [#46](https://github.com/Xonni-star/SecurityOps-2.0/pull/46) ist am 15.11.2026 in `main` gemergt worden. Der frühere Phase-6-Bericht dokumentiert die Ergebnisse und den PR-Status zum damaligen Prüfzeitpunkt; sein PR-Status ist historisch. Details: [Phase-6-Bericht](./PHASE_6_IMPLEMENTATION_REPORT.md).
> **Phase 7:** PR [#47](https://github.com/Xonni-star/SecurityOps-2.0/pull/47) wurde in `main` integriert. Der [Phase-7-Bericht](./PHASE_7_READINESS_REPORT.md) hält Implementierungsumfang, damalige Tests, Evidenzgrenzen und verbleibende Produktionsgates fest. Der Merge ist keine Produktionsfreigabe.

---

## Architektur

| Verzeichnis | Inhalt |
|---|---|
| `frontend/` | React-19-SPA mit Vite, TypeScript, Zustand-Store, IndexedDB-Outbox und Vitest |
| `frontend/backend/` | Node.js/Express/TypeScript-REST-API (`/api/v1`) mit PostgreSQL 16+ Row-Level-Security, serverseitig widerrufbaren Cookie-Sitzungen und Argon2id |
Es gibt kein separates Root-Proxy-Backend. Alle SecurityOps-Backend-Befehle (Migrationen, Seed, Tests) laufen unter `frontend/backend/`.

---

## Voraussetzungen

* **Node.js ≥ 24.15.0** (siehe `.nvmrc`: `24`) und npm
* **PostgreSQL 16+**
* Zwei Datenbankrollen:
  * `secops_admin` — ausschließlich für DDL-Migrationen und Schema-Upgrades
  * `secops_app_user` — operativer Betrieb, **ohne** Superuser- oder `BYPASSRLS`-Rechte

---

## Schnellstart

```bash
git clone https://github.com/Xonni-star/SecurityOps-2.0.git
cd SecurityOps-2.0

# Abhängigkeiten
npm install
npm --prefix frontend install
npm --prefix frontend/backend ci

# Konfiguration
cp frontend/backend/.env.example frontend/backend/.env
# → Werte in frontend/backend/.env eintragen (siehe unten)

# Datenbank vorbereiten
npm --prefix frontend/backend run migrate
npm --prefix frontend/backend run seed

# Frontend + Backend parallel starten
npm run dev
```

`npm run dev` startet das Vite-Frontend und das SecurityOps-Backend (Standard-Port `8000`).

---

## Umgebungsvariablen (`frontend/backend/.env`)

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `PORT` | nein | HTTP-Port des Backends (Standard: `8000`) |
| `NODE_ENV` | nein | `development` \| `test` \| `production` |
| `DATABASE_URL` | **ja** | Verbindung als `secops_app_user` (RLS-Operationen) |
| `DATABASE_MIGRATION_URL` | Migrationen/Seed: **ja** | Verbindung als `secops_admin`; nicht für den laufenden API-Prozess |
| `JWT_SECRET` | **ja (Legacy-Konfigurationsprüfung)** | Mindestens 32 Zeichen; aktuelle Sitzung verwendet opake Cookies und signiert keine JWTs |
| `JWT_EXPIRES_IN` | nein | Sitzungsdauer im Format `<Zahl><s\|m\|h\|d>`, z. B. `8h` |
| `CORS_ORIGIN` | **ja** | Kommagetrennte Whitelist, z. B. `http://localhost:3000` |
| `RATE_LIMIT_MAX` | nein | Globales per-IP-Limit je Minute (Standard `120`) |
| `RATE_LIMIT_REDIS_URL` | Entwicklung: nein; Produktion: **ja** | Gemeinsamer Redis-Store für API-Limits; alle Backend-Replikas müssen dieselbe Redis-Instanz verwenden |

Das Backend verweigert den Start bei fehlenden, ungültigen oder offensichtlich unsicheren Secrets.

---

## Module

| Modul | Status | Anmerkung |
|---|---|---|
| Kunden | API integriert | Mandantengeschützte Liste, Anlage, Änderung, Archivierung und Offline-Mutationen |
| Objekte | API integriert | Mandantengeschützte CRUD-/Archiv-/Wiederherstellungs- und Sync-Pfade |
| Mitarbeiter | API integriert | Stammdaten, Zuordnungen, Qualifikationen, Abwesenheiten und Kontoverknüpfung; Berechtigungen bleiben serverseitig |
| Schichten | API integriert, fachliche Abnahme offen | Konfigurierbare tägliche, wöchentliche und monatliche Arbeitszeitregeln sind für aktive, freigegebene Profilversionen implementiert; daraus folgt keine allgemeine Arbeitszeit-, Ruhezeit-, Tarif- oder Rechtskonformitätsprüfung |
| Schlüssel und Aufgaben | API integriert | CRUD und Sync-Pfade; eine vollständige Offline- und Revisionshistorie ist nicht für alle Aktionen nachgewiesen |
| Wachbuch | API integriert | Lesen, Erfassung, append-only Korrekturergänzungen und Sync; keine vollständige Abnahme aller Offline-/Auditfälle |
| Dokumente | implementiert, nicht deployed | Tenant-scoped API, private Dateispeicherung, Versionen, Kategorien/Ordner, Audit, Beziehungen und ClamAV-Adapter; Offline-Binärdateien fehlen. PR #37 ergänzt einen isolierten PostgreSQL-/MinIO-/ClamAV-API-Flow in CI; dies belegt keine Produktionsverfügbarkeit oder Produktionsabnahme. |
| SOPs | implementiert, nicht deployed | Versionierter Prüf-/Freigabe-Workflow, Zuweisungen, Bestätigungen und Berichte; Details siehe [SOP-API](./frontend/SOP_API.md) |
| Alarme/Notfallpläne | implementiert, nicht deployed | Versionierte Pläne, Vorfälle, Ereignisse, Offline-Queue und Eskalationsworker; externe E-Mail-/Push-Zustellung ist nicht konfiguriert |
| Übergaben | in `main` integriert, nicht deployed | Tenant-scoped Protokolle, getrennte Bestätigungen, Ereignisse, übernommene Aufgaben, DMS-Links und Offline-Sync |
| Kontrollgänge | in `main` integriert, nicht deployed | RLS, QR/NFC/manuelle Scans, versionierte Routen, Gruppen, Termin-Vorkommen, Abweichungen und Offline-Sync; externe Benachrichtigung und Offline-Binäranhänge fehlen |
| Benutzer/Rechte | in `main` integriert | Tenant-scoped Benutzerverwaltung, Rollen/Grants, Passwort-Reset-Zustellungsschnittstelle und standortbezogene Autorisierung; Online-Adminfunktionen, keine Produktionsfreigabe |
| Mandantenverwaltung | Phase-7-Inkrement | Systemweite Anlage, Bearbeitung und Deaktivierung durch `is_superadmin`; getrennt von Tenant-Benutzern und Sitzungswechsel, Änderungen werden tenant-scoped auditiert. Details: [Mandantenverwaltungs-API](./frontend/TENANT_ADMINISTRATION_API.md). |
| API-Rate-Limit | in `main` integriert | Per-IP-Limit mit gemeinsamem Redis-Store; Redis ist im Produktionsmodus erforderlich |
| Offline-Sync | IndexedDB-Outbox und modulbezogene Sync-Pfade, einschließlich des begrenzten, persistenten Retry-Backoffs aus gemergtem PR [#32](https://github.com/Xonni-star/SecurityOps-2.0/pull/32) | Nicht jede Funktion und jedes Binärartefakt ist offline verfügbar; Fotos haben aktuell keinen Upload-/Replay-Pfad und werden nicht synchronisiert. Offline-Sync ist keine Zusicherung für Hintergrundausführung nach dem Schließen des Browsers; reale Browser-/Geräte-/Backend-Abnahme ist offen. |
| Dienstplanung | Backend/UI und weitergehende Workflows einschließlich konfigurierbarer täglicher, wöchentlicher und monatlicher Arbeitszeitlimits aus gemergten PRs [#33](https://github.com/Xonni-star/SecurityOps-2.0/pull/33) und [#36](https://github.com/Xonni-star/SecurityOps-2.0/pull/36) | Die Regeln gelten nur bei Konfiguration in einer aktiven, freigegebenen Profilrevision. Kalender-/Planungsabläufe und fokussierte Berliner DST-Tests sind keine Rechtskonformitäts- oder fachliche Produktionsabnahme. Aktueller Integrationsstatus: [Mainline-Integrationsbericht](./MAINLINE_INTEGRATION_STATUS.md) |

Eine Produktions-Compose-Konfiguration ist vorhanden: [docker-compose.production.yml](./frontend/deploy/docker-compose.production.yml). Ihre Existenz belegt nicht, dass Services tatsächlich in Produktion deployed oder abgenommen wurden; die Statusangaben oben bleiben maßgeblich.

---

## Tests und Build

```bash
# Backend (Jest, inkl. PostgreSQL-RLS-Integrationstests)
npm --prefix frontend/backend test

# Frontend (Vitest)
npm --prefix frontend test

# Produktions-Build
npm --prefix frontend run build
npm --prefix frontend/backend run build

# Dependency audits
npm --prefix frontend audit
npm --prefix frontend/backend audit
npm --prefix frontend/backend audit --omit=dev
```

Audit snapshot (2026-11-15): `npm --prefix frontend audit` found 0 vulnerabilities. The full backend audit found 7 LOW findings for `deepmerge@4.3.1` (GHSA-gcqx-w48m-w2h4) in Jest/`ts-jest` development dependencies; `npm --prefix frontend/backend audit --omit=dev` found 0 production findings. Do not force the breaking Jest downgrade suggested by npm.

---

## Sicherheit

* **Mandantenisolation:** RLS und `FORCE ROW LEVEL SECURITY` sind für ausgewählte tenantgebundene Tabellen konfiguriert; dies gilt nicht pauschal für jede historische Tabelle. Tenant-scoped API-Zugriffe setzen ihren Datenbankkontext aus der authentifizierten Sitzung. Bekannte modulbezogene Grenzen stehen in den jeweiligen API-/Sicherheitsdokumenten.
* **Least Privilege:** Der operative Benutzer `secops_app_user` besitzt weder Superuser- noch `BYPASSRLS`-Rechte; die Rolle wird beim Serverstart verifiziert.
* **Authentifizierung:** Argon2id-Passworthashes, opake zufällige `HttpOnly`-Sitzungscookies, Datenbank-Widerruf, CSRF-Schutz und kontoabhängiger Lockout nach Fehlversuchen. Ein per-IP-API-Limit kann einen gemeinsamen Redis-Store verwenden; im Produktionsmodus ist Redis erforderlich. Ohne Redis im Entwicklungsmodus bleibt der Zähler pro Prozess.
* **Offline-Sync:** Idempotente Mutationen über `POST /api/v1/sync/push`; Übergaben verwenden zusätzlich `POST /api/v1/handovers/sync`, Advisory Locks und persistente Quittungen. Lokale Erfassung bleibt bis zur API-Quittung ausstehend; Konflikte überschreiben keine bestätigten Protokolle.

---

## Dokumentation

* [frontend/README.md](./frontend/README.md) — detaillierte Architektur-, Build- und Testhinweise
* [frontend/INSTALLATION_GUIDE.md](./frontend/INSTALLATION_GUIDE.md) — Installation und Inbetriebnahme
* [frontend/SYSTEM_OVERVIEW.md](./frontend/SYSTEM_OVERVIEW.md) — Systemüberblick
* [frontend/HANDOVERS_API.md](./frontend/HANDOVERS_API.md) — Übergabe-API, Statusmodell und Offline-Synchronisierung
* [frontend/USER_ADMINISTRATION_API.md](./frontend/USER_ADMINISTRATION_API.md) — Benutzer-/Rollen-API, Berechtigungsgrenzen und Reset-Ablauf
* [frontend/TENANT_ADMINISTRATION_API.md](./frontend/TENANT_ADMINISTRATION_API.md) — systemweite Mandantenverwaltung und Abgrenzung zu Benutzerverwaltung und Sitzungswechsel
* [MAINLINE_INTEGRATION_STATUS.md](./MAINLINE_INTEGRATION_STATUS.md) — aktueller Mainline-, PR- und Validierungsstatus einschließlich Evidenzgrenzen
* [PHASE_8_COMPLETION_REPORT.md](./PHASE_8_COMPLETION_REPORT.md) — Phase-8-Prüfstand, ausdrücklich PARTIAL/BLOCKED, mit getrennten Mainline- und Worktree-Nachweisen
* [PHASE_5_IMPLEMENTATION_REPORT.md](./PHASE_5_IMPLEMENTATION_REPORT.md) — historischer Phase-5-Implementierungs- und Test-Snapshot; PR-/Mainline-Status siehe Integrationsbericht
* [PHASE_6_IMPLEMENTATION_REPORT.md](./PHASE_6_IMPLEMENTATION_REPORT.md) — Navbar-Zugänglichkeitskorrektur, Test- und CI-Evidenz, offene Abnahme und Phase-7-Empfehlungen
* [PATROL_IMPLEMENTATION_REPORT.md](./PATROL_IMPLEMENTATION_REPORT.md) — historischer Patrol-Implementierungs- und Verifikationssnapshot; PR #14 ist gemergt
* [frontend/SECURITY_AUDIT.md](./frontend/SECURITY_AUDIT.md) — historischer Sicherheitsaudit-Snapshot und aktueller Verweis
* [frontend/KNOWN_ISSUES.md](./frontend/KNOWN_ISSUES.md) — bekannte Einschränkungen
* [docs/development/NEXT_DEVELOPMENT_REPORT.md](./docs/development/NEXT_DEVELOPMENT_REPORT.md) — historischer Implementierungsbericht zu Benutzer-/Rechteverwaltung
* [PHASE_1_INTEGRATION_COMPLETION_REPORT.md](./PHASE_1_INTEGRATION_COMPLETION_REPORT.md) — aktueller quellcodebasierter Umsetzungsstand, Befunde und Prüfgrenzen
* [frontend/SERVICE_PLANNING_SPECIFICATION.md](./frontend/SERVICE_PLANNING_SPECIFICATION.md) — Dienstplanungs-Spezifikation und Phase-2-Implementierungsstand
* [PHASE_2_FINAL_COMPLETION_REPORT.md](./PHASE_2_FINAL_COMPLETION_REPORT.md) — Phase-2-Implementierungs- und Validierungssnapshot; aktuelle PR-/Mainline-Status siehe Integrationsbericht
* [PHASE_2_SERVICE_PLANNING_COMPLETION_REPORT.md](./PHASE_2_SERVICE_PLANNING_COMPLETION_REPORT.md) — historischer Backend-/Frontend-Implementierungsbericht
* [FINAL_COMPLETION_REPORT.md](./FINAL_COMPLETION_REPORT.md) — historischer Umsetzungsstand
* [DMS_IMPLEMENTATION_REPORT.md](./DMS_IMPLEMENTATION_REPORT.md) — DMS-Umfang, Sicherheitsmodell, Tests und offene Einschränkungen
* [frontend/ALARM_EMERGENCY_API.md](./frontend/ALARM_EMERGENCY_API.md) — Alarm-/Notfall-API, Berechtigungen und Workflow
* [ALARM_EMERGENCY_IMPLEMENTATION_REPORT.md](./ALARM_EMERGENCY_IMPLEMENTATION_REPORT.md) — umgesetzter Umfang, Validierung und Einschränkungen

---

## Lizenz

Für dieses Repository ist derzeit keine Lizenz hinterlegt.
