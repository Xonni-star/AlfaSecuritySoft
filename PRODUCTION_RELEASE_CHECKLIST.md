# AlfaSecuritySoft — Produktionsfreigabe-Checkliste

**Stand: 16.11.2026. Keine Produktionsfreigabe.**
Nicht gesetzte Haken sind offene Freigabevoraussetzungen. Ein historischer
Test, ein Merge und ein erfolgreiches Containerimage ersetzen sie nicht.

## Bereits belegte technische Grundlagen

- [x] Aktiven React-/Express-/PostgreSQL-Pfad und historischen Python-Pfad getrennt.
- [x] Revisionsgebundene CI-Evidenz dokumentiert; fehlgeschlagene Läufe erhalten.
- [x] Eigene ephemere Browser-/Restore-Umgebungen mit synthetischen Daten geprüft.
- [x] Sechs echte Cookie-/CSRF-/PostgreSQL-Browserjourneys einschließlich
      kritischem Offline-Vorfall mit Folgeaufgabe und verlorenem Serverbeleg.
- [x] Siebte echte Browserjourney für schreibgeschützte API-Daten, exakt erlaubten
      Kunden, echte Reader-Ablehnung und keine Mutationsanforderung.
- [x] Achte echte Browserjourney für bestätigte Mitarbeiter-/Nachweis-/Abwesenheitsdaten,
      nullable Nachweisbearbeitung, echten Konflikt mit erhaltenem Entwurf und
      Kalendertage/abgelaufenen Nachweisstatus nach Reload.
- [x] Neunte echte Browserjourney für Offline-Kundenanlage, tatsächliche Vertragswerte
      und Objektanforderungen nach Änderung/Reload; realer API-/Sync-Nachweis
      für Verlängerung/Kündigungsfrist und unveränderte SLA bei Teiländerung.
- [x] Archiv-/Wiederherstellbestätigung für Kunde/Objekt/Mitarbeiter, sichtbare
      Speicherfehler und identitätsgebundene verzögerte Ergebnisse; 38 neue
      Frontendregressionen sowie echte Archiv-/Reload-/Wiederherstellungsfälle
      innerhalb der neun Browserjourneys. Kein vollständiger Rollen-/Objektnachweis.
- [x] Zwölf weitere Regressionen für späte Sync-Anhang-/Snapshot-/Recovery-Ergebnisse,
      Identitäts-/Dialogwechsel und ausdrücklich gemeldete Speicherfehler.
      Lokal Frontend 320/320, Typprüfung/Build und reale Browser 9/9 mit Cleanup.
- [x] Gefundene simulierte Audit-/Technik-/Abnahmeergebnisse entfernt;
      lokale Automationsentwürfe und fehlende Engine ausdrücklich gekennzeichnet.
- [x] Echte lokale In-App-Meldungen in Center/Glockenzähler mit Lesen/Verwerfen,
      Benutzer-/Mandantenbindung und ausdrücklich nicht angebundenen Zustellpräferenzen.
      Elf zunächst rote Fälle, lokal Frontend 331/331, Typprüfung/Build und
      Browser 9/9 mit tatsächlicher Offline-Meldung und Cleanup.
      Kein serverseitiges Zustellprotokoll oder vollständiger Rollennachweis.
- [x] Privaten lokalen S3-/ClamAV-Ablauf, Originalbytes und echte Dateiablehnung geprüft.
- [x] Transaktionalen lokalen Restore, Fehler-/Resume-Pfade und Archivfrische geprüft.
- [x] FNL-020-Gesamtprüfung auf exaktem Commit abgeschlossen.
      Implementiert: dauerhafter Wachbuchabschluss mit Pending-UI, atomarem
      Status/Erledigt und echten Nachträgen. Gezielte Frontendtests 155/155,
      PostgreSQL-Syncsuite 36/36, Typprüfung/beide Builds und echte Browser
      9/9 mit verlorener Abschlussquittung/Replay/Cleanup bestanden.
      Exakte CI 43958520111 auf e3d6f9bd914a3840986d96fc676c3f4997fded49
      bestand 7/7, gelesene Logs 340/549/9 plus Cleanup. Vorherige lokale
      Fehlläufe werden dadurch nicht zu lokalen Erfolgen oder Produktionsabnahme.
- [x] FNL-021-Gesamtprüfung: lokale Kontrollgangs-/Übergabewiederherstellung
      ownergebunden implementiert; acht neue Komponentenfälle, sechs zunächst rot,
      kombiniert 171/171 gezielt und Typprüfung/Build bestanden. Exakte CI
      43960314043 auf a7af0bcc352f9274b02b7be19c9befeb598a0d05 bestand 7/7;
      gelesene Logs 348/549/9 plus Cleanup.
- [x] FNL-022–026-Gesamtprüfung: exakte CI43968759380 auf
      aa1d7738f9074393533fca74d0914ab2a3ab1a9d bestand7/7; gelesene Logs
      368 Frontend/553 Backend/10 echte Browser plus Cleanup, einschließlich
      realer Bestätigungen, Dokument-HTTP200 und UUID-genauem Quittungs-Replay.
- [x] FNL-027-Gesamtprüfung: acht Entwurfsverlust-/Besitzeraktivierungsfälle
      tatsächlich zunächst rot; exakte CI43970970744 auf
      6486a1798249dcd9c068d73b9bf333ab45668984 bestand7/7,
      gelesene376/553/10 und Cleanup.
- [x] FNL-028-Gesamtprüfung: zwei Sync-Refresh-/Mutexfälle zunächst rot;
      exakte CI43972242288 auf5ee9f36665616178c331e9c53526b1e35396b7bd
      bestand7/7, gelesene378/553/10 und Cleanup.
- [x] PR66 normal integriert als5c6031e21fc8cba3c8256525c9edc52928564f2b;
      identischer geprüfter Quellbaum, Main-CI43974506659 7/7 mit378/553/10.
      Artefakt43974980830 2/2 bestätigt Commit-/CI-Provenienz,40 Migrationen
      und saubere Backend-Produktionsinstallation, nicht ein Deployment.

Diese Haken bestätigen nur den beschriebenen Entwicklungsnachweis;
die exakten Revisionen stehen im [Projektstatus](./PROJECT_CURRENT_STATUS.md).

## Vor jeder konkreten Freigabe erneut erforderlich

- [ ] Eindeutigen Release-Commit und Artefaktprüfsummen festlegen; alle erforderlichen
      CI-Jobs auf genau diesem Commit erfolgreich, keine offenen wichtigen Befunde.
- [ ] Erreichbare interne Finalisierungsaufgaben und UI-Simulationen abschließen;
      README, Tracker, API-/Betriebsdokumentation und Releasebeschreibung abgleichen.
- [ ] Repräsentative authentifizierte Rollen-/Standort-/Objektmatrix fachlich abnehmen.
- [ ] Migration/Upgrade und getesteten Rollback-/Restoreplan auf produktionsgleicher
      Umgebung einschließlich DB und Objekten prüfen; keine veröffentlichten
      Migrationsprüfsummen verändern.
- [ ] Effektive RLS-/DB-Rollen, private Buckets, Scanner, Secrets, Proxy/TLS,
      Cookie-/CSRF-/CSP-/Rate-Limit-Konfiguration der Zielumgebung prüfen.
- [ ] Monitoring, externe Alarmierung, Benachrichtigungsprovider und Berechtigungsentzug
      mit positivem und negativem Zustell-/Zugriffsnachweis prüfen.
- [ ] Freigegebenen externen Provider-/Off-host-Restore ausführen und vereinbarte
      RPO/RTO tatsächlich messen; Verantwortliche und Recoveryprotokoll benennen.
- [ ] Physische Android-/iOS-Geräte einschließlich Offline-Neustart, Kontenwechsel,
      SOP, Dateien und Kontrollgänge abnehmen.
- [ ] Unabhängigen Penetrationstest und erforderliche Nachprüfung abschließen.
- [ ] Rechtliche Datenschutz-/Aufbewahrungs-/Betriebsanforderungen konkret freigeben;
      ownerlose Altdaten nicht ohne verifizierte Zuordnung offenlegen.
- [ ] Fachliche und betriebliche Freigabe durch autorisierte Verantwortliche
      dokumentieren; erst danach Deployment und gegebenenfalls Release/Tag auslösen.

**Keine implizite Autorisierung:** Diese Checkliste löst kein Deployment aus und
erteilt keine Produktions-, Zertifizierungs- oder Rechtsfreigabe.
