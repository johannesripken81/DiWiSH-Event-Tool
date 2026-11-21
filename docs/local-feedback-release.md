# Die kleinen Feedback-Aenderungen lokal veroeffentlichen

Die am 17. November 2026 erstellten 20 Dateien liegen bereits im lokalen Projektordner. Zusaetzlich gibt es jetzt zwei Release-Hilfen und diese Anleitung. Ein Download aus einem Cloud-Chat ist nicht erforderlich.

Die folgenden Befehle im eigenen Windows-PowerShell-Terminal ausfuehren. Die eingeschraenkten Ausfuehrungsrechte des Chats gelten nicht als Einstellungen fuer dieses eigene Terminal. Die Skripte aendern keine Chat-, Sandbox- oder Freigaberichtlinien.

## 1. Branch sichern, pruefen und zu GitHub pushen

```powershell
Set-Location 'C:\Users\johan\OneDrive\Dokumente\DiWISHEventTool'
& .\scripts\publish-feedback-local.ps1 -Step Publish
```

Das Skript prueft Repository und Vercel-Projekt, nimmt ausschliesslich die festgelegten Release-Dateien auf und stoppt bei weiteren lokalen Aenderungen. Es erstellt den Branch `release/feedback-quick-fixes-20261121`, committet die Dateien, holt `origin/main`, integriert dessen aktuellen Stand per Rebase und fuehrt `db:generate` und `quality` aus. Erst nach erfolgreichen Pruefungen wird der Branch gepusht. Ein GitHub-Anmeldefenster gegebenenfalls mit dem eigenen Konto abschliessen. Die Ausgabe enthaelt den Link zum Erstellen des Pull Requests gegen `main`.

Bei einem Rebase-Konflikt oder einer fehlgeschlagenen Pruefung stoppt der Ablauf. Den Fehler beheben, bevor der Schritt erneut gestartet wird; die Arbeit bleibt im Release-Branch erhalten. Ein vorheriger erfolgreicher Push wird bei erneutem Ausfuehren nicht erzwungen ueberschrieben.

Falls die Ausfuehrung einer `.ps1`-Datei durch eine Windows-Richtlinie gesperrt ist, keine systemweite Richtlinie fuer diesen Release abschalten. Stattdessen die Fehlermeldung weitergeben oder die Git-Befehle aus dem Skript im eigenen Terminal einzeln ausfuehren.

## 2. Getrennte Preview-Datenbank und bekannte Verbindungen

Das vorhandene `.vercel/project.json` verknuepft das Projekt mit `diwish-event-tool` im Team `johannesripken81s-projects`. Die als Secret gespeicherten Production- und Preview-Werte lassen sich nicht zuruecklesen. Der Helfer verwendet deshalb keine ueber `vercel env run` geerbten Datenbankwerte mehr: Bei fehlenden Secrets koennen dort lokale `.env`-Werte zum Einsatz kommen, deren Zuordnung zur angeforderten Umgebung nicht bewiesen ist.

In den Vercel-Projekteinstellungen muessen `DATABASE_URL` und `DATABASE_URL_UNPOOLED` fuer Preview auf eine getrennte Testdatenbank zeigen und fuer Production auf die Live-Datenbank. Vor dem naechsten Schritt diesen Unterschied pruefen; das Migrationsskript kann aus einer einzelnen Verbindung nicht erkennen, ob dieselbe Datenbank versehentlich fuer beide Umgebungen hinterlegt ist.

Die aktuellen Verbindungen in der Neon-Konsole fuer die jeweils ausgewaehlte Branch und Datenbank beziehen und lokal in `.env.release-preview` bzw. `.env.release-production` speichern. Diese Dateien werden bereits von Git ignoriert. Jede Datei braucht `DATABASE_URL_UNPOOLED` fuer die direkte Verbindung; `DATABASE_URL` kann fuer die gepoolte Verbindung ergaenzt werden. Zugangsdaten nicht in Chat, Terminalbefehle oder Git uebernehmen. Die bekannten Test-Verbindungen gegebenenfalls erneut als Preview-Secrets in Vercel hinterlegen, damit die Zuordnung feststeht. Die Live-Zuordnung separat in Neon bestaetigen.

## 3. Preview-Migration und Vorschau pruefen

```powershell
& .\scripts\publish-feedback-local.ps1 -Step MigratePreview -ConnectionFile .env.release-preview
```

Der aktualisierte Helfer verlangt immer eine ausdruecklich ausgewaehlte, von Git ignorierte Verbindungsdatei. Fehlt sie, fehlt der direkte Datenbankwert darin oder enthaelt sie nur einen Secret-Platzhalter, stoppt der Helfer vor jeder Datenbankverbindung. Er verwendet weder geerbte Verbindungswerte noch `.env` oder `.env.local` als Ersatz. Das Skript akzeptiert ausschliesslich die bereits bekannte neue Feedback-Migration; fehlen aeltere Migrationen oder ist ein vorheriger Lauf fehlgeschlagen, stoppt es.

Den Pull Request auf GitHub erstellen. Nach erfolgreicher GitHub-Quality-Pruefung die Vercel-Vorschau oeffnen und mit einem Testkonto pruefen:

- Vergangene Events ein-/ausblenden; offene Nachbereitungsaufgaben bleiben sichtbar.
- Lange Vorlagennamen sind vollstaendig lesbar.
- Format und Projekt lassen sich unabhaengig speichern.
- Der neue Status fuer externe Rueckmeldung laesst sich speichern und filtern.
- Die Beschreibungen von Konzeption und Planung sind sichtbar.

Falls auf dem Branch bereits ein automatisches Preview-Deployment erstellt wurde, kann dieses nach erfolgter Migration zum Testen genutzt werden.

## 4. Live-Migration, dann Merge

Nach erfolgreicher Vorschau:

```powershell
& .\scripts\publish-feedback-local.ps1 -Step MigrateProduction -ConnectionFile .env.release-production
```

Dieser Schritt verwendet ausschliesslich die in Neon bestaetigte Live-Verbindung aus `.env.release-production`.

Der Helfer wendet `20261117120000_feedback_quick_fixes` an und prueft anschliessend Projektfeld und Aufgabenstatus. Bereits angewendete Migrationen werden nur geprueft. Das Skript setzt keine Datenbank zurueck und fuehrt keinen Seed aus.

Erst nach erfolgreicher Meldung den geprueften Pull Request nach `main` mergen. Die vorhandene GitHub-Anbindung erstellt dadurch das Production Deployment. In Vercel den erfolgreichen Status des neuen Deployments abwarten und danach <https://diwish-event-tool.vercel.app> pruefen. Insbesondere das konkrete Event Beiratssitzung bei Bedarf ueber Format → Bearbeiten korrigieren; der vorhandene Wert wird nicht aus dem Eventtitel abgeleitet.

## Nur den lokalen Release-Umfang pruefen

```powershell
& .\scripts\publish-feedback-local.ps1 -CheckOnly
```

Dieser Aufruf schreibt nichts in Git, baut nichts und kontaktiert keine Datenbank. Ohne einen erfolgreichen Lauf der obigen Schritte sind die Aenderungen weiterhin nur lokal vorhanden.

Offizielle Referenzen: [Vercel CLI env](https://vercel.com/docs/cli/env), [Vercel fuer GitHub](https://vercel.com/docs/git/vercel-for-github).
