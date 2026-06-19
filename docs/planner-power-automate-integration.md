# Planner- und Power-Automate-Integration

## Zielbild

Die DIWISH Event Operations Web-App bleibt das **führende System** für Events,
Aufgaben, Verantwortlichkeiten, Fälligkeiten, Freigaben und Auswertungen.
Microsoft Planner dient später als operative Aufgabenebene für Personen, die
ihre tägliche Arbeit bereits in Microsoft 365 organisieren.

Die erste Ausbaustufe enthält noch keine Microsoft-Graph-Aufrufe, keine
Power-Automate-Flows und keine Anmeldung bei Microsoft. Der Servicevertrag ist
unter [`../services/plannerSync.ts`](../services/plannerSync.ts) vorbereitet.

## Rollen der Systeme

| System                              | Verantwortung                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Web-App                             | Führende Event- und Aufgabendaten, Rückwärtsplanung, Freigaben, Readiness und Audit-Log |
| Microsoft Planner                   | Operative Anzeige und Bearbeitung ausgewählter Aufgaben                                 |
| Power Automate oder Microsoft Graph | Technischer Transport zwischen Web-App und Planner                                      |

Änderungen in Planner dürfen die fachlichen Daten der Web-App nicht ungeprüft
ersetzen. Insbesondere Fälligkeit, Verantwortlichkeit, Kritikalität und
Freigabestatus bleiben in der Web-App maßgeblich.

## Vorhandene Sync-Felder

`EventTask` enthält bereits alle benötigten Felder:

- `plannerTaskId`: eindeutige ID der zugeordneten Planner-Aufgabe
- `plannerPlanId`: ID des Planner-Plans
- `plannerBucketId`: ID des Buckets innerhalb des Plans
- `plannerSyncStatus`: aktueller technischer Synchronisationsstatus
- `plannerLastSyncedAt`: Zeitpunkt der letzten erfolgreichen Synchronisation
- `plannerSyncRequired`: zeigt lokale Änderungen mit Synchronisationsbedarf an
- `plannerSyncError`: letzte verständliche Fehlermeldung

Die **Planner Task ID ist der zentrale Schlüssel für die Zuordnung** zwischen
Planner und `EventTask`. Nach dem erstmaligen Erstellen muss sie in
`plannerTaskId` gespeichert werden. Rückmeldungen aus Planner suchen die lokale
Aufgabe ausschließlich über diesen Schlüssel.

## Sync-Status

| Status       | Bedeutung                                                                     |
| ------------ | ----------------------------------------------------------------------------- |
| `NOT_SYNCED` | Es wurde noch keine Planner-Aufgabe angelegt.                                 |
| `PENDING`    | Eine lokale Änderung wartet auf Übertragung oder Prüfung.                     |
| `SYNCED`     | Web-App und Planner waren beim letzten Sync konsistent.                       |
| `ERROR`      | Die Synchronisation ist fehlgeschlagen; Details stehen in `plannerSyncError`. |
| `DISABLED`   | Die Integration ist deaktiviert oder noch nicht konfiguriert.                 |

Bestehende Aufgabenänderungen setzen eine bereits verknüpfte Aufgabe auf
`PENDING` und `plannerSyncRequired = true`. Das ist die Grundlage für eine
spätere Queue oder einen Power-Automate-Abruf.

## Vorbereitete Service-Funktionen

`services/plannerSync.ts` stellt folgende nebenwirkungsfreie Stub-Funktionen
bereit:

- `createPlannerTaskFromEventTask(taskId)`
- `updatePlannerTaskFromEventTask(taskId)`
- `markPlannerTaskCompleted(taskId)`
- `syncPlannerCompletionBack(plannerTaskId)`

Aktuell senden diese Funktionen keine Daten und verändern keine Datensätze. Sie
liefern einen typisierten `DISABLED`-Status. Dadurch kann keine versehentliche
Microsoft-Kommunikation stattfinden, bevor Authentifizierung, Berechtigungen
und Konfliktregeln vollständig umgesetzt sind.

## Geplanter Ablauf: Web-App zu Planner

1. Eine Event-Aufgabe wird für Planner freigegeben.
2. `createPlannerTaskFromEventTask(taskId)` lädt die Aufgabe aus der Web-App.
3. Microsoft Graph oder ein Power-Automate-Flow legt die Planner-Aufgabe an.
4. Die zurückgegebene ID wird als `plannerTaskId` gespeichert; Plan und Bucket
   werden ebenfalls hinterlegt.
5. Bei Erfolg werden `plannerSyncStatus = SYNCED`,
   `plannerSyncRequired = false`, `plannerLastSyncedAt = now()` und
   `plannerSyncError = null` gesetzt.
6. Spätere lokale Änderungen setzen den Status zunächst auf `PENDING`.

## Geplanter Ablauf: Planner zu Web-App

1. Power Automate oder ein Graph-Webhook erkennt eine erledigte
   Planner-Aufgabe.
2. Die Integration ruft
   `syncPlannerCompletionBack(plannerTaskId)` mit der externen ID auf.
3. Die Web-App findet die lokale Aufgabe über `plannerTaskId`.
4. Nur der ausdrücklich erlaubte Abschlussstatus wird übernommen.
5. Der Sync-Zeitpunkt und ein Audit-Log werden gespeichert.

Andere Planner-Änderungen wie Titel, Fälligkeit oder Zuordnung werden nicht
automatisch zurückgeschrieben, solange dafür keine eigene fachliche Regel
freigegeben wurde.

## Konfliktregel

Die Web-App überschreibt Planner **nicht automatisch ohne passenden
Sync-Status**:

- `NOT_SYNCED`: nur explizites Erstellen ist erlaubt.
- `PENDING`: Änderung wartet auf bewusste Synchronisation.
- `SYNCED`: erneute Übertragung nur bei einer nachfolgenden lokalen Änderung.
- `ERROR`: kein automatischer weiterer Schreibversuch ohne Fehlerbehandlung.
- `DISABLED`: keine Kommunikation mit Microsoft.

Vor jedem späteren Schreibzugriff muss zusätzlich geprüft werden, ob
`plannerSyncRequired = true` ist. Die Integration darf nach einem Konflikt nicht
blind „last write wins“ anwenden.

## Power Automate oder Microsoft Graph

Zwei spätere technische Wege sind möglich:

### Power Automate

Geeignet für einen schnellen organisatorischen Einstieg. Ein Flow kann
regelmäßig Aufgaben mit `plannerSyncRequired = true` über eine gesicherte
Web-App-Schnittstelle abrufen und Änderungen zurückmelden.

### Microsoft Graph

Geeignet für engere Integration, kontrollierte Fehlerbehandlung und
gegebenenfalls Webhooks. Dafür werden eine Entra-ID-App-Registrierung,
Berechtigungen, Tokenverwaltung und ein Graph-Adapter benötigt.

Beide Varianten verwenden denselben Servicevertrag und dieselben Sync-Felder.
Die fachliche Datenhoheit bleibt unabhängig vom Transportweg in der Web-App.

## Offene Entscheidungen vor Aktivierung

- Microsoft-Tenant und Entra-ID-App-Registrierung
- delegierte oder anwendungsweite Graph-Berechtigungen
- Zuordnung von DIWISH-Nutzern zu Microsoft-365-Konten
- Plan- und Bucket-Strategie pro Event
- erlaubte Felder für Hin- und Rücksynchronisation
- Intervall, Queue oder Webhook für die Ausführung
- Wiederholungsstrategie und Anzeige von Sync-Fehlern
- Auditierung und Datenschutz für Microsoft-Daten
