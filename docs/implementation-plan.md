# Technischer Umsetzungsplan: DIWISH Event Operations

> Status: ursprüngliche Planungsgrundlage. Der aktuelle Implementierungsstand
> ist im [README](../README.md) dokumentiert; die weitere Priorisierung steht
> in der [Produkt-Roadmap](product-roadmap.md).

## Ausgangslage

Das Repository enthält eine Next.js-Grundstruktur und die verbindliche
Excel-Referenz
[`reference/DIWISH_Eventplanung_Tool.xlsx`](reference/DIWISH_Eventplanung_Tool.xlsx).
Die Arbeitsblätter Dashboard, Event-Setup, Aufgabenplan, Checklisten, Rollen,
Dropdowns und Anleitung bilden die fachliche Ausgangsbasis. Felder, Status-
und Prioritätswerte, Rollen, Abhängigkeiten, Rückwärtsplanung und
Qualitätssicherungsabläufe sind bei der weiteren Modellierung gegen diese
Baseline zu prüfen.

## Empfohlener Tech-Stack

- **Web-App:** Next.js mit App Router und TypeScript
- **UI:** Tailwind CSS; ergänzend eine zugängliche Komponentenbasis wie shadcn/ui
- **Backend:** Next.js Server Actions beziehungsweise Route Handlers
- **Datenbank:** PostgreSQL
- **ORM und Migrationen:** Prisma
- **Authentifizierung:** Auth.js oder ein verwalteter Anbieter; rollenbasierte Autorisierung bleibt in der Anwendung
- **Validierung:** Zod für Formulare, Imports und Server-Schnittstellen
- **Tests:** Vitest für Geschäftslogik, Playwright für zentrale Nutzerabläufe
- **Betrieb:** zunächst ein einzelnes Next.js-Deployment plus verwaltete PostgreSQL-Datenbank

Ein separates Backend oder Microservices sind für den MVP nicht erforderlich. Fachlogik sollte dennoch nicht direkt in UI-Komponenten liegen.

## Empfohlene Ordnerstruktur

```text
src/
  app/
    (auth)/
    (dashboard)/
      events/
      tasks/
    api/
  components/
    ui/
    events/
    tasks/
  modules/
    auth/
    organizations/
    events/
    tasks/
    templates/
    reporting/
  lib/
    db.ts
    permissions.ts
    validation/
prisma/
  schema.prisma
  migrations/
tests/
  e2e/
docs/
  implementation-plan.md
```

Jedes Fachmodul bündelt Datenzugriff, Validierung, Geschäftslogik und fachbezogene Typen. `app/` enthält hauptsächlich Routing und Seitenkomposition.

## MVP-Umfang

Der MVP bildet einen gemeinsamen Arbeitsraum für ein Team ab:

1. **Benutzer und Teamzugriff**
   - Anmeldung
   - Organisation beziehungsweise Team
   - Rollen `Admin`, `Planer` und `Mitglied`
   - serverseitige Prüfung aller Zugriffe

2. **Eventverwaltung**
   - Event anlegen, bearbeiten und archivieren
   - Status: Entwurf, Planung, Durchführung, Nachbereitung, abgeschlossen
   - Stammdaten wie Titel, Termin, Ort, Verantwortliche und Notizen

3. **Aufgaben und Deadlines**
   - Aufgaben je Event mit Verantwortlichem, Status, Priorität und Fälligkeit
   - persönliche sowie eventbezogene Aufgabenansicht
   - Kennzeichnung überfälliger und bald fälliger Aufgaben

4. **Planungsvorlagen**
   - wiederverwendbare Aufgabenvorlage für neue Events
   - initiale Übertragung der verbindlichen Excel-Struktur
   - Importstrategie auf Basis der referenzierten Arbeitsmappe festlegen

5. **Nachbereitung**
   - Abschlussnotizen und einfache Checkliste
   - offene Restaufgaben sichtbar halten

Nicht Teil des ersten MVP sind Echtzeit-Collaboration, komplexe Benachrichtigungsregeln, Kalender-Synchronisation, Dateiablage, Budgetverwaltung und umfangreiche Auswertungen.

## Priorisierte Umsetzung

1. Projekt mit Next.js, TypeScript, Tailwind CSS, Prisma und PostgreSQL initialisieren; CI, Linting und Umgebungsvariablen einrichten.
2. Excel-Referenz fachlich analysieren und ein minimales Datenmodell für `Organization`, `User`, `Membership`, `Event`, `TaskTemplate`, `Task` und `EventNote` festlegen.
3. Authentifizierung, Mandantentrennung und Rollenprüfung umsetzen und automatisiert testen.
4. Event-Liste, Event-Detailseite und Event-Statusworkflow entwickeln.
5. Aufgabenverwaltung mit Verantwortlichen, Fristen, Filtern und Überfälligkeitslogik ergänzen.
6. Vorlagenbasierte Event-Erstellung und Nachbereitungsansicht hinzufügen.
7. MVP mit End-to-End-Tests, Seed-Daten, Backup-Konzept und Deployment-Dokumentation absichern.

## Risiken und offene Entscheidungen

- **Excel als Fachquelle:** Die Baseline liegt vor. Spalten, Formeln,
  Dropdownwerte, Abhängigkeiten und tatsächlich genutzte Abläufe müssen vor
  dem finalen Schema vollständig analysiert und fachlich bestätigt werden.
- **Mandantenmodell:** Zu entscheiden ist, ob nur ein DIWISH-Team oder später mehrere getrennte Organisationen unterstützt werden. Die Daten sollten von Beginn an einer Organisation zugeordnet sein.
- **Rechtekonzept:** Rollen und Sonderrechte, etwa für vertrauliche Notizen oder Event-Löschung, benötigen fachliche Freigabe.
- **Benachrichtigungen:** Kanal, Zeitpunkt und Eskalationsregeln für Deadlines sind offen. Für den MVP genügt die Anzeige in der App.
- **Datenschutz:** Personenbezogene Daten, Aufbewahrungsfristen, Hosting-Region, Protokollierung und Löschkonzept müssen vor dem Produktivbetrieb feststehen.
- **Gleichzeitige Änderungen:** Für den MVP reichen aktualisierte Daten nach Speichern und eine Konflikterkennung über `updatedAt`; echte Live-Bearbeitung kann später folgen.
- **Importstrategie:** Ein einmaliger Migrationsimport ist deutlich einfacher als ein dauerhaft bidirektionaler Excel-Abgleich und sollte bevorzugt werden.

## MVP-Erfolgskriterium

Ein Team kann sich anmelden, ein Event aus einer Standardvorlage erstellen, Verantwortlichkeiten und Fristen gemeinsam pflegen, überfällige Aufgaben erkennen und die Nachbereitung dokumentieren, ohne parallel in der Excel-Datei arbeiten zu müssen.
