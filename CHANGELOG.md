# Changelog – SecurityOps 2.0

## [Unreleased]

### Hinzugefügt

- Regressionstest für Nachtschichten über Zeitumstellungen (7 h/9 h reale Dauer).
- Standortbezogene Zugriffsbeschränkung für alle vier Planungsberichte sowie Aggregate und Arbeitszeit-CSV; Regressionstest für Standort-A/Standort-B und fehlende Berechtigungen.

### Geändert

- Oberflächentexte behaupten keine DIN-77200-/KRITIS-/BSI-Konformität mehr.

### Fehlerkorrekturen

- Sync-Quittungen weisen die Wiederverwendung einer Mutations-ID mit geändertem Entitätstyp oder Vorgang zurück.
- Kontrollpunkte sind nach Ablauf des zweiminütigen Duplikatfensters erneut scannbar; Scans innerhalb des Fensters werden abgewiesen.
- Backend- und Frontend-Regressionstests sichern beide Verhaltensweisen gegen spätere Rückfälle ab.
- Browserbasierte Berichte quotieren und maskieren CSV-Werte, escapen Anführungszeichen und neutralisieren Formeleingaben.
- Die Sync-Oberfläche zeigt für ownerlose Altanhänge nur noch einen generischen Hinweis. Dateimetadaten und Inhalte können nicht mehr angezeigt, exportiert oder verworfen werden; die lokalen Daten bleiben erhalten.
- Der Chromium-Offline-Fixture-Test erwartet jetzt den tatsächlich ausgewählten Dateinamen.

## [2.0.0] – 2026-11-11

Erste lauffähige, servergestützte TypeScript-Version mit geprüftem Produktionsbuild.

### Enthalten

- React-/TypeScript-Weboberfläche und Express-/TypeScript-API.
- PostgreSQL 16 mit Mandantentrennung und Row-Level Security.
- Login, Rollen/Rechte und bestehende Sicherheitsdienstmodule einschließlich manuellem Wachbuch.
- Offline-Outbox und Synchronisation sowie regelbasierte Automatisierungen.
- Docker-Compose-Produktionsdeployment mit Caddy.

### Sicherheit und Änderungen

- Sämtliche KI-/LLM-Funktionen, Copilot-Oberflächen, KI-Routen und externen Modellintegrationen sind entfernt.
- Keine Gemini-/OpenAI-Schlüssel oder Modell-API-Verbindungen erforderlich.
- Wachbucheinträge bleiben manuell erstellt und gespeichert; Mandantentrennung und RLS bleiben bestehen.

### Verifikation

- Backend: TypeScript-Build und 132 Jest-Tests bestanden.
- Frontend: Produktionsbuild und 19 Vitest-Tests bestanden.
- Docker-Produktionsbuilds für Frontend und Backend sowie Compose-Validierung bestanden.
- GitHub CI/CD erfolgreich für Commit `2abe684`.

### Installation

Repository klonen, Umgebungsvariablen anhand `frontend/deploy/.env.example` setzen und die Schritte in `frontend/deploy/PRODUCTION_DEPLOYMENT.md` befolgen. Datenbankmigrationen und initiale Einrichtung erfolgen gemäß Deployment-Anleitung.

Bekannte Einschränkung: Ein produktiver Erststart benötigt eine eigene PostgreSQL-Instanz und korrekt gesetzte Secrets/Umgebungsvariablen; diese sind nicht Bestandteil des Releases.
