# Mitwirken und Releases

## Lokale Prüfung

- Backend: im Ordner `frontend/backend` `npm ci`, `npm run build` und `npm test -- --runInBand` ausführen. Die Tests benötigen PostgreSQL 16 sowie die in `src/config/env.ts` beschriebenen Testvariablen.
- Frontend: im Ordner `frontend` `npm ci`, `npm test` und `npm run build` ausführen.
- Offline-Browser-Fixture: im Ordner `frontend` `npx playwright install chromium` und `npm run test:browser` ausführen. CI installiert Chromium samt Systemabhängigkeiten. Die Fixture ersetzt keine Abnahme mit authentifiziertem Backend oder realen Geräten.
- Authentifizierter Offline-Browsertest: nach Installation der Frontend-/Backend-Abhängigkeiten und Chromium im Ordner `frontend` `npm run test:browser:backend` ausführen. Docker und OpenSSL sind erforderlich. Der Runner erzeugt ausschließlich eine eigene ephemere PostgreSQL-16-Instanz (Loopback, zufälliger Port), migriert/seedet synthetische Daten und entfernt den Container anschließend. Ports 4173/4181 müssen frei sein. Er prüft echte Cookie-Anmeldung, Offline-Neustart, idempotentes Replay nach verlorener Quittung, Sitzungswiderruf, Besitzerbindung beim Konten-/Mandantenwechsel sowie SOP-Veröffentlichung mit getrennten Akteuren und bewusstes Offline-Bestätigen durch ein reines Mitarbeiterkonto. Keine Geräte-, Foto-/Provider- oder vollständige Rollenabnahme. CI führt ihn im Root-Job getrennt von der API-Fixture aus.
- Produktionskonfiguration: `docker compose -f frontend/deploy/docker-compose.production.yml config --no-interpolate --quiet` und beide Dockerfiles prüfen.
- Keine echten Secrets in `.env.example`, CI, Bundles oder Commits ablegen.

## Release-Prozess

1. `VERSION` und `CHANGELOG.md` aktualisieren.
2. Builds, Tests und CI erfolgreich abschließen.
3. Einen annotierten SemVer-Tag (`vMAJOR.MINOR.PATCH`) auf den geprüften Commit setzen und auf GitHub sowie Forgejo pushen.
4. Release-Einträge auf beiden Hosts mit Installationshinweisen und getesteten Assets veröffentlichen.
5. Tag, Commit, CI-Läufe und SHA-256 der Assets dokumentieren. Bereits veröffentlichte Tags oder Assets nicht überschreiben.
