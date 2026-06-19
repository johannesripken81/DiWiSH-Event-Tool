# Produkt-Roadmap

## Zielbild

DIWISH Event Operations soll die zentrale Arbeitsplattform für die Planung,
Durchführung und Auswertung von Netzwerkveranstaltungen werden. Die Web-App
bleibt das führende System für Eventdaten und Fachlogik. Microsoft 365,
Importe, Exporte und KI-Funktionen erweitern diesen Kern schrittweise.

Die Reihenfolge orientiert sich an drei Zielen:

1. den vorhandenen MVP produktionsreif und sicher betreiben
2. tägliche Teamarbeit durch Microsoft-365-Integrationen vereinfachen
3. Datenübernahme, Auswertung und konzeptionelle Assistenz ausbauen

## MVP umgesetzt

Der aktuelle MVP enthält:

- responsive Grundoberfläche mit Dashboard und Navigation
- Neon-Postgres-Datenmodell mit Prisma und versionierten Migrationen
- Demo-Nutzer, Event-Template und Aufgabenvorlagen als Seed-Daten
- Eventliste mit Filtern und operativen Kennzahlen
- Event-Cockpit mit Stammdaten, Deadlines, Risiken und Audit Log
- Eventanlage mit automatischer Erzeugung von Template-Aufgaben
- Aufgabenplanung mit Rollen, Status, Freigaben, Filtern und Fälligkeiten
- geschützte Rückwärtsplanung relativ zum Eventdatum
- Readiness Score mit Hinweisen auf noch nicht erfüllte Bereiche
- interner Benachrichtigungsgenerator mit Duplikatschutz
- Kommunikationsplan pro Event
- Teilnehmermanagement mit No-Show- und Follow-up-Kennzahlen
- Ablauf- und Regieplan mit Eventtag-Ansicht
- Evaluation, Wirkungskennzahlen und qualitative Learnings
- einfacher Login mit Name/E-Mail und Passwort
- zentrales Rollen- und Rechtekonzept mit serverseitigen Prüfungen
- Audit Logging für wichtige Event- und Aufgabenänderungen
- vorbereitete Planner-Sync-Felder und ein Stub-Service
- automatisierte Tests für zentrale Fachlogik

## Nächste Ausbaustufe

Bevor weitere Komfortfunktionen hinzukommen, sollte der MVP für den realen
Team-Betrieb abgesichert werden.

### Priorität 1: Produktionsreife

- Passwort-Login produktiv absichern, inklusive Passwort-Reset,
  Account-Sperre und klarer Admin-Prozesse
- rollenbasierte Eventfreigaben und vorbereiteter Gastzugriff
- produktives Hosting mit getrennten Umgebungen für Entwicklung und Produktion
- Monitoring, Fehlerprotokollierung und Alarmierung
- Backup-, Wiederherstellungs- und Löschkonzept
- Datenschutzprüfung und Festlegung von Aufbewahrungsfristen
- Schutz vor parallelem Überschreiben bei gleichzeitiger Bearbeitung
- automatischer Scheduler für interne Benachrichtigungen

### Priorität 2: Bedienung und Konfiguration

- frei konfigurierbare Event- und Aufgabenvorlagen
- konfigurierbare Readiness-Kriterien je Eventformat
- bessere Massenbearbeitung für Aufgaben und Teilnehmende
- gespeicherte Filter und persönliche Ansichten
- zentrale Benachrichtigungsübersicht mit Gelesen-Status
- verbesserte Barrierefreiheit und Tastaturbedienung

## Planner, Teams und Outlook

### Microsoft Planner

Ziel ist eine kontrollierte Synchronisation von Event-Aufgaben nach Planner.
Die Web-App bleibt führend für Eventbezug, Rückwärtsplanung, Freigaben,
Readiness und Audit Logging.

Geplante Schritte:

1. Microsoft-Graph-App registrieren und Berechtigungen abstimmen.
2. Zuordnung von Event, Plan und Planner-Buckets definieren.
3. Erstellung und Aktualisierung von Planner Tasks implementieren.
4. Planner-Abschlüsse in die Web-App zurückspielen.
5. Konflikte über `plannerSyncStatus` sichtbar machen.
6. Wiederholbare Sync-Jobs, Fehlerbehandlung und Audit Logging ergänzen.

### Microsoft Teams

- Fälligkeits- und Eskalationsmeldungen in definierte Kanäle senden
- persönliche Hinweise für Verantwortliche ermöglichen
- Links direkt auf Event und Aufgabe setzen
- Benachrichtigungsregeln pro Event oder Nutzer konfigurierbar machen

Teams-Nachrichten sollen keine eigene Datenwahrheit erzeugen. Statusänderungen
werden weiterhin in der Web-App oder über einen kontrollierten Sync
gespeichert.

### Microsoft Outlook

- Eventtermine als Kalendertermin bereitstellen
- optional zentrale Deadlines als Kalenderereignisse synchronisieren
- Änderungen am Eventdatum kontrolliert aktualisieren
- Einladungs- und Erinnerungsprozesse mit Kommunikationsmaßnahmen verbinden

Power Automate eignet sich für einen ersten Integrationsschritt. Für
umfangreiche, bidirektionale Synchronisation ist Microsoft Graph voraussichtlich
die belastbarere Grundlage.

## Microsoft Entra ID Login

Der aktuelle MVP nutzt einen einfachen Login mit Name/E-Mail und Passwort.
Microsoft Entra ID bleibt als spätere Single-Sign-on-Option für eine stärker in
Microsoft 365 eingebundene Umgebung sinnvoll.

Geplanter Umfang:

- Anmeldung mit dem DIWISH-Microsoft-Konto
- Zuordnung der Entra-Benutzer-ID zu einem internen `User`
- sichere serverseitige Sitzungen
- Rollenverwaltung durch Administratorinnen und Administratoren
- Deaktivierung ausgeschiedener Nutzer ohne Verlust des Audit Logs
- optional Gruppen- oder App-Rollen aus Entra ID übernehmen

Vor der Umsetzung müssen Tenant, erlaubte Konten, Gastzugriff und
Administrationsverantwortung festgelegt werden.

## Excel- und CSV-Import

Die bestehende DIWISH-Excel-Planung soll kontrolliert übernommen werden können.

Vorgesehener Ablauf:

1. Datei hochladen.
2. Tabellenblatt und Spalten automatisch erkennen.
3. Spalten auf Event-, Aufgaben- oder Teilnehmerfelder abbilden.
4. Vorschau mit Warnungen und Validierungsfehlern anzeigen.
5. Import erst nach ausdrücklicher Bestätigung ausführen.
6. Importherkunft und Änderungen im Audit Log speichern.

CSV eignet sich als einfaches Austauschformat. Für die vorhandene
Excel-Vorlage ist zusätzlich eine feste Importkonfiguration sinnvoll, damit
Fachbegriffe, Phasen und Datumswerte verlässlich zugeordnet werden.

## Exportfunktionen

Geplante Exporte:

- Event-Steckbrief als PDF
- Aufgabenplan als Excel oder CSV
- Regieplan als druckbares PDF
- Teilnehmerliste als Excel oder CSV
- Evaluation und Learnings als PDF
- Kalenderdaten als ICS
- Managementübersicht über mehrere Events

Exporte müssen Rollenrechte, personenbezogene Daten und den jeweiligen
Verwendungszweck berücksichtigen.

## Mobile Optimierung

Der erste Schwerpunkt liegt auf der praktischen Nutzung am Eventtag:

- kompakte Regieplan-Ansicht für Smartphone und Tablet
- große, schnell erreichbare Statusaktionen
- Aufgabenansicht für die aktuell verantwortliche Person
- robuste Tabellenalternativen in Kartenform
- bessere Darstellung von Teilnehmer- und Kontaktinformationen
- spätere Prüfung einer installierbaren Progressive Web App

Offline-Fähigkeit ist zunächst nicht eingeplant, weil Konfliktbehandlung und
Datenschutz dafür zusätzlichen Aufwand verursachen.

## KI-Assistenz für Eventkonzepte

KI soll Vorschläge liefern, aber keine Evententscheidungen oder
Freigabeschritte selbstständig übernehmen.

Mögliche Funktionen:

- Ziele, Zielgruppen und Nutzenversprechen aus einem Briefing strukturieren
- Agenda- und Methodenentwürfe vorschlagen
- Risiken und fehlende Planungsschritte erkennen
- Einladungs-, Reminder- und Follow-up-Texte entwerfen
- Learnings mehrerer Events zusammenfassen
- geeignete Task-Templates für ein Eventformat vorschlagen

Voraussetzungen:

- klare Kennzeichnung von KI-generierten Inhalten
- menschliche Prüfung vor Speicherung oder Veröffentlichung
- Datenschutzprüfung für eingegebene Event- und Teilnehmerdaten
- Protokollierung relevanter Übernahmen
- definierte Qualitäts- und Sicherheitsgrenzen

## Priorisierte Reihenfolge

| Priorität | Ergebnis                                                                                |
| --------- | --------------------------------------------------------------------------------------- |
| P0        | Passwort-Login absichern, Hosting, Datenschutz, Monitoring und sichere Betriebsprozesse |
| P1        | Scheduler sowie Planner-, Teams- und Outlook-Integration                                |
| P2        | Excel/CSV-Import, Exporte und konfigurierbare Templates                                 |
| P3        | mobile Eventtag-Nutzung und weitere UX-Verbesserungen                                   |
| P4        | kontrollierte KI-Assistenz für Konzeption und Kommunikation                             |

Die Prioritäten sollten nach ersten realen Pilot-Events überprüft werden.
Nutzungsdaten und Teamfeedback entscheiden, welche Automatisierung den größten
operativen Nutzen bringt.
