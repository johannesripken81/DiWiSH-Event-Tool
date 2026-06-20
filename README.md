# DIWISH Event Operations

Web-App für die gemeinsame Planung, Durchführung und Nachbereitung von
DIWISH-Netzwerkveranstaltungen.

Die Anwendung überführt die bisherige Excel-basierte Eventplanung in einen
zentralen, mehrbenutzerfähigen Arbeitsbereich. Teams können Events auf Basis
von Vorlagen anlegen, Aufgaben rückwärts vom Eventdatum planen, Zuständigkeiten
verwalten und den Vorbereitungsstand in einem Event-Cockpit verfolgen.

## Projektziel

Die App soll für jedes Event eine verlässliche operative Arbeitsgrundlage
schaffen:

- zentrale Event-Stammdaten statt verteilter Tabellen
- wiederverwendbare Event- und Aufgabenvorlagen
- klare Verantwortlichkeiten, Prüfungen und Freigaben
- automatische Fälligkeiten relativ zum Eventdatum
- transparente Risiken, Deadlines und Event-Readiness
- Kommunikationsplanung und einfache Teilnehmer-/Kontaktliste
- strukturierte Evaluation und dokumentierte Learnings
- vorbereitete Anbindung an Microsoft Planner und Power Automate

Der aktuelle Stand ist ein funktionsfähiger MVP mit einfachem Login per Name
oder E-Mail und Passwort. Echte Microsoft-Integrationen, Single Sign-on und
automatische externe Benachrichtigungen sind noch nicht enthalten.

## Tech-Stack

| Bereich       | Technologie                                                  |
| ------------- | ------------------------------------------------------------ |
| Web-Framework | Next.js mit App Router                                       |
| Sprache       | TypeScript                                                   |
| Oberfläche    | React, Tailwind CSS, eigene wiederverwendbare UI-Komponenten |
| Datenbank     | Neon Postgres                                                |
| ORM           | Prisma                                                       |
| Validierung   | Zod                                                          |
| Qualität      | ESLint, Prettier, TypeScript                                 |
| Tests         | Node.js Test Runner mit `tsx`                                |

Eine lokale PostgreSQL- oder Docker-Installation ist nicht erforderlich. Neon
ist der vorgesehene Standardweg.

## Projektstruktur

```text
prisma/
  migrations/             Versionierte Datenbankmigrationen
  schema.prisma           Datenmodell
  seed.ts                 Demo- und Vorlagendaten
scripts/
  generate-due-notifications.ts
services/
  plannerSync.ts          Vorbereitung der Planner-Synchronisation
src/
  app/                    Next.js-Seiten und serverseitige Aktionen
  components/             Wiederverwendbare UI-Komponenten
  lib/                    Datenbank, Berechtigungen und Audit Logging
  modules/                Fachlogik nach Funktionsbereich
  generated/prisma/       Generierter Prisma Client
tests/                    Automatisierte Fachlogik-Tests
docs/                     Technische und produktbezogene Dokumentation
```

## Lokale Installation

### Voraussetzungen

- Node.js 20 oder neuer
- npm
- ein Neon-Projekt mit einer Postgres-Datenbank
- Git für das Herunterladen und Aktualisieren des Projekts

### 1. Abhängigkeiten installieren

Im Projektordner:

```bash
npm install
```

### 2. Environment-Datei anlegen

Unter PowerShell:

```powershell
Copy-Item .env.example .env
```

Alternativ unter macOS oder Linux:

```bash
cp .env.example .env
```

Danach die Datei `.env` öffnen und die Platzhalter durch die eigenen
Neon-Verbindungsdaten ersetzen. Die Datei ist durch `.gitignore` geschützt und
darf nicht in Git eingecheckt werden.

## Environment Variables

Die erwarteten Variablen stehen ohne echte Zugangsdaten in `.env.example`.

| Variable                 | Pflicht | Verwendung                                                     |
| ------------------------ | ------- | -------------------------------------------------------------- |
| `DATABASE_URL`           | Ja      | Gepoolte Neon-Verbindung für die laufende Web-App              |
| `DATABASE_URL_UNPOOLED`  | Ja      | Direkte Neon-Verbindung für Prisma-Migrationen und Seed        |
| `APP_SEED_USER_PASSWORD` | Nein    | Startpasswort für Demo-Nutzer beim Seed; lokal frei festlegbar |
| `DATABASE_POOL_MAX`      | Nein    | Maximale Datenbankverbindungen pro laufender App-Instanz       |

Beispiel mit Platzhaltern:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@HOST.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
APP_SEED_USER_PASSWORD="HIER_EIN_SICHERES_STARTPASSWORT_EINTRAGEN"
DATABASE_POOL_MAX="5"
```

### Datenbank mit Neon einrichten

1. [Neon](https://console.neon.tech/) öffnen und das gewünschte Projekt
   auswählen.
2. Den Bereich **Connect** öffnen.
3. Wenn verfügbar, **Prisma** als Verbindungstyp auswählen.
4. Den gepoolten Connection String kopieren und in `.env` als `DATABASE_URL`
   eintragen. Der Host enthält normalerweise `-pooler`.
5. Den direkten beziehungsweise unpooled Connection String kopieren und als
   `DATABASE_URL_UNPOOLED` eintragen.
6. Darauf achten, dass beide URLs `sslmode=verify-full` enthalten.
7. Die unten beschriebenen Prisma-Befehle ausführen.

Prisma 7 liest die Verbindungsdaten für Befehle aus `prisma.config.ts`. Die
Web-App verwendet die gepoolte URL aus `src/lib/db.ts`.

## Datenbankmigration

Nach der ersten Einrichtung:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate:deploy
```

`db:migrate:deploy` wendet die bereits im Repository vorhandenen Migrationen
auf die Neon-Datenbank an. Der Befehl verändert das Schema nur anhand der
versionierten Dateien in `prisma/migrations`.

Wenn das Prisma-Schema während der Entwicklung bewusst geändert wird, wird
eine neue Migration erzeugt:

```bash
npm run db:migrate -- --name beschreibender_name
```

Neue Migrationen müssen gemeinsam mit der Schemaänderung eingecheckt werden.
Vorhandene, bereits angewendete Migrationen sollten nicht nachträglich geändert
werden.

Nützliche Datenbankbefehle:

```bash
npm run db:validate       # Prisma-Schema prüfen
npm run db:generate       # Prisma Client neu erzeugen
npm run db:migrate:deploy # vorhandene Migrationen anwenden
npm run db:studio         # Datenbankoberfläche öffnen
```

## Seed-Daten

Die Entwicklungsdaten werden mit folgendem Befehl angelegt:

```bash
npm run db:seed
```

Der Seed enthält:

- sechs Demo-Nutzer mit unterschiedlichen Rollen
- das Event-Template **Netzwerktreffen**
- etwa 30 Task-Templates über alle Eventphasen
- das Demo-Event **DIWISH Netzwerktreffen KI & Mittelstand**
- automatisch berechnete Event-Aufgaben und Abhängigkeiten

Verfügbare Demo-Nutzer:

| Name            | E-Mail             | Rolle           |
| --------------- | ------------------ | --------------- |
| Johannes Ripken | `mail@diwish.de`   | `ADMIN`         |
| Verena          | `verena@diwish.de` | `EVENT_LEAD`    |
| Karin           | `karin@diwish.de`  | `ADMIN`         |
| Emely           | `emely@diwish.de`  | `COMMUNICATION` |
| Inga            | `inga@diwish.de`   | `TEAM_MEMBER`   |
| Moni            | `moni@diwish.de`   | `TEAM_MEMBER`   |

Alle Demo-Nutzer erhalten beim Seed dasselbe Startpasswort. Setze dafür in
`.env` am besten vorher:

```dotenv
APP_SEED_USER_PASSWORD="DEIN_SICHERES_STARTPASSWORT"
```

Wenn kein Wert gesetzt ist, verwendet der Seed lokal das Demo-Passwort
`EventTool-Start-2026!`. Für einen echten Team-Betrieb sollte dieses Passwort
nicht verwendet werden. Admins können Passwörter später in **Einstellungen →
Team und Rollen** ändern.

Wenn bereits Nutzer in der Datenbank existieren und du nur ein Passwort für
einen bestehenden Admin setzen möchtest, nutze statt Seed:

```bash
npm run user:set-password -- mail@diwish.de "DEIN-SICHERES-PASSWORT"
```

Der Befehl setzt nur das Passwort für diese E-Mail-Adresse und beendet
vorhandene Sitzungen dieser Person.

Für ein neues Live-System ohne Demo-Daten kann der erste Admin direkt angelegt
oder aktualisiert werden:

```bash
npm run user:ensure-admin -- mail@diwish.de "DEIN-SICHERES-PASSWORT" "Johannes Ripken"
```

Der Seed ist ausschließlich für Entwicklung und Demo gedacht. Ein erneuter
Seed-Lauf ersetzt Teile des Demo-Templates und des Demo-Events. Er sollte nicht
auf einer produktiv gepflegten Datenbank ausgeführt werden.

## Entwicklungsstart

Vollständiger Erststart:

```bash
npm install
npm run db:generate
npm run db:validate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Danach im Browser öffnen:

<http://localhost:3000>

Die App leitet zuerst auf `/login`. Anmeldung ist mit Name oder E-Mail möglich,
zum Beispiel `mail@diwish.de` und dem gesetzten
`APP_SEED_USER_PASSWORD`.

Qualitätsprüfungen:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

Alle zentralen Prüfungen in einem Lauf:

```bash
npm run quality
```

## Rollenmodell

Schreibende Aktionen werden sowohl in der Oberfläche ausgeblendet als auch
serverseitig geprüft. Die zentrale Rechteprüfung liegt in
`src/lib/permissions.ts`.

| Rolle           | Rechte im MVP                                                                |
| --------------- | ---------------------------------------------------------------------------- |
| `ADMIN`         | Vollzugriff auf Events, Aufgaben und Fachmodule                              |
| `EVENT_LEAD`    | Events und Aufgaben vollständig verwalten                                    |
| `COMMUNICATION` | Kommunikationsplan verwalten; eigene Aufgaben und deren Status ändern        |
| `TEAM_MEMBER`   | Eigene Aufgaben bearbeiten und deren Status ändern                           |
| `GUEST`         | Für späteren Lesezugriff vorbereitet; im MVP kein freigegebener Eventzugriff |

Die Nutzerzuordnung erfolgt über den einfachen Login mit Name oder E-Mail und
Passwort. Rollen werden weiterhin in der Datenbank gepflegt und serverseitig
geprüft. Für eine spätere Microsoft-365-Umgebung kann Microsoft Entra ID als
Single Sign-on ergänzt werden.

## Kernmodule

### Event-Cockpit

Die Eventliste zeigt Datum, Format, Status, Event Lead, Aufgabenfortschritt
sowie offene, überfällige und kritische Aufgaben. Das Event-Cockpit ergänzt:

- Stammdaten, Zuständigkeiten und zentrale Links
- nächste Deadlines und Risikohinweise
- Readiness Score mit fehlenden Bereichen
- Teilnehmerkennzahlen
- Evaluation und Learnings
- Änderungsverlauf aus dem Audit Log

### Aufgabenplanung

Aufgaben können pro Event erstellt, bearbeitet, gefiltert und abgeschlossen
werden. Unterstützt werden Status, Phase, Priorität, Verantwortliche,
Prüferinnen und Prüfer, Freigaben, kritische Kennzeichnung, Abhängigkeiten und
vorbereitete Planner-Sync-Felder.

Zeitliche Hervorhebung:

- überfällig: rot
- in den nächsten sieben Tagen fällig: gelb
- erledigt: grün
- in Bearbeitung: blau
- entfällt: grau

Erledigte und entfallene Aufgaben gelten nicht als offen oder überfällig.

### Kommunikationsplan

Kommunikationsmaßnahmen werden pro Event nach Kanal und Freigabestatus
verwaltet. Veröffentlichungsdatum, Zielgruppe, Botschaft, Asset-Link und
Kennzahlen wie Klicks, Anmeldungen oder Reichweite sind abbildbar.
Überfällige, noch nicht veröffentlichte Maßnahmen werden markiert.

### Teilnehmermanagement

Die Teilnehmerliste ist bewusst schlank gehalten. Erfasst werden Vorname,
Nachname, E-Mail-Adresse und Organisation. Zusätzlich gibt es einen CSV-Import
mit Spaltenzuordnung für Vorname, Nachname, E-Mail und Organisation.

### Evaluation und Wirkung

Pro Event können quantitative Ergebnisse und qualitative Learnings gepflegt
werden. Die No-Show-Quote wird aus Anmeldungen und tatsächlichen Teilnehmenden
berechnet. Learnings werden zurück ins Event-Cockpit gespiegelt.

### Audit Logging

Wichtige Änderungen an Events und Aufgaben werden mit handelnder Person,
Aktion, Entität sowie altem und neuem Wert gespeichert. Dazu gehören unter
anderem Erstellung, Status-, Fälligkeits- und Verantwortlichkeitsänderungen,
Freigaben und Abschlüsse.

## Event-Template-Logik

Ein `EventTemplate` bündelt wiederverwendbare `TaskTemplate`-Einträge. Beim
Anlegen eines Events mit Vorlage werden daraus eigenständige `EventTask`-
Datensätze erzeugt.

Dabei gilt:

1. Titel, Beschreibung, Phase, Priorität und Freigabeanforderung werden aus
   dem Task-Template übernommen.
2. `dueDate` wird aus Eventdatum und `offsetDays` berechnet.
3. Die Standardrolle wird nach Möglichkeit einer passenden Person zugeordnet.
4. `EVENT_LEAD` verweist auf den Event Lead; Kommunikation auf die
   kommunikationsverantwortliche Person.
5. Nicht auflösbare Zuständigkeiten bleiben leer und können im Cockpit
   nachgepflegt werden.

Die erzeugten Aufgaben sind Kopien. Spätere Änderungen am Template verändern
bestehende Event-Aufgaben nicht automatisch.

## Rückwärtsplanung

Jede vorlagenbasierte Aufgabe kann einen Tagesversatz relativ zum Eventdatum
besitzen:

```text
dueDate = eventDate + offsetDays
```

Beispiele:

- `-45`: 45 Tage vor dem Event
- `0`: am Eventtag
- `3`: drei Tage nach dem Event

Wird ein Fälligkeitsdatum manuell geändert, setzt die App
`isDueDateManuallyOverridden = true`. Bei einer späteren Änderung des
Eventdatums werden Fälligkeiten nicht still aktualisiert. Im Event-Cockpit gibt
es dafür die explizite Aktion **Fälligkeiten aus Eventdatum neu berechnen**.

Manuell überschriebene Fälligkeiten bleiben standardmäßig erhalten. Sie werden
nur einbezogen, wenn dies ausdrücklich bestätigt wird.

## Readiness Score

Der Readiness Score wird aus Event-Stammdaten und Aufgabenstatus berechnet und
umfasst maximal 100 Punkte:

| Bereich                                   | Punkte |
| ----------------------------------------- | -----: |
| Pflichtfelder im Event-Setup vollständig  |     20 |
| Kritische Konzeptaufgaben erledigt        |     15 |
| Kommunikation bereit oder freigegeben     |     15 |
| Location, Catering und Technik geklärt    |     20 |
| Vor-Ort-Rollen verteilt                   |     10 |
| Teilnehmermanagement ausreichend gepflegt |     10 |
| Feedback und Nachbereitung vorbereitet    |     10 |

Bewertung:

- 90 bis 100: **Eventbereit**
- 70 bis 89: **Solide, aber prüfen**
- 50 bis 69: **Risiko**
- unter 50: **Kritisch**

Das Cockpit zeigt zusätzlich, in welchen Bereichen noch Punkte fehlen. Der
Score ist eine operative Orientierung und keine automatische
Freigabeentscheidung.

## Benachrichtigungslogik

`generateDueNotifications()` prüft offene, erinnerungsfähige Aufgaben und
erzeugt interne `Notification`-Datensätze. Noch werden keine E-Mails,
Teams-Nachrichten oder Push-Mitteilungen versendet.

Unterstützte Regeln:

| Zeitpunkt                    | Notification-Typ       |
| ---------------------------- | ---------------------- |
| sieben Tage vor Fälligkeit   | Erinnerung             |
| drei Tage vor Fälligkeit     | Erinnerung             |
| am Fälligkeitstag            | Erinnerung             |
| einen Tag überfällig         | Überfälligkeitsmeldung |
| kritische Aufgabe überfällig | Eskalation             |

Eine eindeutige Kombination aus Aufgabe und Benachrichtigungstyp verhindert
doppelte Meldungen. Erinnerungs- und Eskalationszeitpunkte werden außerdem an
der Aufgabe gespeichert.

Manueller Lauf:

```bash
npm run notifications:generate
```

Für den Produktivbetrieb fehlt noch ein regelmäßig ausgeführter Scheduler,
beispielsweise ein Plattform-Cronjob oder eine Power-Automate-Lösung.

## Planner- und Power-Automate-Ausblick

Die Web-App bleibt das führende System für Eventdaten, Fälligkeiten,
Freigaben, Readiness und Audit Logging. Microsoft Planner ist als spätere
operative Aufgabenansicht vorgesehen.

`EventTask` enthält bereits Felder für Planner Task, Plan, Bucket,
Synchronisationsstatus, letzten Sync und Fehler. Der Stub-Service
`services/plannerSync.ts` definiert die vorgesehenen Synchronisationsfälle,
führt aber noch keine Microsoft-Graph-Aufrufe aus.

Grundregeln:

- Die Planner Task ID ist der Zuordnungsschlüssel.
- Änderungen werden nicht ungeprüft in beide Richtungen überschrieben.
- Konflikte müssen über den Sync-Status sichtbar und auflösbar sein.
- Power Automate oder Microsoft Graph kann die spätere Übertragung ausführen.

Details stehen in
[docs/planner-power-automate-integration.md](docs/planner-power-automate-integration.md).

## Produktivbetrieb und Kosten

Für einen echten Team-Betrieb braucht die App eine Umgebung, die Next.js mit
Node.js ausführen kann. Ein klassischer PHP-/FTP-Webspace reicht nur dann, wenn
er Node.js-Prozesse oder Container dauerhaft unterstützt. Praktischer sind
Plattformen wie Vercel, Render, Railway, ein eigener VPS oder ein Webspace mit
Node.js-App-Support.

Kostenlos ist ein Testbetrieb bis zu einem gewissen Grad möglich:

- Neon bietet einen Free-Plan für Prototypen und kleine Projekte. Laut Neon
  enthält er unter anderem 100 CU-Stunden pro Projekt und 0,5 GB Speicher pro
  Projekt. Für belastbare Produktion, längere Historie, Support und SLA ist ein
  bezahlter Plan realistischer. Quelle:
  [Neon Plans](https://neon.com/docs/introduction/plans)
- Vercel Hobby ist kostenlos, laut Vercel aber auf persönliche,
  nicht-kommerzielle Nutzung beschränkt. Für Teamfunktionen und produktive
  Organisationsnutzung ist in der Regel ein Pro-Plan nötig. Quelle:
  [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)

Für DIWISH als Team-Tool ist die saubere Einordnung: kostenlos eignet sich gut
für Test, Pilot und Demonstration. Für den produktiven Einsatz mit mehreren
Teammitgliedern sollte mindestens ein kleines bezahltes Hosting-Setup
eingeplant werden.

## Bekannte Einschränkungen

- Der Login ist bewusst einfach gehalten: Name/E-Mail und Passwort,
  Passwort-Hashes in der Datenbank und Sitzungs-Cookie. Funktionen wie
  Passwort-zurücksetzen, Zwei-Faktor-Anmeldung und Account-Sperre fehlen noch.
- `GUEST` ist vorbereitet, aber noch nicht für Events freischaltbar.
- Benachrichtigungen werden nur intern gespeichert und nicht automatisch
  terminiert oder extern versendet.
- Die Planner-Funktionen sind Stubs ohne Microsoft-Graph-Verbindung.
- Gleichzeitige Bearbeitung wird nicht mit Live-Updates oder optimistischen
  Sperren abgesichert.
- Importe aus der bestehenden Excel-Vorlage fehlen noch.
- Exporte sind auf die druckfreundliche Eventtag-Ansicht begrenzt.
- Datei-Uploads und Asset-Verwaltung sind nicht enthalten; es werden Links
  gespeichert.
- Produktive Betriebsaspekte wie Monitoring, Backups, Datenschutzkonzept und
  Wiederherstellung müssen vor einem Rollout festgelegt werden.
- Der Readiness Score basiert auf festen MVP-Regeln und noch nicht auf
  konfigurierbaren Kriterien je Eventformat.

## Nächste Schritte

Priorität für den Übergang vom MVP in einen produktiven Team-Betrieb:

1. Passwort-Login produktiv absichern, inklusive Passwort-Reset,
   Account-Sperre und klarer Admin-Prozesse.
2. Deployment, Monitoring, Datenschutz, Backup und Berechtigungskonzept
   produktionsreif machen.
3. Benachrichtigungen automatisieren und Teams beziehungsweise Outlook
   anbinden.
4. Planner-Synchronisation mit Konfliktbehandlung implementieren.
5. Optional Microsoft Entra ID Login für Single Sign-on ergänzen.
6. Excel- und CSV-Import mit Vorschau und Validierung ergänzen.
7. Exportfunktionen und mobile Bedienung ausbauen.
8. Konfigurierbare Templates und Readiness-Regeln ermöglichen.
9. KI-Assistenz für Eventkonzepte kontrolliert ergänzen.

Die ausführliche Priorisierung steht in
[docs/product-roadmap.md](docs/product-roadmap.md).

## Fehlerbehebung

### `DATABASE_URL` fehlt

Prüfen, ob im Projektordner eine `.env` existiert und dort die gepoolte
Neon-Verbindung eingetragen ist. Danach den Entwicklungsserver neu starten.

### `DATABASE_URL_UNPOOLED` fehlt

Die direkte Neon-Verbindung in `.env` ergänzen. Prisma benötigt sie für
Migrationen und Seed-Daten.

### Neon-Datenbank ist nicht erreichbar

Verbindungsdaten, Passwort und Projektstatus in Neon prüfen. Beide URLs sollten
`sslmode=verify-full` enthalten. Bei kopierten Passwörtern auf nicht maskierte
Sonderzeichen achten.

Wenn Prisma `P1001: Can't reach database server` meldet, zuerst in Neon prüfen,
ob Projekt, Branch und Datenbank aktiv sind. Unter Windows kann außerdem der
Port-Test helfen:

```powershell
Test-NetConnection DEIN-NEON-HOST.eu-central-1.aws.neon.tech -Port 5432
```

Bei `TcpTestSucceeded: True` ist Neon grundsätzlich erreichbar. Dann liegt das
Problem meist an einem falschen Connection String, einer kurz pausierten Neon
Compute-Instanz oder einem Prisma-CLI-Problem.

Wenn Prisma nur `Schema engine error` ohne weitere Details ausgibt, aber eine
direkte Datenbankverbindung funktioniert, Node.js und Prisma-Version prüfen und
den Befehl erneut ausführen. Die App selbst nutzt die Datenbank über den
Postgres-Adapter; Prisma-Migrationen laufen separat über die Prisma CLI.

### Prisma-Migration schlägt fehl

Zuerst ausführen:

```bash
npm run db:validate
npm run db:generate
```

Danach prüfen, ob `DATABASE_URL_UNPOOLED` die direkte und nicht die
Pooler-Verbindung verwendet. Für vorhandene Migrationen
`npm run db:migrate:deploy` verwenden.

### Seed-Script fehlt oder startet nicht

Abhängigkeiten neu installieren und Prisma Client erzeugen:

```bash
npm install
npm run db:generate
npm run db:seed
```

Das Seed-Script ist in `prisma/seed.ts` konfiguriert und wird über `tsx`
ausgeführt.

### Die App zeigt keine Demo-Events

Migrationen und Seed nacheinander ausführen:

```bash
npm run db:migrate:deploy
npm run db:seed
```

Anschließend den Entwicklungsserver neu starten und prüfen, ob App und Prisma
dieselbe Neon-Datenbank verwenden.

### Anmeldung schlägt fehl

Prüfen, ob die Datenbankmigration für den Login schon ausgeführt wurde:

```bash
npm run db:migrate:deploy
```

Wenn Nutzer aus einer älteren Version noch kein Passwort haben, entweder Seed
erneut ausführen oder gezielt ein Passwort setzen:

```bash
npm run user:set-password -- mail@diwish.de "DEIN-SICHERES-PASSWORT"
```

Danach mit Name oder E-Mail und diesem Passwort anmelden.

## Weitere Dokumentation

- [Deployment mit Vercel und Neon](docs/deployment-vercel.md)
- [Produkt-Roadmap](docs/product-roadmap.md)
- [Planner- und Power-Automate-Integration](docs/planner-power-automate-integration.md)
- [Ursprüngliche technische Kurzplanung](docs/implementation-plan.md)
