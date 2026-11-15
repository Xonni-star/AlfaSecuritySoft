# Lokale Performance-Baseline

**Gemessen am 15.11.2026 um 19:10 UTC** auf einem frischen, kurzlebigen PostgreSQL-16-Testcontainer. Dies ist ein reproduzierbarer kleiner API-/Datenbank-Baseline-Lauf, keine SLA, Produktionskapazität oder Freigabe für Lasttests gegen gemeinsam genutzte Systeme.

## Messaufbau

- macOS (Darwin 25.6.0), Intel Core i9-9980HK, 16 logische CPUs, 32 GiB RAM, Node.js v26.7.0; der Docker-Daemon stellte 16 CPUs und rund 7,75 GiB bereit.
- PostgreSQL `16-alpine`, nur an `127.0.0.1:55435` veröffentlicht, ohne persistentes Volume; Containerlimits: 1 CPU, 1 GiB RAM, 128 Prozesse, 2 GiB Memory-Swap-Limit. Nach dem Lauf meldete Docker 105,5 MiB Datenbank-RAM und 0,12 % CPU; dies ist eine einzelne Momentaufnahme danach, keine Spitzenmessung.
- Express-API auf dem Host, nur an `127.0.0.1:18000` gebunden. Der API-Prozess selbst hatte keine CPU-/Speichergrenze. Der lokale Rate-Limit-Store war nicht konfiguriert; `RATE_LIMIT_MAX=500` verhinderte, dass der Test sein eigenes Standardlimit von 120/min erreicht.
- Je Szenario 5 Warm-up- und 50 Messanfragen bei höchstens 4 parallelen Requests; Timeout je Request 10 Sekunden. Ein einzelner fehlgeschlagener Request stoppt den Lauf nach Abschluss der bereits parallel laufenden Requests.
- Gemessen wurden authentifizierte HTTP-Aufrufe einschließlich JSON-Antwortverarbeitung: `GET /customers` (Mandanten-RLS-Liste), `POST /customers/sync` (neuer Kunde samt Idempotenzquittung) und `POST /sops/:id/assignments` (Zuweisungsziel samt Auditereignis).
- Das Benchmark-Skript erstellt eine SOP im Entwurfsstatus und 55 synthetische Kunden (5 Warm-up, 50 gemessen); die Kundenliste enthält dadurch 56 Kunden einschließlich des Seed-Datensatzes. Anschließend werden alle 55 Testkunden jeweils dieser SOP zugewiesen (5 Warm-up, 50 gemessen). Login und SOP-Erstellung sind Setup und nicht Teil der Messwerte.
- Die Perzentile nutzen den Nearest-Rank-Ansatz. Bei 50 Messwerten entspricht p99 dem langsamsten beobachteten Request. Bei einem Fehler wird der Lauf abgebrochen, statt einen Erfolgsbericht auszugeben.

## Ergebnisse

| Workflow | Messanfragen | p50 | p95 | p99 | Durchsatz bei 4 parallelen Requests | Fehler |
|---|---:|---:|---:|---:|---:|---:|
| Mandanten-Kundenliste | 50 | 116,833 ms | 198,906 ms | 201,681 ms | 27,42 req/s | 0 |
| Kundensynchronisierung (Create) | 50 | 80,700 ms | 130,542 ms | 132,600 ms | 51,56 req/s | 0 |
| SOP-Kundenzuweisung | 50 | 99,860 ms | 108,203 ms | 133,152 ms | 40,03 req/s | 0 |

Die Werte stammen aus einem einzelnen Lauf und sind durch Host-/Docker-Last, kleine Datensätze sowie fehlende Last auf anderen Mandanten beeinflusst. Ein weiterer Lauf mit demselben Aufbau auf frischem Seed-Datensatz ergab p50-Werte von rund 211 ms (Kundenliste), 102 ms (Sync) und 174 ms (SOP-Zuweisung); die deutliche Streuung ist ein Hinweis auf die Grenzen dieser kurzen Messung. CPU- und RAM-Spitzen wurden während des Laufs nicht erfasst. Der SOP-Test misst Zuweisungsziele für eine Entwurfs-SOP, nicht den vollständigen Review-/Freigabe-/Veröffentlichungs-/Kenntnisnahmeprozess. Worker, Frontend, Redis, externe Scanner und weitere Dienste sind nicht Teil des Messlaufs.

## Reproduktion

Alle folgenden Ressourcen und Zugangsdaten sind ausschließlich kurzlebige lokale Testwerte. Die Datenbank ist flüchtig, auf Loopback veröffentlicht und darf nicht gegen echte, gemeinsam genutzte oder produktive Systeme ersetzt werden.

1. Vom Repository-Root aus eine isolierte Datenbank starten und migrieren:

   ```bash
   docker run --rm -d --name secops-perf-baseline-db \
     --cpus=1 --memory=1g --pids-limit=128 \
     -p 127.0.0.1:55435:5432 \
     -e POSTGRES_USER=secops_admin \
     -e POSTGRES_PASSWORD=PerfTestOnly_2026 \
     -e POSTGRES_DB=securityops_perf \
     postgres:16-alpine

   export DATABASE_URL='postgresql://secops_app_user:PerfAppOnly_2026@127.0.0.1:55435/securityops_perf'
   export DATABASE_MIGRATION_URL='postgresql://secops_admin:PerfTestOnly_2026@127.0.0.1:55435/securityops_perf'
   export JWT_SECRET='perf-baseline-test-only-secret-key-2026'
   export CORS_ORIGIN='http://localhost:3000'

   npm --prefix frontend/backend ci
   npm --prefix frontend/backend run migrate
   DATABASE_MIGRATION_URL="$DATABASE_MIGRATION_URL" \
     POSTGRES_APP_PASSWORD='PerfAppOnly_2026' \
     npx --prefix frontend/backend ts-node frontend/backend/src/scripts/setAppPassword.ts
   npm --prefix frontend/backend run seed
   npm --prefix frontend/backend run build
   ```

2. In einem zweiten Terminal aus dem Repository-Root die API ausschließlich auf Loopback starten. Die Datenbankvariablen und Testwerte aus Schritt 1 müssen dort ebenfalls gesetzt sein:

   ```bash
   RATE_LIMIT_MAX=500 node -e "const {app}=require('./frontend/backend/dist/app'); const {verifyAppDatabaseRole}=require('./frontend/backend/dist/config/database'); verifyAppDatabaseRole().then(()=>app.listen(18000,'127.0.0.1',()=>console.log('Loopback-only benchmark API listening on 127.0.0.1:18000'))).catch(()=>process.exit(1))"
   ```

3. Den Seed-Testbenutzer verwenden. Das Passwort steht nur in der Test-Seeddatei `src/seeds/seed.ts`; keine echten Konten verwenden:

   ```bash
   PERF_BASE_URL='http://127.0.0.1:18000' \
   PERF_EMAIL='a.schmidt@ffm-sec.de' \
   PERF_PASSWORD='<Seed-Testpasswort>' \
   RATE_LIMIT_MAX=500 \
     npm --prefix frontend/backend run perf:baseline
   ```

Der Runner verweigert nicht-HTTP-Loopback-Ziele. Nach dem Lauf API-Prozess beenden und den Datenbankcontainer mit `docker stop secops-perf-baseline-db` stoppen; `--rm` entfernt ihn. Jeder Lauf erzeugt Testdaten und ist daher für eine frische Baseline mit einer frisch gestarteten Datenbank auszuführen.
