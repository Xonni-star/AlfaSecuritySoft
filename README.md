# SecurityOps 2.0 — Sicherheitsdienstverwaltung

Mandantenfähige Verwaltungssoftware für Sicherheitsunternehmen mit Prozessbezug zu **DIN 77200** und **§ 34a GewO**: Dienstplanung, Objekt- und Mitarbeiterverwaltung, digitales Wachbuch, Übergabe- und Kontrollgangsmanagement, Schlüssel- und Aufgabenverwaltung sowie Offline-Synchronisation für den mobilen Einsatz. Das ist keine Zertifizierungs- oder Rechtskonformitätsaussage.

> **Projektstatus: In Entwicklung; nicht für Produktion freigegeben.**
> Die Backend- und Frontend-Funktionen werden durch lokale Tests und CI geprüft. Das ist kein Nachweis eines Produktions-Rollouts, einer fachlichen Abnahme oder der Rechtskonformität im konkreten Einsatz.
> Der aktuelle quellcodebasierte Stand und Prüfgrenzen stehen in [PROJECT_CURRENT_STATUS.md](./PROJECT_CURRENT_STATUS.md), der [Modul-Evidenzmatrix](./MODULE_IMPLEMENTATION_STATUS.md) und dem [Projekt-Tracker](./PROJECT_COMPLETION_TRACKER.md). Frühere Umsetzungsberichte einschließlich Phase 1 sind historische Snapshots.
> Alarmmanagement (#12), Übergaben (#13) und Kontrollgänge (#14) sind in `main` integriert. Details: [Handovers-API](./frontend/HANDOVERS_API.md), [Alarm-API](./frontend/ALARM_EMERGENCY_API.md) und [Kontrollgang-Modul](./frontend/PATROL_MANAGEMENT.md).
> **GitHub-Status (16.11.2026):** `main` steht auf `9df02aaa5ef01de78e0fe5d53be446b2037db24d`; PRs #50–#65 sind gemergt und PR [#66](https://github.com/Xonni-star/SecurityOps-2.0/pull/66) ist der einzige offene PR. Main-CI [43762052960](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43762052960) bestand 7/7 Jobs und die Release-Artefakt-Prüfung [43762359834](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43762359834) 2/2 auf diesem SHA.
> Zuletzt vollständig gehostet geprüfter Code: `3110bbbda1655e804cba35c89ccbda5174e84444`, [CI 43932552825](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43932552825) **7/7 Jobs**; Logs: Frontend **212/212**, Backend **546/546**, echte Browserjourneys **7/7** einschließlich kritischer Offline-Folgeaufgabe und tatsächlicher GET-Daten/Reader-403. Frühere Fehlläufe bleiben dokumentiert.
> FNL-013 ersetzt erfundene API-/Abnahmeergebnisse durch eine echte schreibgeschützte API-Konsole und einen manuellen Prüfplan; generische Automationen bleiben ausdrücklich lokale Entwürfe ohne Engine. Nachfolgendes FNL-014 schützt Kunden-/Objekt-/Mitarbeiterentwürfe vor vorzeitigem Schließen und verspäteten fremden Antworten. Lokal dafür: **242/242 Frontendtests in 35 Dateien**, Typprüfung/Build und **7/7 echte Browserjourneys**; exakte neue Hosted-Prüfung steht separat aus.
> **Projektstatus: TEILWEISE IMPLEMENTIERT / OFFEN; nicht für Produktion freigegeben.** Vollständige Rollen-/Objekt-/Geräteabnahme, realer S3-Provider-Restore und gemessene RPO/RTO bleiben offen. Exakte Revisions-/Prüfgrenzen: [PROJECT_CURRENT_STATUS.md](./PROJECT_CURRENT_STATUS.md), [Phase-11-Bericht](./FINAL_PHASE_11_COMPLETION_REPORT.md) und [Deployment-/Restore-Runbook](./frontend/deploy/PRODUCTION_DEPLOYMENT.md).
> **Historischer GitHub-Status (15.11.2026, 20:59 CET):** `main` stand auf `879ae951d6cea52fd84d01dc699cf2ed08843300`; PRs #50–#59 waren gemergt und es waren keine PRs offen. Post-Merge-CI [43754217295](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43754217295) bestand 7/7 Jobs; Paketierung und Artefaktvalidierung [43754417115](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43754417115) bestanden 2/2. Diese Ergebnisse belegen keine Produktion. Frühere Phase- und PR-Statusangaben in diesem README sind historische Snapshots, keine Live-Statusquelle.
> **Historischer Status-Snapshot (15.11.2026, 20:30 CET):** Die folgenden Berechtigungs- und Dependency-Audit-Absätze beschreiben den damaligen Stand, als PRs #57 und #58 noch offen waren. Beide PRs wurden inzwischen gemergt; der aktuelle Mainline- und CI-Status steht in [PROJECT_CURRENT_STATUS.md](./PROJECT_CURRENT_STATUS.md). Die damaligen Branch-Tests bleiben historische Evidenz und werden nicht als neue Mainline-Ergebnisse umgedeutet.
> **Berechtigungsbefund und PR #57 zum Snapshotzeitpunkt:** Site-scoped `documents:read` legte kundenverknüpfte Dokumente über Site-Grenzen hinweg offen. Das separate Worktree reproduzierte den Bypass mit Migration 039; PR #57 (Head `4af714b664ac0ba0d30869a8f76a9170e604b001`) enthielt Migration `frontend/backend/src/migrations/040_customer_document_tenant_scope.sql`. Migration 040 ist inzwischen Teil von `main` über PR #57.
> **Dependency-Audit PR #58 zum Snapshotzeitpunkt:** PR #58 begrenzte eine Backend-Dev-Abhängigkeit auf `deepmerge@4.1.1`, unterhalb des betroffenen Bereichs der GHSA-gcqx-w48m-w2h4 (`>=4.2.0` bis `4.3.1`). Die Änderung ist inzwischen über PR #58 gemergt. Die damaligen lokalen Audit-/Testresultate sind keine aktuelle Mainline-Audit-Aussage.
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
read -r -s -p 'Testpasswort für Demo-Seed (mindestens 16 Zeichen): ' SECOPS_DEMO_USER_PASSWORD
printf '\n'
export SECOPS_DEMO_USER_PASSWORD
npm --prefix frontend/backend run seed
unset SECOPS_DEMO_USER_PASSWORD

# Frontend + Backend parallel starten
npm run dev
```

`npm run dev` startet das Vite-Frontend und das SecurityOps-Backend (Standard-Port `8000`).
Der optionale Seed verlangt ein eigenes Testpasswort (`SECOPS_DEMO_USER_PASSWORD`,
mindestens 16 Zeichen); keine Seed-Daten oder Konten in produktive Umgebungen übernehmen.

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

**Nachgewiesener Entwicklungsumfang:** Die oben revisionsgebundenen CI-Logs
bestätigen 546 Backendtests in 35 Suites; die authentifizierte
Berechtigungsmatrix umfasst 16 gezielte Fälle, nicht alle Rollen-/Objektkombinationen.
Die aktuelle lokale Suite umfasst 242 Frontendtests mit zwei Workern und
unverändertem Standard-5-s-Budget sowie sieben echte Cookie-/CSRF-/Express-/
PostgreSQL-Browserjourneys. Sie prüfen Besitzerbindung, kritische Offline-
Folgeaufgaben, echte verlorene Quittungen, private MinIO-/ClamAV-Fotoabläufe,
HTTP-415-Ablehnung, getrennte SOP-Konten und echte API-Antworten/HTTP 403.
Formulare bewahren unbestätigte Entwürfe; Reportergebnisse und verspätete lokale
Schreibantworten bleiben identitätsgebunden. Migration 042 erhält veröffentlichte
Prüfsummen; isolierte Restore-Drills prüfen Fehlerpfade, nicht einen externen Provider.
Vollständige Rollen-/Geräte-/Provider-/Produktionsabnahme bleibt offen.
Ergebnisse und verbleibende interne Arbeit:
[Finalisierungsbericht](./FINAL_PROJECT_COMPLETION_REPORT.md),
[Sicherheitsprüfung](./FINAL_SECURITY_AUDIT.md),
[Produktionsreife](./PRODUCTION_READINESS_REPORT.md) und
[Releasecheckliste](./PRODUCTION_RELEASE_CHECKLIST.md).

Die Statusangaben unterscheiden Implementierung und Nachweis: **IMPLEMENTIERT** bedeutet, dass die Funktion im Quellcode vorhanden ist; **IMPLEMENTIERT UND GETESTET** nur, wenn passende Tests für den bezeichneten Umfang nachweislich bestanden sind. **TEILWEISE IMPLEMENTIERT**, **IN ENTWICKLUNG**, **GEPLANT**, **NICHT VERIFIZIERT** und **OFFEN** kennzeichnen Teilumfang, laufende Arbeit, Planung oder ausstehende Evidenz/Abnahme. Kein Status bedeutet Produktionsfreigabe.

| Modul | Status | Anmerkung |
|---|---|---|
| Kunden | IMPLEMENTIERT | Mandantengeschützte Liste, Anlage, Änderung, Archivierung und Offline-Mutationen |
| Objekte | IMPLEMENTIERT | Mandantengeschützte CRUD-/Archiv-/Wiederherstellungs- und Sync-Pfade |
| Mitarbeiter | IMPLEMENTIERT | Stammdaten, Zuordnungen, Qualifikationen, Abwesenheiten und Kontoverknüpfung; Berechtigungen bleiben serverseitig |
| Schichten | TEILWEISE IMPLEMENTIERT | Konfigurierbare tägliche, wöchentliche und monatliche Arbeitszeitregeln gelten für aktive, freigegebene Profilversionen; keine allgemeine Arbeitszeit-, Ruhezeit-, Tarif- oder Rechtskonformitätsprüfung |
| Berichte | IMPLEMENTIERT UND GETESTET | Server-seitige Tenant-/Standortgrenzen für vier Berichte und Arbeitszeit-CSV; 16 gezielte authentifizierte PostgreSQL-Berechtigungsfälle im vollständigen 546er-Backendlauf. Frontend-Grants, Identitätsbindung und Kalendertage zusätzlich geprüft; keine vollständige Rollen-/Objektabnahme. |
| Schlüssel und Aufgaben | IMPLEMENTIERT UND GETESTET | API-/Sync-Pfade und bestätigte Formularpersistenz; kritische Offline-Folgeaufgabe mit echtem Quittungsverlust geprüft. Keine vollständige UI-/Historienabnahme aller Aktionen. |
| Wachbuch | TEILWEISE IMPLEMENTIERT | Lesen, Erfassung, append-only Korrekturergänzungen und Sync; keine vollständige Abnahme aller Offline-/Auditfälle |
| Dokumente | TEILWEISE IMPLEMENTIERT | Tenant-scoped API, private Dateispeicherung, Versionen und ClamAV. Wachbuchfotos haben echten ownergebundenen Offline-Replay-/Ablehnungsnachweis; das ist keine generische DMS-Offline-Binärsynchronisation oder Providerabnahme. |
| SOPs | IMPLEMENTIERT UND GETESTET | Abgedeckter versionierter Prüf-/Freigabe- und expliziter Offline-Kenntnisnahmepfad mit getrennten Konten; keine vollständige Geräte-/Providerabnahme. Details: [SOP-API](./frontend/SOP_API.md). |
| Alarme/Notfallpläne | TEILWEISE IMPLEMENTIERT | Versionierte Pläne, Vorfälle, Ereignisse, Offline-Queue und Eskalationsworker; externe E-Mail-/Push-Zustellung ist nicht konfiguriert |
| Übergaben | TEILWEISE IMPLEMENTIERT | Tenant-scoped Protokolle, getrennte Bestätigungen, Ereignisse, übernommene Aufgaben, DMS-Links und Offline-Sync; keine Produktionsabnahme |
| Kontrollgänge | TEILWEISE IMPLEMENTIERT | RLS, QR/NFC/manuelle Scans, versionierte Routen, Gruppen, Termin-Vorkommen, Abweichungen und Offline-Sync; externe Benachrichtigung und Offline-Binäranhänge fehlen |
| Benutzer/Rechte | IMPLEMENTIERT | Tenant-scoped Benutzerverwaltung, Rollen/Grants, Passwort-Reset-Zustellungsschnittstelle und standortbezogene Autorisierung; Online-Adminfunktionen, keine Produktionsfreigabe |
| Mandantenverwaltung | IMPLEMENTIERT | Systemweite Anlage, Bearbeitung und Deaktivierung durch `is_superadmin`; getrennt von Tenant-Benutzern und Sitzungswechsel, Änderungen werden tenant-scoped auditiert. Details: [Mandantenverwaltungs-API](./frontend/TENANT_ADMINISTRATION_API.md). |
| API-Rate-Limit | IMPLEMENTIERT | Per-IP-Limit mit gemeinsamem Redis-Store; Redis ist im Produktionsmodus erforderlich |
| Offline-Sync | TEILWEISE IMPLEMENTIERT | IndexedDB-Outbox, identitätsgebundenes Replay, Wachbuch-Anhänge und kritische Folgeaufgaben mit echten API-/DB-Nachweisen. Anhänge ohne `userId` bleiben verborgen und lokal; autorisierter Recovery-Pfad, vollständige Geräte-/Rollenabnahme und Hintergrundausführung bleiben offen. |
| Generische Automationen | TEILWEISE IMPLEMENTIERT | Lokale, nicht persistierte Entwürfe; keine generische Ausführungsengine, Bedingungsauswertung, dauerhafte Historie oder Providerzustellung. |
| Sicherheits-/Auditansicht | TEILWEISE IMPLEMENTIERT | Lokale/Beispieldaten markiert; kein vollständiger serverseitiger Auditstream, Fernwiderruf oder Datenschutzauskunftsexport. Eigene Abmeldung ist tatsächlich angebunden. |
| Technik-/Abnahmeansichten | IMPLEMENTIERT UND GETESTET | Echte schreibgeschützte API-Daten/Fehler und manueller Prüfplan statt simulierter Test-/Produktionsfreigaben. Keine Sicherheitszertifizierung. |
| Dienstplanung | TEILWEISE IMPLEMENTIERT | Backend/UI und weitergehende Workflows einschließlich konfigurierbarer Arbeitszeitlimits aus gemergten PRs [#33](https://github.com/Xonni-star/SecurityOps-2.0/pull/33) und [#36](https://github.com/Xonni-star/SecurityOps-2.0/pull/36); keine Rechtskonformitäts- oder fachliche Produktionsabnahme. Siehe [Mainline-Integrationsbericht](./MAINLINE_INTEGRATION_STATUS.md). |

Eine Produktions-Compose-Konfiguration ist vorhanden: [docker-compose.production.yml](./frontend/deploy/docker-compose.production.yml). Ihre Existenz belegt nicht, dass Services tatsächlich in Produktion deployed oder abgenommen wurden; die Statusangaben oben bleiben maßgeblich.

Für einen isolierten Servertest dieser Phase-7-Version gibt es zusätzlich ein
**nicht produktionsreifes** Linux-Testpaket (Docker Compose `.tar.gz` und Debian
`.deb`) mit lokaler PostgreSQL-, MinIO- und ClamAV-Topologie:
[deutsche Installations- und Bedienungsanleitung](./frontend/deploy/linux-test/README.md).

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
* [frontend/FRONTEND_ARCHITECTURE.md](./frontend/FRONTEND_ARCHITECTURE.md) — aktuelle Frontend-, API- und Offline-Grenzen
* [frontend/AUTHENTICATION_SECURITY.md](./frontend/AUTHENTICATION_SECURITY.md) — aktuelle Sitzungs-, CSRF- und Rollenarchitektur
* [frontend/HANDOVERS_API.md](./frontend/HANDOVERS_API.md) — Übergabe-API, Statusmodell und Offline-Synchronisierung
* [frontend/USER_ADMINISTRATION_API.md](./frontend/USER_ADMINISTRATION_API.md) — Benutzer-/Rollen-API, Berechtigungsgrenzen und Reset-Ablauf
* [frontend/TENANT_ADMINISTRATION_API.md](./frontend/TENANT_ADMINISTRATION_API.md) — systemweite Mandantenverwaltung und Abgrenzung zu Benutzerverwaltung und Sitzungswechsel
* [MAINLINE_INTEGRATION_STATUS.md](./MAINLINE_INTEGRATION_STATUS.md) — aktueller Mainline-, PR- und Validierungsstatus einschließlich Evidenzgrenzen
* [PROJECT_COMPLETION_TRACKER.md](./PROJECT_COMPLETION_TRACKER.md) — verbindlicher Aufgaben- und Abnahmenachweis für die laufende Projektprüfung
* [FINAL_PROJECT_COMPLETION_REPORT.md](./FINAL_PROJECT_COMPLETION_REPORT.md) — aktueller Teilabschluss mit Testergebnissen, Sicherheitsbefund und offenen Abnahmen
* [PHASE_8_COMPLETION_REPORT.md](./PHASE_8_COMPLETION_REPORT.md) — Phase-8-Prüfstand, ausdrücklich PARTIAL/BLOCKED, mit getrennten Mainline- und Worktree-Nachweisen
* [PHASE_5_IMPLEMENTATION_REPORT.md](./PHASE_5_IMPLEMENTATION_REPORT.md) — historischer Phase-5-Implementierungs- und Test-Snapshot; PR-/Mainline-Status siehe Integrationsbericht
* [PHASE_6_IMPLEMENTATION_REPORT.md](./PHASE_6_IMPLEMENTATION_REPORT.md) — Navbar-Zugänglichkeitskorrektur, Test- und CI-Evidenz, offene Abnahme und Phase-7-Empfehlungen
* [PATROL_IMPLEMENTATION_REPORT.md](./PATROL_IMPLEMENTATION_REPORT.md) — historischer Patrol-Implementierungs- und Verifikationssnapshot; PR #14 ist gemergt
* [frontend/SECURITY_AUDIT.md](./frontend/SECURITY_AUDIT.md) — historischer Sicherheitsaudit-Snapshot und aktueller Verweis
* [frontend/KNOWN_ISSUES.md](./frontend/KNOWN_ISSUES.md) — bekannte Einschränkungen
* [docs/development/NEXT_DEVELOPMENT_REPORT.md](./docs/development/NEXT_DEVELOPMENT_REPORT.md) — historischer Implementierungsbericht zu Benutzer-/Rechteverwaltung
* [PHASE_1_INTEGRATION_COMPLETION_REPORT.md](./PHASE_1_INTEGRATION_COMPLETION_REPORT.md) — aktueller quellcodebasierter Umsetzungsstand, Befunde und Prüfgrenzen
* [frontend/SERVICE_PLANNING_SPECIFICATION.md](./frontend/SERVICE_PLANNING_SPECIFICATION.md) — Dienstplanungs-Spezifikation und Phase-2-Implementierungsstand
* [frontend/backend/SERVICE_PLANNING_API.md](./frontend/backend/SERVICE_PLANNING_API.md) — Report-, Berechtigungs- und API-Vertrag
* [frontend/REPORTING_ARCHITECTURE.md](./frontend/REPORTING_ARCHITECTURE.md) — tatsächlicher Umfang und Grenzen des Berichtswesens
* [frontend/BACKEND_ARCHITECTURE.md](./frontend/BACKEND_ARCHITECTURE.md) — Backend-Architektur
* [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) — begrenzte Security-Prüfung, Befunde und Prüfgrenzen; eine Root-`SECURITY.md` ist nicht vorhanden
* [PHASE_2_FINAL_COMPLETION_REPORT.md](./PHASE_2_FINAL_COMPLETION_REPORT.md) — Phase-2-Implementierungs- und Validierungssnapshot; aktuelle PR-/Mainline-Status siehe Integrationsbericht
* [PHASE_2_SERVICE_PLANNING_COMPLETION_REPORT.md](./PHASE_2_SERVICE_PLANNING_COMPLETION_REPORT.md) — historischer Backend-/Frontend-Implementierungsbericht
* [FINAL_COMPLETION_REPORT.md](./FINAL_COMPLETION_REPORT.md) — historischer Umsetzungsstand
* [DMS_IMPLEMENTATION_REPORT.md](./DMS_IMPLEMENTATION_REPORT.md) — DMS-Umfang, Sicherheitsmodell, Tests und offene Einschränkungen
* [frontend/ALARM_EMERGENCY_API.md](./frontend/ALARM_EMERGENCY_API.md) — Alarm-/Notfall-API, Berechtigungen und Workflow
* [ALARM_EMERGENCY_IMPLEMENTATION_REPORT.md](./ALARM_EMERGENCY_IMPLEMENTATION_REPORT.md) — umgesetzter Umfang, Validierung und Einschränkungen

---

## Lizenz

Für dieses Repository ist derzeit keine Lizenz hinterlegt.
