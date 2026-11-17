# AlfaSecuritySoft - Backup- und Wiederherstellungskonzept

> **Aktueller Evidenzstand:** `main` enthält Migrationen bis einschließlich 040; der Post-Merge-Restore-Job auf `879ae951d6cea52fd84d01dc699cf2ed08843300` bestand in [CI run 43754217295](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43754217295). Die Test- und CI-Läufe bleiben isolierte/synthetische Nachweise. Provider-Restore und RPO/RTO sind weiterhin offen; siehe [PROJECT_CURRENT_STATUS.md](../PROJECT_CURRENT_STATUS.md) und [PHASE_9_COMPLETION_REPORT.md](../PHASE_9_COMPLETION_REPORT.md).

## 1. Vollständiges Backup

Der Produktionsdienst erstellt täglich ein Archiv mit PostgreSQL-Dump. Das Archiv wird mit AES-256-CBC/PBKDF2 verschlüsselt, im Volume `secops_backups` gespeichert und nach 30 Tagen gelöscht. DMS-Objekte liegen in einem externen S3-kompatiblen Speicher und sind nicht Bestandteil dieses Archivs.

Für die Wiederherstellbarkeit des DMS müssen Betreiber zusätzlich S3-Versionierung, Replikation/Backup und Retention beim gewählten Anbieter konfigurieren und testen. Ein konsistenter Datenbankdump ohne passende S3-Objekte ist keine vollständige DMS-Sicherung.

## 2. Wiederherstellung

Mit `frontend/deploy/restore.sh <archiv.tar.gz.enc>` wird der Backend-Schreibzugriff gestoppt und der PostgreSQL-Dump mit `--single-transaction --exit-on-error` restauriert. Scheitert der Restore, bleiben Backend und Proxy gestoppt; PostgreSQL rollt die Restore-Transaktion zurück. Schlägt das Wiederanlaufen fehl, versucht das Skript, alle Resume-Dienste erneut zu stoppen. S3-Objekte müssen über den Anbieter separat auf einen mit den Metadaten konsistenten Stand wiederhergestellt werden. Nach einem Restore müssen Scanner und S3-Zugriff geprüft werden; nicht wiederhergestellte Objekte können nicht heruntergeladen werden.

## 3. Datenträgerverschlüsselung und Aufbewahrung

Die Verschlüsselung ruhender S3-Objekte und die Aufbewahrung müssen beim Anbieter konfiguriert werden. Das DMS bietet für archivierte Dokumente einen expliziten API-Löschvorgang für alle Dateiobjekte; Metadaten und unveränderliche Auditereignisse bleiben erhalten. Automatische tenant-spezifische Aufbewahrungsregeln sind nicht implementiert.

## 4. Verifizierungsstand

**Phase 11 (16.11.2026, lokal):** Der vollständige isolierte PostgreSQL-/MinIO-Drill bestand mit Migrationen bis 042. Der Fehlerfall verwendet jetzt einen Event-Trigger, der nach den anfänglichen DROP-/Clean-Anweisungen bei `CREATE TABLE` fehlschlägt. Ein bewusst vom Backup abweichender Dokumenttitel bleibt unverändert erhalten; der Test prüft so echtes transaktionales Rollback nach bereits begonnenen Schemaänderungen statt nur einen Verbindungsfehler vor Beginn des Restore. Der Teilstart-/Resume-Fehlerfall und die gezielte Ressourcenbereinigung bestanden ebenfalls. Diese Evidenz ist weiterhin kein externer Provider-Restore oder Produktions-RPO/RTO.

Der frühere CI-Lauf auf `main` (`77fdb0955e3bbbef01690edc93dc630e443bfbe8`) führte den isolierten vollständigen Schema- und DMS-Objektsnapshot-Restore erfolgreich aus: [Run 43702382063](https://github.com/Xonni-star/SecurityOps-2.0/actions/runs/43702382063). Das prüfte synthetische Daten in einer Testumgebung und ist kein Restore eines Produktionssystems oder eines Produktions-S3-Anbieters. Der aktuelle Post-Merge-Lauf ist oben verlinkt.

Der lokale PostgreSQL-only-Test `time npm run test:backup-restore --prefix frontend/backend -- --database-only` bestand auf dem Phase-4-Stand in 40,363 Sekunden und auf dem Phase-5-Stand mit Migration 039 erneut in 44,43 Sekunden. Diese Dauern beschreiben isolierte Testläufe und sind kein Produktions-RTO. Ein früherer lokaler kombinierter PostgreSQL-/Objektspeicher-Lauf war wegen `401 UNAUTHORIZED` beim Abruf des Test-Images `quay.io/minio/mc:RELEASE.2025-02-08T19-14-21Z` blockiert; der fehlgeschlagene Lauf bereinigte seine Testressourcen. Am 15.11.2026 wurde der vollständige lokale Drill erfolgreich mit den in CI gepinnten GHCR-MinIO-Images ausgeführt (`RESTORE_TEST_MC_IMAGE` und `RESTORE_TEST_MINIO_IMAGE` auf `ghcr.io/disaster37/minio@sha256:282ffcd2e0a3906086ab49cd70765617b20ce5c24ccf7d788043eb9b4ae59e6f`).

Am 16.11.2026 bestand der lokale vollständige Drill mit den in CI gepinnten GHCR-MinIO-Images: erfolgreicher Restore, Tenant-RLS und DMS-Objekt-Prüfungen sowie beide Fehlerpfade (Restore-Fehler lässt Dienste gestoppt und erhält den Datenbankstand; Fehler nach teilweise erfolgreichem Resume stoppt gestartete Dienste). Das ist lokale synthetische Regressionsevidenz, kein CI-Lauf für den aktuellen Worktree.

Es wurden kein Produktionsanbieter, keine produktiven Daten und kein produktiver Restore geprüft. Ein gemessenes RPO oder RTO liegt nicht vor; Betreiber müssen Ziele festlegen und für Datenbank **und** Dokumentenobjekte in einem separaten, wiederholbaren Anbieter-Drill messen.

Der historische Phase-5-Arbeitsstand ergänzte Migration 039 für strukturierte Alarm-/Arbeitsdatensatz-Links. Der dazugehörige vollständige Drill verwendete `backup_cron.sh` und `restore.sh` in einem zufällig benannten Compose-Testprojekt mit synthetischen Daten. Er verifizierte **37 angewendete Migrationen** bis einschließlich 039 und den erneuten Lauf des Migrationsrunner nach Restore, `ENABLE/FORCE ROW LEVEL SECURITY` auf neun DMS-Tabellen und `alarm_incident_links`, getrennte Datensätze zweier Testmandanten, Audit-/Versions-/Objektreferenzen sowie beide aus dem getrennten S3-Snapshot wiederhergestellten Objekte anhand SHA-256 und Metadaten. Nach dem Restore antwortete `/api/v1/health` mit `OPERATIONAL` bei Verbindung als `secops_app_user`; der simulierte fehlgeschlagene Restore stellte den zuvor gestoppten Testdienst wieder her. Der Cleanup bestätigte, dass keine Container, Volumes oder Netzwerke des Testprojekts übrig blieben. ClamAV wurde nicht gestartet. Der Drill war isoliert und synthetisch und ist weder ein Produktionsanbieter-Restore noch ein gemessenes Produktions-RPO/RTO.
