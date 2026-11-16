# SecurityOps 2.0 – Produktionsdeployment

> **Nicht für Produktion freigegeben.** Diese Anleitung beschreibt Compose-Konfiguration und Betriebsbefehle; sie ist keine bestätigte Produktionsinstallation. Der Statusabschnitt mit Datum 15.11.2026, 20:30 CET weiter unten ist ein historischer Snapshot. Aktueller Mainline- und Abnahmestatus: [PROJECT_CURRENT_STATUS.md](../../PROJECT_CURRENT_STATUS.md) und [PHASE_9_COMPLETION_REPORT.md](../../PHASE_9_COMPLETION_REPORT.md).

**Architektur:** Caddy (TLS, statisches Frontend) → TypeScript/Express-Backend → PostgreSQL 16 + privater externer S3-kompatibler Objektspeicher + ClamAV
**Migrationspfad:** `migrate` (secops_admin) → `db-init` (Passwort für `secops_app_user`) → `backend` (ausschließlich App-Rolle)

---

## 1. Voraussetzungen

- Docker Engine ≥ 24
- Docker Compose Plugin v2
- `openssl`
- Freie Ports 80 und 443
- Domain mit A/AAAA-Record auf den Host (für automatisches TLS)

PostgreSQL und das Backend veröffentlichen **keine** Host-Ports. Nur Caddy ist öffentlich erreichbar.

---

## 2. Konfiguration

```bash
cd frontend/deploy
cp .env.example .env
chmod 600 .env
```

Werte in `.env` setzen:

| Variable | Zweck |
|---|---|
| `DOMAIN` | Öffentliche Domain (Caddy TLS) |
| `POSTGRES_DB` | Datenbankname (Default `securityops_v2`) |
| `POSTGRES_PASSWORD` | Passwort der administrativen Rolle `secops_admin` |
| `POSTGRES_APP_PASSWORD` | Passwort der Least-Privilege-Rolle `secops_app_user` |
| `JWT_SECRET` | Signaturgeheimnis, mindestens 32 Zeichen |
| `JWT_EXPIRES_IN` | Session-Laufzeit, z. B. `8h` |
| `CORS_ORIGIN` | Exakte öffentliche Origin, z. B. `https://securityops.example` |
| `SECOPS_INTERNAL_SUBNET` | Privates Docker-Subnetz für Backend/Proxy/DB (Default `172.30.0.0/24`) |
| `SECOPS_PROXY_IPV4` | Feste interne IPv4-Adresse von Caddy (Default `172.30.0.2`) |
| `TRUST_PROXY` | Ausschließlich die Caddy-Adresse als CIDR, standardmäßig `172.30.0.2/32` |
| `BACKUP_ENCRYPTION_KEY` | Schlüssel für verschlüsselte Backups |
| `DMS_S3_ENDPOINT` | HTTPS-Endpunkt des S3-kompatiblen Objektspeichers |
| `DMS_S3_REGION` | S3-Region |
| `DMS_S3_BUCKET` | Privater DMS-Bucket |
| `DMS_S3_ACCESS_KEY`, `DMS_S3_SECRET_KEY` | Dedizierte Least-Privilege-Zugangsdaten; niemals committen |
| `DMS_S3_FORCE_PATH_STYLE` | Path-Style-URLs für kompatible Anbieter (Default `false`) |
| `DMS_SCAN_REQUIRED` | Malware-Prüfung verpflichtend (Default `true`) |
| `DMS_SCANNER_PROVIDER` | Produktionswert `clamav` |
| `DMS_CLAMAV_HOST`, `DMS_CLAMAV_PORT` | Vom Backend erreichbarer ClamAV-Dienst |
| `DMS_CLAMAV_TIMEOUT_MS` | Scanner-Timeout (Default 30 Sekunden) |
| `DMS_MAX_FILE_SIZE_BYTES` | Maximale Uploadgröße je Datei (Default 10 MiB, Obergrenze 100 MiB) |

Production Compose runs no ClamAV container; ClamAV must be operated separately and reachable from the backend. Required host/provider settings configure a client but do not verify scanner availability during startup. The first successful scan is the only evidence that a file was scanned; unavailable/error results remain quarantined and blocked. ClamAV's `zINSTREAM` TCP protocol does not authenticate or encrypt connections, so restrict it to a private, isolated network and permit access only from the backend. Local development uses the ClamAV service in `docker-compose.minio.yml`.

Express vertraut nur den in `TRUST_PROXY` ausdrücklich angegebenen Proxy-IP-Adressen/CIDRs; die Voreinstellung vertraut keinem Proxy. Im Production-Compose-Netz ist nur Caddy öffentlich, der Backend-Port wird nicht veröffentlicht, Caddy hat die feste interne Adresse `172.30.0.2`, und die Caddy-Konfiguration überschreibt `X-Forwarded-For` mit der tatsächlichen Verbindungsadresse. Bei geänderten Netzwerkwerten müssen `SECOPS_PROXY_IPV4` und `TRUST_PROXY` übereinstimmen; `TRUST_PROXY` darf nicht pauschal das gesamte Docker-Subnetz oder `*` freigeben. Dadurch basiert die Rate-Limit-IP auf dem Client hinter genau diesem vertrauenswürdigen Proxy, während nicht vertrauenswürdige `X-Forwarded-For`-Header ignoriert werden.

Secrets erzeugen:

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 24   # POSTGRES_APP_PASSWORD
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # BACKUP_ENCRYPTION_KEY
```

Verwende hex-kodierte Werte, damit keine URL-Sonderzeichen in den Datenbank-URLs entstehen. Echte Secrets niemals committen.

---

## 3. Start

```bash
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

Startreihenfolge (durch Compose-Bedingungen erzwungen):

1. `db` wird healthy (`pg_isready`).
2. `migrate` führt alle Migrationen mit `secops_admin` aus.
3. `db-init` setzt das Passwort für `secops_app_user`.
4. `backend` startet und prüft die App-Rolle (kein Superuser, kein BYPASSRLS).
   Fehlende S3- oder Pflichtscanner-Konfiguration stoppt den Produktivstart.
5. `proxy` startet, sobald das Backend healthy ist.

Neue DMS-Dateien werden mit generierten Schlüsseln in einem privaten S3-kompatiblen Bucket abgelegt. Ohne erfolgreiche Pflichtprüfung bleiben sie in Quarantäne und können weder heruntergeladen noch als freigegeben/veröffentlicht markiert werden. Bestehende Dateien aus älteren dateisystembasierten Installationen werden nicht automatisch in S3 kopiert und nach Migration 035 nicht mehr als geprüft/freigegeben behandelt; vor dem Upgrade müssen sie separat migriert und erneut geprüft oder erneut hochgeladen werden.

Lokale Entwicklung: `cp .env.minio.example .env.minio`, lokale Werte setzen und `docker compose --env-file .env.minio -f docker-compose.minio.yml up -d` ausführen. Die Dienste binden nur an `127.0.0.1`. Die in `.env.minio` stehenden `DMS_*`-Werte werden zusätzlich dem lokalen Backend-Prozess übergeben. Diese Werte sind ausschließlich für lokale Entwicklung und nicht für Produktion gedacht.

Status:

```bash
docker compose -f docker-compose.production.yml ps
```

---

## 4. Migrationen

Migrationen laufen automatisch über den einmaligen `migrate`-Dienst. Manuell:

```bash
docker compose -f docker-compose.production.yml run --rm migrate
```

Der Runner prüft Versionen, SHA-256-Prüfsummen, Schemaobjekte und Mandantenisolierung. Er bricht bei Abweichungen ab.

---

## 5. Healthcheck

```bash
curl --fail --show-error "https://$DOMAIN/api/v1/health"
```

Erwartet: `status: "OPERATIONAL"` und eine verbundene PostgreSQL-Datenbank.

Intern:

```bash
docker compose -f docker-compose.production.yml exec -T backend \
  node -e "fetch('http://127.0.0.1:8000/api/v1/health').then(r=>r.text()).then(console.log)"
```

---

## 6. Optionaler Demo-Seed

Nur für Test-/Demo-Umgebungen, **nicht** für Produktion:

```bash
read -r -s -p 'Testpasswort für Demo-Seed (mindestens 16 Zeichen): ' SECOPS_DEMO_USER_PASSWORD
printf '\n'
export SECOPS_DEMO_USER_PASSWORD
docker compose -f docker-compose.production.yml run --rm \
  --entrypoint node backend dist/seeds/seed.js
unset SECOPS_DEMO_USER_PASSWORD
```

Der Seed verlangt ein eigenes Passwort mit mindestens 16 Zeichen. Er legt illustrative
Testmandanten und einen Testbenutzer an. Nur isoliert testen; Produktionsdaten dürfen
nicht geseedet werden. Auch das genutzte Compose-Setup ist nicht automatisch für
Produktion freigegeben.

---

## 7. Update

Nur einen geprüften, unveränderlichen Release-Tag oder Commit ausrollen; nicht unbesehen den jeweils aktuellen Branch-Stand übernehmen. Das folgende Beispiel setzt voraus, dass `<reviewed-release-ref>` vorab im Release-Prozess freigegeben wurde:

```bash
git fetch --tags origin
git checkout --detach <reviewed-release-ref>
cd frontend/deploy
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

Neue Migrationen laufen beim Start über `migrate`. Vor dem Update ein geprüftes Datenbank- und DMS-Objektbackup erstellen; die S3-Objekte liegen außerhalb von Compose.

### Rollback-Grenzen

Es gibt keinen automatischen Anwendung-/Schema-Rollback. Ein vorheriger Container-Build oder Git-Checkout ist nur dann ein sicherer Anwendungsschritt zurück, wenn er mit dem bereits migrierten Datenbankschema kompatibel ist. Das Compose-Update führt Migrationen aus; es gibt keine Garantie, dass eine Migration rückwärtskompatibel ist. Keine Migrationen manuell löschen oder rückwärts ändern.

Wenn die vorherige Anwendungsversion mit dem aktuellen Schema nicht kompatibel ist, reicht ein Image-Rollback nicht. Für einen Restore müssen Datenbank und DMS-Objekte auf zueinander passende Sicherungsstände gebracht werden: `restore.sh` stellt nur PostgreSQL wieder her; Objektversionierung/-restore erfolgt getrennt beim konfigurierten Anbieter. Die Verschlüsselungsdaten und Provider-Zugangsdaten müssen verfügbar sein. Vor einem Restore den Runbook-Ablauf in einer isolierten Umgebung gegen genau diese Revision und Konfiguration prüfen und ein Wartungsfenster samt Wiederanlauf/Healthcheck einplanen.

Ist der passende Provider-Snapshot, die Schema-Kompatibilität oder die Wiederherstellung nicht verifiziert, keinen Rollback als verfügbar voraussetzen. Betrieb pausieren und einen vorwärts gerichteten Fix bzw. einen abgestimmten Wiederherstellungsplan verfolgen. Erfolgreiche lokale/CI-Tests belegen keinen produktiven Rollback.

---

## 8. Backup und Wiederherstellung

Backups laufen automatisch alle 24 Stunden (`backup`-Dienst). Das verschlüsselte Archiv enthält den PostgreSQL-Dump (`secops_backups`, 30 Tage Retention). DMS-Objekte liegen außerhalb von Compose; für sie müssen Versionierung, Replikation/Backup und Retention beim gewählten S3-kompatiblen Anbieter separat aktiviert und getestet werden. Ein Datenbank-Restore stellt keine Objekte wieder her.

Der Compose-Healthcheck des Backupdienstes läuft alle fünf Minuten (30 Minuten
Starttoleranz). Er verlangt mindestens ein nicht leeres, abgeschlossenes Archiv
der letzten 25 Stunden und keinen Fehler beim letzten Sicherungsversuch.
Verschlüsselung schreibt zunächst eine `.partial`-Datei und benennt sie erst bei
Erfolg atomar um; partielle Archive zählen nicht. Ein Fehler erzeugt
`.backup_failed`, erst ein erfolgreicher Folgelauf entfernt diesen Marker.
Temporäre Dumps und Archive werden mit `umask 077` angelegt.

```bash
docker compose -f docker-compose.production.yml ps backup
docker compose -f docker-compose.production.yml exec backup \
  bash /usr/local/bin/backup_healthcheck.sh
docker compose -f docker-compose.production.yml logs --tail=100 backup
```

**Prüfgrenze:** `healthy` bestätigt ausschließlich aktuelle Archiverzeugung,
nicht Entschlüsselbarkeit, Wiederherstellbarkeit, Objektvollständigkeit oder
RPO/RTO. Die 25-Stunden-Schwelle ist eine technische Frischekontrolle des
24-Stunden-Daemons, kein vereinbartes Wiederherstellungsziel. Docker startet
unhealthy Container nicht automatisch neu und versendet keine Alarmmeldung;
Statusabfrage, externe Alarmierung und regelmäßige Restore-Drills muss der
Betrieb separat einrichten.

Manuell:

```bash
umask 077
docker compose -f docker-compose.production.yml exec -T db \
  pg_dump -U secops_admin -d securityops_v2 -F c \
  > /sicherer/pfad/securityops_manual.dump
```

Der manuelle Befehl erzeugt nur einen unverschlüsselten PostgreSQL-Dump auf dem Host; speichere ihn ausschließlich an einem zugriffsgeschützten Ort und verschlüssele ihn vor Übertragung oder Langzeitspeicherung. DMS-Objekte müssen unabhängig über den konfigurierten S3-Anbieter gesichert und wiederhergestellt werden. Nach einem erfolgreichen manuellen Backup die Datei gemäß lokaler Aufbewahrungsrichtlinie entfernen.

Die folgende Anleitung stellt Datenbank und Dienste über `restore.sh` wieder her:

Das private Archiv bleibt im Modus `0600`. Den Restore als Archivbesitzer oder
entsprechend berechtigten Betriebsbenutzer ausführen; Leserechte nicht pauschal
für andere Benutzer erweitern.

```bash
./restore.sh /pfad/zu/secops_backup_YYYYMMDD_HHMMSS.tar.gz.enc
```

`restore.sh` stoppt standardmäßig das Backend für den Restore und startet danach Backend und Proxy erneut. Nach erfolgreichem Abschluss den Compose-Status und den Healthcheck oben prüfen; bei angepassten `RESTORE_QUIESCE_SERVICES`- oder `RESTORE_RESUME_SERVICES`-Werten entsprechend kontrollieren, welche Dienste tatsächlich angehalten bzw. gestartet wurden.

### Isolierter Restore-Regressionstest

Mit Docker, OpenSSL und Python 3 lässt sich der verschlüsselte PostgreSQL-Backup-/Restore-Pfad gegen die vollständige Repository-Migrationskette sowie ein separates DMS-Objektsnapshot testen:

```bash
npm run test:backup-restore --prefix frontend/backend
```

Der Test verwendet ein zufällig benanntes, isoliertes Compose-Projekt, zufällige Testzugangsdaten, zwei synthetische Mandanten, Benutzer, DMS-Dokumente, Versionen und Auditereignisse. Er baut den Backend-Migrationsrunner aus dem Repository und prüft den vollständigen angewendeten Migrationssatz `001`–`007`, `009`, `011`–`042`, dessen Historie sowie `ENABLE`/`FORCE ROW LEVEL SECURITY` für neun DMS-Tabellen. Danach erstellt er mit `backup_cron.sh` ein verschlüsseltes Backup, prüft den Healthcheck einschließlich fehlgeschlagenem Sicherungsversuch und erfolgreichem Folgelauf, mutiert DMS-Metadaten, entfernt beide synthetischen Objekte, stellt DB und Objektsnapshot wieder her und verifiziert Versions-/Auditdaten, SHA-256, benutzerdefinierte Objektmetadaten und Tenant-RLS einschließlich eines abgewiesenen Fremdtenant-Schreibversuchs. Ein injizierter DDL-Fehler nach der Clean-Phase muss einen abweichenden Vor-Restore-Datenstand unverändert erhalten; Restore-/Resume-Fehler lassen Dienste gestoppt. Der Lauf hat begrenzte Wartezeiten und räumt ausschließlich Ressourcen seines eindeutigen Testprojekts auf.

Die Testzugangsdaten liegen in einer lokalen temporären Datei. Der MC-Container erhält ausschließlich das Fixture-Verzeichnis schreibgeschützt. Produktions-Compose, Produktionsdaten, Produktionszugangsdaten und externe Anbieterendpunkte werden nicht verwendet. `--database-only` überspringt den S3-Objektschritt; der Standardlauf testet MinIO lokal, optional kann `RESTORE_TEST_S3_BACKEND=seaweedfs` einen lokalen SeaweedFS-Dienst verwenden.

Nur im Test läuft der Backup-Container mit UID/GID des aufrufenden
Restore-Benutzers. Der Drill prüft Dateibesitz, Modus `0600` und tatsächliche
Lesbarkeit vor dem Restore. Damit bleibt das private Bindmount-Archiv auch auf
Linux ohne Rechteaufweitung lesbar; das Produktions-Benutzermodell wird nicht
verändert.

### Einordnung der Restore-Nachweise

| Nachweisstufe | Was geprüft wird | Status dieses Tests |
|---|---|---|
| Automatisierte Tests | Jest-, Migrations- und CI-Tests auf synthetischen Daten | CI führt den isolierten Restore-Regressionstest als eigenen Job aus. |
| Lokaler Integrationstest | Backup-/Restore-Skripte, vollständige Migrationen und DMS-Daten in einer lokalen Testdatenbank | Durch `test:backup-restore` abgedeckt; der aktuelle Worktree prüft zusätzlich, dass ein fehlgeschlagener transaktionaler Restore Dienste gestoppt lässt und teilweise gestartete Dienste bei einem Resume-Fehler gestoppt werden. |
| Isolierter Infrastrukturtest | Test-Compose-Projekt, lokales PostgreSQL und lokaler MinIO-/SeaweedFS-kompatibler Objektspeicher | Abgedeckt; Ressourcen und Zugangsdaten sind testisoliert. |
| Realer Provider-Test | Versionierung, Replikation, Berechtigungen und Wiederherstellung beim tatsächlich konfigurierten S3-Anbieter | Nicht abgedeckt; dazu ist ein separater Test mit einem dedizierten, nicht-produktiven Provider-Bucket nötig. |
| Vollständige Produktionsabnahme | Wiederherstellung eines repräsentativen Produktionsbackups in einer freigegebenen, produktionsgleichen Umgebung einschließlich Anwendung, Provider und fachlicher Abnahme | Nicht abgedeckt und nicht durch diesen Regressionstest ersetzbar. |

Die Test-Images können über `RESTORE_TEST_BACKUP_IMAGE`, `RESTORE_TEST_MINIO_IMAGE`, `RESTORE_TEST_MC_IMAGE` und `RESTORE_TEST_S3_IMAGE` überschrieben werden. CI verwendet ein digest-gepinntes MinIO-Testimage; auch dieser CI-Lauf bleibt ein lokaler Infrastrukturtest, kein realer Provider-Test oder Produktionsabnahme.

### Historischer Readiness- und Auditstatus (geprüft 15.11.2026, 20:30 CET)

> Der nachfolgende Statusblock bleibt als datierter Snapshot erhalten. Seit dem Prüfzeitpunkt wurden PRs #50–#59 gemergt; seine damaligen PR-open-/main-SHA-Aussagen sind nicht aktuell. Siehe [PROJECT_CURRENT_STATUS.md](../../PROJECT_CURRENT_STATUS.md) und [PHASE_9_COMPLETION_REPORT.md](../../PHASE_9_COMPLETION_REPORT.md).

`main` steht auf `d06c2d835270b43bd36bb3585fc45d7da7d58a50`; PRs #47–#49 sind gemergt. PRs [#50](https://github.com/Xonni-star/SecurityOps-2.0/pull/50)–[#58](https://github.com/Xonni-star/SecurityOps-2.0/pull/58) sind gegen `main` offen: Restore, mobile Usability, Offline Chromium, Performance-Baseline, CORS-Fehlerbehandlung, Tenant-Login/E2E, Linux-Testinstaller, Dokumentberechtigungen und Development-Dependency-Advisory. Hosted CI bestand 7/7 Jobs für alle PRs #50–#58. PR #56s frühere 429s waren Account-Lockout durch veraltete fest codierte Testzugangsdaten, nicht globales Rate-Limiting. Backend- und DMS-Integrationslogins nutzen nun `SECOPS_DEMO_USER_PASSWORD`; DMS CI setzt ein Testpasswort, Jest behält lokal exportierte Werte. Fokus-PostgreSQL-API-Integration 23/23, DMS PostgreSQL/MinIO/ClamAV-Flow, Backend-Build und Hosted CI bestanden; ein lokaler Full-Jest-Lauf hatte einen unabhängigen Patrol-Timeout nach 5s. Es wurden weder Produktionslimits abgeschwächt noch Tests entfernt. PR #56s Lauf [43752256912](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43752256912), PR #57s RLS-Lauf [43752115003](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43752115003) und PR #58s Dependency-Lauf [43752479801](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43752479801) bestanden jeweils 7/7. PR #57 und #58 bleiben offen/unmerged; PR #58s lokaler Full-Jest-Lauf berichtete 10 failing suites / 171 tests mit lokalen PostgreSQL-/CORS-Problemen, getrennt von den grünen Hosted Checks. Main-CI [43726729355](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43726729355) bestand 7/7 Jobs, die Release-Artefakt-Prüfung [43726964671](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43726964671) 2/2. Der Release-Workflow erzeugt und prüft ein Paket, deployed aber nicht; daraus folgt keine Produktionsfreigabe. Details: [Mainline- und Validierungsstatus](../../MAINLINE_INTEGRATION_STATUS.md) und [Phase-8-Prüfbericht](../../PHASE_8_COMPLETION_REPORT.md).

Zusätzliche Ergebnisse aus separaten, **nicht gemergten Worktrees** sind nicht Bestandteil dieses Mainline-Nachweises:

- **Offline-Feldtest:** Ein separates Audit meldet 24 Frontend-Testdateien / 140 Tests sowie Typecheck und Produktions-Build bestanden; dies war IndexedDB/jsdom-Simulation. Das offene PR [#52](https://github.com/Xonni-star/SecurityOps-2.0/pull/52) ergänzt einen Playwright/Chromium-Test für Offline-Wachbuch, Reload, Wiederverbindung und Retry nach verlorener Quittung. Er besteht gegen eine Loopback-Fixture, nicht gegen das authentifizierte Anwendungsbackend oder Produktionsdienste; Hosted CI war bei der letzten Prüfung noch offen. Reale Geräte-/Backend-Abnahme bleibt aus. Fotos bleiben ungesynct: es gibt keinen idempotenten Upload-/Replay-Pfad; der Test prüft nur lokale Foto-Persistenz und zeigt sie nicht als synchronisiert an.
- **Backup-/Restore-Drill:** Ein praktischer PostgreSQL- und DMS-Snapshot-/Restore-Lauf bestand mit SHA-256-Objektprüfungen und anschließendem Health-Smoke-Test. Der Worktree ist separat und ungemergt; ClamAV und ein realer Speicheranbieter wurden nicht geprüft, RPO/RTO wurden nicht gemessen. Das ist keine Produktions-Wiederherstellungsabnahme.
- **Performance-Baseline:** Bei 5 Warmups und 50 Messungen je Workflow (maximal 4 parallel, 10-Sekunden-Timeout) gab es 0 Fehler. Customer list: p50/p95/p99 210.979/293.646/298.308 ms (17.69 req/s); customer sync create: 102.074/322.707/327.985 ms (34.04 req/s); SOP draft customer assignment: 174.410/185.952/225.092 ms (23.29 req/s). PostgreSQL 16 war auf 1 CPU/1 GiB begrenzt; die API lief auf macOS mit Node 26.7 ohne Prozesslimits. Es wurden keine Ressourcenspitzen gemessen. Das ungemergte Worktree-Ergebnis ist ein begrenzter Baseline-Lauf, kein Produktions-Lasttest oder Kapazitätsnachweis.
- **Documents-Berechtigung:** Ein separates current-main-basiertes Worktree bestätigte, dass site-scoped `documents:read` kundenverknüpfte Dokumente über Site-Grenzen hinweg offenlegte. Der Bypass wurde mit Migration 039 reproduziert und mit Migration 040 (`frontend/backend/src/migrations/040_customer_document_tenant_scope.sql`) abgewiesen; diese fordert Tenant-Scope für Kundenbeziehungen. Die Migration ist im separaten Worktree gestaged, aber uncommitted und ungemergt. RLS- und Read-/Download-Routentests decken `TENANT` / `SITE` / `OWN` ab. Backend-Build, `auth_site_scope.test.ts` (14/14), gezielte Migration-/RLS-Tests (4/4) und Diff-Checks bestanden dort. Migration und Korrektur sind nicht auf `main`; das Problem bleibt dort bis Merge und Verifikation offen.
- **Mobile usability:** Ein separater, uncommitted Worktree berichtet 24 Frontend-Testdateien / 137 Tests sowie erfolgreichen Typecheck und Produktions-Build. Änderungen umfassen 80px Abstand zum Bottom-Nav, ein beschriftetes Shift-Swap-Modal mit Fokussteuerung/-Falle/-Wiederherstellung und Escape-Behandlung sowie 44px Controls. Die Browser-Vorschau erreichte mangels authentifizierter Backend-Session nur die Login-Seite; eine authentifizierte visuelle Prüfung fand nicht statt. Nicht als ausgelieferte UI oder Abnahme für `main` werten.
- **E2E/API-Workflow:** Ein weiteres separates, ungemergtes Worktree berichtet die Korrektur der Tenant-Auswahl bei Mehrdeutigkeit (`availableTenants` bleibt in `ApiClient` verfügbar; Auswahl/Wiederholung übermittelt `requestedTenantId`; Single-Tenant-Verhalten unverändert). Eine vollständige isolierte PostgreSQL/API-Journey lief über Stammdaten, Schichtfreigabe, SOP-Zuweisung/-Bestätigung, Alarm, Wachbuch, Übergabe/Aufgabe, Kontrollgang und DMS. Separate isolierte MinIO-/ClamAV-Checks deckten saubere Freigabe und EICAR-Quarantäne, Berechtigungen und Audit ab. Frontend: 24 Dateien / 139 Tests, Typecheck/Build; Backend: 31 Suiten / 297 Tests (30s Timeout); Root HTTP-/Backend-Health-Smoke bestanden. Kein Einsatz von Produktionsdaten/-diensten, keine Browser-/Geräteabnahme, kein Merge/Deployment; dies ist keine Produktionsabnahme. Gemeldete Dateien: `LoginScreen.tsx`, `apiClient.ts`, `store.ts`, `types.ts` und drei Tests.

Browser-level Offline-Validierung besteht nun in PR #52 gegen eine Loopback-Fixture; authentifizierte API-/Backend- und Geräteprüfung bleibt blockiert/unvollständig. Die Browser-Canvas bietet keinen Offline-/Netzwerk-Schalter, und eine lokale Backend-Testdatenbank ist nicht konfiguriert. Bis zur Integration und passenden Abnahme dürfen diese Ergebnisse nicht als ausgelieferte Funktionen oder als Nachweis der Produktionsbereitschaft gewertet werden. Der externe S3-Anbieter, ClamAV, Wiederherstellung beim realen Provider, gemessene RPO/RTO, Produktionsbetrieb und fachliche Abnahme bleiben offene Gates.

---

## 9. Neustart und Fehlerdiagnose

```bash
docker compose -f docker-compose.production.yml restart backend proxy
docker compose -f docker-compose.production.yml logs --tail=200 backend
docker compose -f docker-compose.production.yml logs --tail=200 migrate db-init
docker compose -f docker-compose.production.yml logs --tail=200 proxy
```

Häufige Ursachen:

- `POSTGRES_APP_PASSWORD` fehlt → `db-init` schlägt fehl.
- `CORS_ORIGIN` stimmt nicht mit der öffentlichen Origin überein → Browser blockiert API-Aufrufe.
- Port 80/443 belegt → Caddy startet nicht.
- `JWT_SECRET` kürzer als 32 Zeichen → Backend bricht beim Start ab.

---

## 10. Sicherheitsmodell

- `secops_app_user`: `LOGIN`, kein `SUPERUSER`, kein `BYPASSRLS`, kein `CREATEROLE`, kein `CREATEDB`.
- Der API-Server erhält **keine** administrative Datenbank-URL; nur `migrate` und `db-init` nutzen `secops_admin`.
- PostgreSQL und Backend sind ausschließlich im internen Docker-Netz erreichbar.
- CORS-Whitelist über `CORS_ORIGIN`; kein Wildcard.
- Helmet-Sicherheitsheader und Caddy-TLS/HSTS bleiben aktiv.
- RLS und Mandantentrennung bleiben unverändert.
- Secrets ausschließlich über `.env` (Modus 600); keine Secrets in Images oder im Repository.

---

## 11. Bekannte Einschränkungen

- SOPs besitzen Tabellen und API-Endpunkte (Migration `013_sop_instructions.sql`), sind aber mit dieser Dokumentation nicht deployed oder für Produktion freigegeben. Alarm-/Notfallpläne besitzen weiterhin keine Datenbanktabellen/Endpunkte.
- Es bestehen keine Verbindungen zu externen Sprachmodell- oder KI-Diensten; Wachbucheinträge werden manuell erfasst.
- Redis und der frühere Python-Worker wurden entfernt, da das TypeScript-Backend sie nicht verwendet und der Python-Stack nicht lauffähig war.
- Ein vollständiger Browser-E2E-Test ist nicht Teil dieses Deployment-Schritts.
