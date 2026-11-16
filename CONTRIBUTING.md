# Mitwirken und Releases

## Lokale Prüfung

- Backend: im Ordner `frontend/backend` `npm ci`, `npm run build` und `npm test -- --runInBand` ausführen. Die Tests benötigen PostgreSQL 16 sowie die in `src/config/env.ts` beschriebenen Testvariablen.
- Mehrschritt-Backend-Integrationstests haben explizite Ablaufbudgets: API-/Sync-Workflows 30 s, Patrol und Handover 60 s, Migrationen 180 s je Fall. Das sind Abbruchgrenzen für echte HTTP-/DB-Abläufe, keine API-Latenzziele oder Performancefreigabe. Frühere Fehlläufe und die unveränderten Frontend-5-s-Budgets sind im Phase-11-Bericht getrennt dokumentiert.
- Frontend: im Ordner `frontend` `npm ci`, `npm test` und `npm run build` ausführen.
- Offline-Browser-Fixture: im Ordner `frontend` `npx playwright install chromium` und `npm run test:browser` ausführen. CI installiert Chromium samt Systemabhängigkeiten. Die Fixture ersetzt keine Abnahme mit authentifiziertem Backend oder realen Geräten.
- Authentifizierte Offline-Browsertests: nach Installation der Frontend-/Backend-Abhängigkeiten und Chromium im Ordner `frontend` `npm run test:browser:backend` ausführen. Docker, OpenSSL und curl sind erforderlich; Ports 4173/4181 müssen frei sein. Der Runner startet drei eigene ephemere Container für PostgreSQL 16, privaten MinIO-Speicher und ClamAV mit ausschließlich zufälligen Loopback-Ports. Er migriert/seedet synthetische Daten, verlangt echte Scans und prüft anschließend die Entfernung aller drei Container. Sieben Chromium-Journeys prüfen Cookie-Anmeldung/Widerruf, Offline-Neustart, Besitzerbindung, idempotentes Replay echter verlorener Quittungen einschließlich kritischem Vorfall plus Folgeaufgabe, Foto-Originalbytes in S3/Download, echte HTTP-415-Ablehnung, tatsächliche schreibgeschützte API-Antworten samt Berechtigungsfehler sowie SOP-Veröffentlichung und bewusste Offlinekenntnisnahme durch getrennte Konten. Keine API-Erfolgsantworten werden erfunden. Keine physische Geräte-, externe Provider-, vollständige Rollen- oder Produktionsabnahme. CI führt diese Suite im Root-Job getrennt von der API-Fixture aus.
- Produktionskonfiguration: `docker compose -f frontend/deploy/docker-compose.production.yml config --no-interpolate --quiet` und beide Dockerfiles prüfen.
- Keine echten Secrets in `.env.example`, CI, Bundles oder Commits ablegen.

## Release-Prozess

1. `VERSION` und `CHANGELOG.md` aktualisieren.
2. Builds, Tests und CI erfolgreich abschließen.
3. Einen annotierten SemVer-Tag (`vMAJOR.MINOR.PATCH`) auf den geprüften Commit setzen und auf GitHub sowie Forgejo pushen.
4. Release-Einträge auf beiden Hosts mit Installationshinweisen und getesteten Assets veröffentlichen.
5. Tag, Commit, CI-Läufe und SHA-256 der Assets dokumentieren. Bereits veröffentlichte Tags oder Assets nicht überschreiben.
