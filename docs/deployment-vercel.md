# Deployment mit Vercel und Neon

Diese Anleitung beschreibt den empfohlenen Betrieb für den aktuellen
Vercel-Hobby-Account mit GitHub-Anbindung.

Ziel:

- `main` ist das Live-System.
- Änderungen werden zuerst als Vercel Preview getestet.
- Erst nach erfolgreichem Test wird nach `main` gemergt und live deployed.
- Produktionsdaten und Testdaten bleiben getrennt.

## Empfohlene Struktur

| Bereich        | Empfehlung                                                  |
| -------------- | ----------------------------------------------------------- |
| Live-Code      | GitHub-Branch `main`                                        |
| Test-Code      | Pull Request oder Branch, zum Beispiel `staging`            |
| Live-Web-App   | Vercel Production Deployment                                |
| Test-Web-App   | Vercel Preview Deployment                                   |
| Live-Datenbank | Neon Production Branch oder eigenes Neon Production-Projekt |
| Test-Datenbank | Neon Staging/Preview Branch oder eigenes Neon Test-Projekt  |

Wichtig: Preview Deployments dürfen nicht dieselbe Datenbank wie das
Live-System verwenden. Sonst verändern Tests echte Produktivdaten.

## Einmalige Einrichtung in Vercel

1. Vercel öffnen.
2. GitHub-Repository `johannesripken81/DiWiSH-Event-Tool` importieren.
3. Framework Preset: **Next.js**.
4. Production Branch: `main`.
5. Build Command: Standard lassen oder `npm run build`.
6. Install Command: Standard lassen.
7. Environment Variables eintragen.

### Production Environment Variables

In Vercel unter **Project Settings → Environment Variables** für
**Production** eintragen:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@PROD-HOST-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@PROD-HOST.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
```

`DATABASE_URL` ist die gepoolte Neon-Verbindung.  
`DATABASE_URL_UNPOOLED` ist die direkte Neon-Verbindung für Migrationen und
Admin-Skripte.

Keine echten Zugangsdaten in GitHub, README oder `.env.example` speichern.

### Preview Environment Variables

Für **Preview** dieselben Variablennamen eintragen, aber mit einer getrennten
Neon-Testdatenbank:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@STAGING-HOST-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@STAGING-HOST.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
```

Wenn du nur eine Neon-Datenbank nutzt, ist das zwar für einen schnellen Test
möglich, aber nicht empfehlenswert. Preview-Tests würden dann Live-Daten
ändern.

## Einmalige Einrichtung der Live-Datenbank

Auf deinem Rechner im Projektordner:

```bash
npm install
npm run db:generate
npm run db:validate
npm run db:migrate:deploy
```

Danach den ersten Admin-Zugang anlegen oder aktualisieren:

```bash
npm run user:ensure-admin -- mail@diwish.de "DEIN-SICHERES-PASSWORT" "Johannes Ripken"
```

Für Produktion nicht `npm run db:seed` verwenden, außer du möchtest bewusst
Demo-Daten in der Live-Datenbank haben.

## Einmalige Einrichtung der Test-Datenbank

Für Preview/Staging dieselben Schritte gegen die Testdatenbank ausführen.
Dafür lokal kurz die `.env` auf die Neon-Testdatenbank setzen:

```bash
npm run db:migrate:deploy
npm run user:ensure-admin -- mail@diwish.de "DEIN-TEST-PASSWORT" "Johannes Ripken"
```

Optional kannst du in der Testdatenbank Demo-Daten anlegen:

```bash
npm run db:seed
```

## Update-Ablauf

1. Neue Änderung nicht direkt auf `main` entwickeln.
2. Branch anlegen, zum Beispiel `feature/dashboard-filter`.
3. Änderung lokal prüfen:

   ```bash
   npm run quality
   ```

4. Branch zu GitHub pushen.
5. Pull Request gegen `main` öffnen.
6. GitHub Actions prüfen lassen.
7. Vercel Preview Deployment öffnen und fachlich testen.
8. Wenn Datenbankänderungen enthalten sind:
   - Migration zuerst auf der Testdatenbank prüfen.
   - Vor dem Merge die Migration auf der Live-Datenbank ausführen.
9. Erst danach Pull Request nach `main` mergen.
10. Vercel erstellt automatisch das Production Deployment.

## Datenbankmigrationen im Release

Bei reinen UI-Änderungen ist keine Datenbankmigration nötig.

Bei Änderungen an `prisma/schema.prisma` gilt:

1. Migration lokal erzeugen:

   ```bash
   npm run db:migrate -- --name beschreibender_name
   ```

2. Migration mit committen.
3. Migration auf der Testdatenbank ausführen:

   ```bash
   npm run db:migrate:deploy
   ```

4. Preview Deployment testen.
5. Migration auf der Live-Datenbank ausführen.
6. Pull Request mergen.

Für riskante oder löschende Schemaänderungen vorher ein Neon-Backup oder einen
Neon-Branch/Snapshot anlegen.

## Rollback

Wenn ein Production Deployment fehlerhaft ist:

1. In Vercel das vorherige Deployment öffnen.
2. **Promote to Production** verwenden.
3. Danach in GitHub den fehlerhaften Commit revertieren oder einen Fix-Branch
   erstellen.

Achtung: Ein Vercel-Rollback macht keine Datenbankmigration rückgängig. Wenn
die Datenbank geändert wurde, muss die Korrektur separat geplant werden.

## Was Vercel automatisch übernimmt

- Push oder Merge auf `main` erzeugt ein Production Deployment.
- Pull Requests und andere Branches erzeugen Preview Deployments.
- Vercel baut die Next.js-App mit `npm run build`.
- GitHub Actions prüfen zusätzlich TypeScript, Linting, Tests und Build.

Offizielle Doku:

- [Vercel Git Deployments](https://vercel.com/docs/deployments/git)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Neon und Vercel](https://neon.com/docs/guides/vercel-overview)

## Checkliste vor Livegang

- [ ] Vercel-Projekt ist mit GitHub verbunden.
- [ ] Production Branch ist `main`.
- [ ] Production Environment Variables zeigen auf die Live-Neon-Datenbank.
- [ ] Preview Environment Variables zeigen auf eine getrennte Testdatenbank.
- [ ] Live-Datenbank hat alle Migrationen.
- [ ] Admin-Zugang `mail@diwish.de` ist angelegt.
- [ ] Login im Production Deployment funktioniert.
- [ ] Pull Requests erzeugen Preview Deployments.
- [ ] GitHub Actions laufen erfolgreich.
- [ ] Niemand nutzt Preview gegen Live-Daten.

## Fehler: Login-Seite lädt nicht

Wenn Vercel auf `/login` nur **This page couldn't load** zeigt:

1. In Vercel das Projekt öffnen.
2. **Deployments** öffnen.
3. Das neueste Deployment anklicken.
4. **Runtime Logs** oder **Functions Logs** öffnen.
5. Nach dem ersten echten Fehler suchen.

Häufige Ursachen:

- `DATABASE_URL` fehlt in Vercel Production.
- `DATABASE_URL_UNPOOLED` fehlt in Vercel Production.
- Die Variablen wurden nur für Preview, aber nicht für Production eingetragen.
- Nach dem Eintragen der Variablen wurde nicht neu deployed.
- Die Login-Migration wurde noch nicht auf der Live-Datenbank ausgeführt.
- Der Neon-Branch ist pausiert oder die Verbindung zeigt auf die falsche
  Datenbank.

Nach Änderungen an Environment Variables immer ein neues Production Deployment
starten. Vercel übernimmt neue Variablen nicht rückwirkend in bereits gebaute
Deployments.
