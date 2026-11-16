# Changelog – SecurityOps 2.0

## [Unreleased]

### Hinzugefügt

- Übergabe-/Übernahmebestätigung verwendet serverseitige Teilnehmer-Kontozuordnung statt Kontakt-E-Mail oder Zugriff auf die Mitarbeiterliste. Liste/Detail liefern nur zwei Viewer-Flags; serverseitige Schreibautorisierung bleibt unverändert. Vier UI-/zwei Controllerfälle zunächst rot, gezielt Frontend26/Backend11 und Typprüfung/beide Builds lokal grün. Neuer echter PostgreSQL/API-Fall ohne Mitarbeiterleserecht und mit beiden Bestätigungen ergänzt; exakte Hosted-Ausführung offen.
- Erste zwei Hosted-Läufe der zehnten Browserjourney bestanden jeweils 6/7 Jobs und Browser9/10 mit Cleanup (CI43962727353/43963628561). Native Select-Labels und ein nur im Wachbuch vorhandener Offline-Hinweis waren falsche neue Testannahmen; präzise Label-Präfixe und tatsächlicher gemeinsamer Offline-Statusbutton ersetzen sie ohne entfernte Assertions oder größere Budgets. Noch kein zehnter Browsererfolg behauptet.
- Übergabe-Render-Schleife durch nicht idempotente Vorbelegung bei frischen Store-Getter-Arrays behoben. Listen-/Detail-/Schreibabschlüsse bleiben identitätsgebunden; alte private Entwürfe und Filter werden vor dem Paint geleert, Detailantworten bleiben an die Auswahl gebunden. Acht ursprünglich rote Fälle; Frontend 356/356, Typprüfung/Build lokal bestanden. Zehnte echte Browserjourney für Offline-Übergabe, verlorene echte Quittung und Reload ergänzt; lokale Ausführung vor Stackstart durch fehlenden Docker-Daemon blockiert, neue Hosted-Prüfung offen.
- FNL-021 ist als `a7af0bcc352f9274b02b7be19c9befeb598a0d05` gehostet bestätigt: CI 43960314043 7/7, gelesene Logs 348/549/9 plus Cleanup; die zuvor offen gehaltene Hosted-Prüfung ist damit geschlossen.
- Ownergebundene Wiederherstellung lokaler Kontrollgänge und Übergabe-Outbox statt tenantweiter Übernahme fremder Runden/Fortschritte/Metadaten. Vorheriger Ownerzustand wird vor dem Paint geleert; alte Speicherergebnisse/Fehler und verspätete Scan-Veröffentlichung nach Cache-Schreiben werden ignoriert. Ohne Patrol-Owner kein unbeschränkter Restore. Acht neue Komponentenfälle, sechs ursprünglich rot; kombiniert 171/171 gezielt, Typprüfung/Build bestanden. Neue exakte Gesamt-CI bleibt separat; kein bestätigter Exploit oder vollständiger Geräte-/Rollennachweis.
- FNL-020 ist auf `e3d6f9bd914a3840986d96fc676c3f4997fded49` vollständig gehostet geprüft: CI 43958520111 7/7, gelesene Logs 340 Frontend/549 Backend/9 echte Browser plus Cleanup. Das schließt die zuvor unten offen gehaltene Hosted-Prüfung, nicht die externen Abnahmen.
- Dauerhafter Wachbuchabschluss über die bestehende ownergebundene Sync-Outbox statt nur lokaler Statusänderung. Abschlussdialog erhält Fehlerentwürfe und zeigt bis zur Serverquittung „vorgemerkt“. Validierte Stufe, abgeleitetes `resolved`, echter Nachtrag und idempotente Quittung werden gemeinsam gespeichert; GET liefert tatsächliche Nachträge/Autoren. Keine erfundene Ersterfassungsrevision. Gezielte Frontendtests 155/155, PostgreSQL-Syncsuite 36/36, Typprüfung/beide Builds und echte Browser 9/9 einschließlich verlorener Abschlussquittung/identischem Replay bestanden. Lokale Gesamtprüfungen sind nicht vollständig grün; neue exakte Hosted-Prüfung bleibt offen, siehe Projektstatus. Keine Migration oder Produktionsfreigabe.
- Echte sitzungslokale In-App-Laufzeitmeldungen im Benachrichtigungscenter und Glockenzähler, benutzer-/mandantengebunden mit UUID, Lesen/Verwerfen und Schweregradfilter. Nicht angebundene E-Mail-/Push-/Warnpräferenzen nicht mehr als funktionierende Checkboxen dargestellt. Späte Konfliktfehler und Kontrollgang-Abschlüsse identitätsgebunden; Kontrollgang-Duplikatprüfung nur für die aktuelle Besitzer-Outbox. Elf zunächst rote Regressionen; Frontend 331/331, Typprüfung/Build und echte Browser 9/9 mit tatsächlicher Offline-Meldung, Lesen/Verwerfen, Zähler und Cleanup. Kein serverseitiges Zustellprotokoll oder vollständiger Sicherheitsnachweis.
- Zwölf Regressionen für verspätete Sync-Anhang-/Snapshot-Ergebnisse, Kontextwechsel im Konfliktdialog und sichtbare IndexedDB-Fehler. Alte Kontexte überschreiben keine aktuelle Outbox/Sync-Zeit/Benachrichtigung; Speicherfehler liefern einen ausdrücklichen Fehler, manuelle Synchronisierung startet ohne künstliche Wartezeit und beendet Pending auch bei Fehlern. Lokal Frontend 320/320, Typprüfung/Build und echte Browser 9/9 mit Cleanup.
- 38 Frontendregressionen für fünf Archiv-/Wiederherstellaktionen: API-/dauerhafte Queuebestätigung, feste Online-/Offlineentscheidung, Speicherfehler, verzögerter Identitätswechsel und geordnete Offline-Revisionen. UI wartet, blockiert Doppelaktionen und meldet unbestätigte Änderungen. Echte Browserfälle um Archiv/Reload/Wiederherstellung erweitert, inklusive Objektversionen 3→4→5 und erhaltenen Mitarbeiterdaten. Lokal Frontend 308/308, Typprüfung/Build und Browser 9/9 mit Cleanup; kein neuer Exploit behauptet.
- Neunte echte Browserjourney für dauerhafte Offline-Kundenanlage, tatsächliche Vertragswerte nach Reload/Änderung und persistierte Objektanforderungen nach Bearbeitung/Reload; Testdaten werden über reale Archivierungsaktionen entfernt. Lokal komplette Suite 9/9 mit Containerbereinigung.
- Achte echte Browserjourney für Mitarbeiteranlage, Nachweise ohne Ablaufdatum, tatsächliche Abwesenheit und HTTP-409-Konflikt mit erhaltenem Entwurf. Reload belegt Kalendertage und abgelaufenen Nachweisstatus; vollständige echte Suite 8/8 mit Containerbereinigung.
- Echte schreibgeschützte API-Konsole mit vorhandenen GET-Routen, tatsächlichen Daten/Fehlern, Pendingzustand und identitätsgebundenen Ergebnissen. Siebte echte Browserjourney prüft identische API-/UI-Daten, exakt erlaubten Kunden und tatsächliches HTTP 403 für SOP-only-Reader ohne Mutation. Lokal: Frontend 212/212 in 34 Dateien und Browser 7/7; exakte Hosted-Zuordnung steht im Projektstatus.
- Dauerhafte Offline-Folgeaufgabe für kritische Vorfälle über bestehende Outbox, echte UUID-Quittung und Retry ohne doppelte DB-Zeilen. Sechste echte Browserjourney verliert die tatsächliche erste Incident-/Task-Antwort; CI 43928436875 auf `5ef02b3` bestand 7/7.
- Erforderliche Sicherheits-/Produktionsreife-/Releasechecklisten und aktualisierte Fortsetzungsdokumentation mit ausdrücklich offenen Geräte-, Provider-, unabhängigen Sicherheits- und Rechtsgates; Modulmatrix um Technik-/Auditansichten und lokale Automationsentwürfe ergänzt.
- Echte Browserregression für HTTP-415-Anhangablehnung: Originalbytes, Besitzer, Idempotenzschlüssel und Uploadfehler bleiben nach Offline-Reload und Mandantenwechsel erhalten. Rückkehr zum Besitzer wiederholt die echte Ablehnung; kein DMS-Dokument und unveränderte tatsächliche S3-Objekte. Lokal/gehostet 5/5 Browserfälle; CI 43921057411 auf `3617576` 7/7. Neuer Fall 120 s, übrige Budgets unverändert; Dateitypprüfung vor dem Scan, kein Malware-/Geräte-/Providernachweis.
- Echte Browser-Fotojourney mit isoliertem privatem MinIO und ClamAV: Offline-Reload, fremdes Konto, verlorene echte Uploadquittung und identischer Retry; eine Version/ein Upload-/Clean-Audit, Originalbytes in S3/Download, anonymes S3 403 und Fremdtenant 404. Authentifizierte Suite lokal 4/4; neuer Fotofall 120 s, bestehende Budgets unverändert (Wachbuch/Identität 120 s, SOP 180 s). Kein Geräte-/Provider-Nachweis.
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

- Technik-/Abnahmeansichten beschreiben den tatsächlichen Express-/TypeScript-Pfad und einen schreibgeschützten Prüfplan statt simulierter Python-/RLS-/Releasefreigaben. Generische Automationen sind ausdrücklich lokale, nicht persistierte Entwürfe ohne Ausführungsengine; immer erfolgreiche Store-Test-/Run-Methoden entfernt.
- GitHub-Repositorybeschreibung nennt tatsächlichen React-/Express-/PostgreSQL-Pfad statt Node-Proxy und ausdrücklich keine Produktionsfreigabe.
- Explizite Backend-Integrationsbudgets für lange echte API-/Sync-Abläufe (30 s) und Patrol (60 s), analog zu bestehenden Handover-/Migrationstests. Der vollständige Lauf besteht 546/546; frühere 5-s-/30-s-Fehlläufe bleiben im Phase-11-Bericht dokumentiert. Keine Performancekorrektur, keine entfernten Assertions oder geänderten Anwendungs-/DB-Defaults.
- Oberflächentexte behaupten keine DIN-77200-/KRITIS-/BSI-Konformität mehr.
- Wachbuch-Fehlermeldungen beschreiben die technische Append-Only-Regel statt einer unbelegten DIN-77200-Pflicht.

### Fehlerkorrekturen

- Kunden verlangen tatsächliche Kundennummer/Vertragsdaten statt Zufallsnummer mit altem Jahr und festem Ablaufdatum. Verlängerung/Kündigungsfrist werden angezeigt und von API/Offline-Sync tatsächlich gespeichert; partielle Änderungen erhalten unveränderte SLA statt stiller Gold-Rücksetzung. Aufeinanderfolgende Offlineänderungen erhöhen die Revision. Objekte verwenden eingegebene Besetzung, Alarmanlage, Zutrittsregeln und IANA-Zeitzone statt erfundener Leitung/Hardware/SOP-Zahl; Online-/Offlinemapping und Bearbeitung erhalten die Werte. Lokal Frontend 270/270, Typprüfung/beide Builds, echte PostgreSQL-Fälle 3/3 und Browser 9/9; Hosted-Zuordnung separat.
- Mitarbeiter-Nachweise und Abwesenheiten bestätigen tatsächliche API-/Offline-Speicherung, erhalten Fehlerentwürfe und isolieren verspätete Identitätsantworten; Abwesenheitsform wird vor `await` erfasst. Kein Pflicht-Ablaufdatum für unbefristete Nachweise. Teilweise Nachweisspeicherung erhält den Mitarbeiter mit ausdrücklicher Warnung statt Doppelanlage/erfundenen Offline-Nachweisen; Offline-Gültigkeit bleibt bis zum Serverbeleg ausstehend. API liefert PostgreSQL-Kalendertage ohne Zeitzonenverschiebung und klassifiziert abgelaufene Nachweise nach Reload korrekt. Lokal Frontend 262/262, Typprüfung/Build und Browser 8/8; exakte neue Hosted-Prüfung separat.
- Kunden-/Objekt-/Mitarbeiterformulare warten auf expliziten API-Erfolg oder dauerhafte Offline-Vormerkung; Fehler erhalten Entwürfe, Pendingzustand blockiert Mehrfachsubmit und alte Identitätsantworten verändern keine neue UI. Sechs Storemethoden melden tatsächlichen Erfolg/Fehlschlag; Storagefehler werden nicht bestätigt und echte Onlinefehler nicht nachträglich als Offlineerfolg umgedeutet. Site-Kundenauswahl bleibt nach Hydration konsistent und ersetzt bei Bearbeitung keinen nicht verfügbaren Kunden. Lokal Frontend 242/242 und echte Browser 7/7; neue Hosted-Evidenz separat.
- Schlüssel-/Aufgabenformulare behalten unbestätigte Daten, zeigen Pending-/Fehlerzustände und ignorieren verspätete Antworten fremder Identitäten; keine erfundene Standardperson oder veraltete Schlüsselrückgabezeit.
- Arbeitszeitberichte beachten Tenant-/Site-Grants und binden Ergebnisse an Identität, Scope und Zeitraum; lokale Kalendertage bleiben unabhängig vom positiven UTC-Offset gültig.
- Native Ist-Zeitmuster akzeptieren gültige ISO-Zeitpunkte und lehnen fehlerhafte Eingaben tatsächlich ab; Komponentenregression und echter Chromium-Patterncheck.
- Audit-Center zeigt lokale/Beispieldaten statt erfundener Pentest-/MFA-/Unveränderlichkeitsgarantien; unwirksamer Fernwiderruf und nicht implementierter Auskunftsexport sind deaktiviert. Lokale Vorfallzuordnung verwendet echte Sitzungsemail/-rolle und ausdrücklich nicht erhobene IP.
- Verspätete IndexedDB-Erfolge und -Fehler verändern nach Identitätswechsel nicht die neue Queue-/Fehleranzeige; ursprünglicher dauerhafter Besitz bleibt erhalten. CI 43929519192 auf `3b98363` bestand 7/7 mit Frontend 206, Backend 546 und Browser 6.
- Echter Browser-Runner wartet nach `docker stop` mit höchstens zehn erfolgreichen Containerlisten-Prüfungen auf die asynchrone `--rm`-Entfernung. Docker-Fehler werden nicht als erfolgreiche Bereinigung behandelt; die Ressourcenprüfung bleibt verpflichtend.
- Offline-Browser-Fixture besitzt explizite Standort-/Mitarbeiter-Leserechte und wartet vor Erfassung auf die erwarteten Referenz-IDs; kein Umgehen des produktiven Rechte-Gatings.
- Isolierter Restore-Drill erzeugt Archive mit UID/GID des aufrufenden Restore-Benutzers und prüft Besitz, Lesbarkeit sowie weiterhin private `0600`-Rechte. Behebt den Linux-Bindmount-Zugriffsfehler ohne Änderung der Produktionsrechte.
- Berechtigungsgerechtes Datenladen: reine SOP-Konten rufen keine sieben unberechtigten Basismodule mehr ab; Standort-/Eigenrechte bleiben beim Session-Restore erhalten. Tatsächliche API-Fehler bleiben sichtbar und werden nicht pauschal als unerreichbares Backend bezeichnet.
- Navigation zeigt für angemeldete Konten die tatsächliche Sitzungsrolle statt der lokal simulierten „Einsatzleitung“; der lokale Rollenumschalter wird dort nicht mehr angeboten.
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
