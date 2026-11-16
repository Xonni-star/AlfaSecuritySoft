# Changelog – SecurityOps 2.0

## [Unreleased]

### Hinzugefügt

- Echte SOP-Browserjourney: unabhängige Erstellung/Prüfung/Freigabe, reine Mitarbeiterrechte, bewusste Offline-Kenntnisnahme, Offline-Reload und idempotente Wiederholung nach verlorener echter Quittung. Authentifizierte Chromium-Suite lokal 3/3.
- Erweiterte authentifizierte Report-/Berechtigungsmatrix: vier Berichte und CSV, Tenant-/Site-Grants, sofortiger Rechteentzug, manipulierte Mandantenhinweise, exakte Aggregate und direkte Schicht-IDs; PostgreSQL-Suite 16/16 bestanden.
- Echte Chromium-/PostgreSQL-Prüfung mit zwei Konten und zwei Mandanten: fremde Offline-Mutationen bleiben unangetastet, erst die ursprüngliche Identität synchronisiert genau einmal.
- Erreichbare Abmeldung in der Navigation mit sichtbarem Hinweis bei nicht bestätigtem serverseitigem Widerruf; echter Browser-Test weist auch eine zurückbehaltene Kopie des alten Cookies nach erfolgreicher Abmeldung zurück.
- Authentifizierter Chromium-Offline-Test mit echter Express-/PostgreSQL-Anbindung, isolierter Datenbank und kontrolliert verlorener erster Sync-Quittung; eigener Root-CI-Schritt und Fehlerartefakte.
- Backup-Healthcheck für Archivfrische und letzten Sicherungsfehler; atomare Archivveröffentlichung, private Dateirechte und Regressionen für Fehler/Erholung im isolierten Restore-Drill. Dies ist kein Restore- oder externer Alarmierungsnachweis.
- Quellcode-/Test-Evidenzmatrix der 13 Projektmodule und Abgrenzung des aktiven Node-Backends vom historischen Python-Pfad.
- Migration 042 aktualisiert die technische Wachbuch-Fehlermeldung additiv; veröffentlichte Migrationen 001/004 behalten ihre ursprünglichen SHA-256-Prüfsummen.
- Automatische unauthentifizierte Negativtests für alle 215 registrierten geschützten API-Routen.
- Restore-Regression mit injiziertem DDL-Fehler nach der Clean-Phase und abweichendem Vor-Restore-Datenstand als Rollback-Nachweis.
- Regressionstest für Nachtschichten über Zeitumstellungen (7 h/9 h reale Dauer).
- Standortbezogene Zugriffsbeschränkung für alle vier Planungsberichte sowie Aggregate und Arbeitszeit-CSV; Regressionstest für Standort-A/Standort-B und fehlende Berechtigungen.

### Geändert

- Oberflächentexte behaupten keine DIN-77200-/KRITIS-/BSI-Konformität mehr.
- Wachbuch-Fehlermeldungen beschreiben die technische Append-Only-Regel statt einer unbelegten DIN-77200-Pflicht.

### Fehlerkorrekturen

- SOP-Formulare senden optionale leere Datums-/DMS-Felder als `null` für Anlage, Entwurfsänderung und neue Versionen; der zuvor reproduzierte HTTP-400-Fehler entfällt.
- SOP-Listen liefern die exakte `version_id` auch für Mitarbeiter; Offline-Kenntnisnahmen können damit die tatsächlich zugewiesene Version binden. Verwaltungssichten liefern die angezeigte Entwurfs- oder veröffentlichte Versions-ID.
- Wachbuch-Auswahlwerte werden bei ersetzten Referenzdaten auf vorhandene Defaults aufgelöst, statt nicht mehr vorhandene IDs im Formularzustand zu behalten.
- Roster-Testisolation: lange Vorlagen-/Identitätsszenarien getrennt, ausstehende Einmal-Mocks zurückgesetzt, doppelte Select-Ereignisse entfernt und falschen Refresh-Selektor korrigiert. Verzögerte Antworten werden nachweislich ausgelöst; vollständige Frontend-Suite 175/175 mit unverändertem Standard-5-s-Budget bestanden.
- Session-Wiederherstellung liest das tatsächliche `userId`-Feld von `/auth/me`, damit nach Reload keine leere Benutzeridentität und blockierte Synchronisation entstehen.
- Wachbuchformulare verwenden nachgeladene Standort-/Mitarbeiter-Standardwerte konsistent bei Anzeige und Speicherung, statt leere IDs in die Offline-Outbox zu schreiben.
- Patrol-Integrationstests schließen beide PostgreSQL-Pools nach der Bereinigung; der lange API-Test verwendet ein begrenztes 30-Sekunden-Zeitbudget.
- Sync-Quittungen weisen die Wiederverwendung einer Mutations-ID mit geändertem Entitätstyp oder Vorgang zurück.
- Kontrollpunkte sind nach Ablauf des zweiminütigen Duplikatfensters erneut scannbar; Scans innerhalb des Fensters werden abgewiesen.
- Backend- und Frontend-Regressionstests sichern beide Verhaltensweisen gegen spätere Rückfälle ab.
- Browserbasierte Berichte quotieren und maskieren CSV-Werte, escapen Anführungszeichen und neutralisieren Formeleingaben.
- Die Sync-Oberfläche zeigt für ownerlose Altanhänge nur noch einen generischen Hinweis. Dateimetadaten und Inhalte können nicht mehr angezeigt, exportiert oder verworfen werden; die lokalen Daten bleiben erhalten.
- Der Restore spielt PostgreSQL-Dumps transaktional mit Fehlerabbruch ein; nach fehlgeschlagenem Restore bleiben Dienste gestoppt. Regressionstests decken Restore- und Resume-Fehlerpfade ab.
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
