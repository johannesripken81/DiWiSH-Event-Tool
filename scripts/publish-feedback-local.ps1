[CmdletBinding()]
param(
    [ValidateSet('Publish', 'MigratePreview', 'MigrateProduction')]
    [string]$Step = 'Publish',
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$feedbackRoot = Split-Path -Parent $PSScriptRoot
$feedbackBranch = 'release/feedback-quick-fixes-20261121'
$feedbackScope = 'johannesripken81s-projects'
$feedbackFiles = @(
    'prisma/schema.prisma',
    'scripts/check-dashboard-layout.ts',
    'src/app/events/[id]/edit/page.tsx',
    'src/app/events/[id]/page.tsx',
    'src/app/events/[id]/tasks/task-form.tsx',
    'src/app/events/new/actions.ts',
    'src/app/events/new/event-form.tsx',
    'src/app/events/page.tsx',
    'src/app/page.tsx',
    'src/app/settings/settings-ui.tsx',
    'src/modules/audit/presentation.ts',
    'src/modules/dashboard/queries.ts',
    'src/modules/events/create-event.ts',
    'src/modules/events/metrics.test.ts',
    'src/modules/events/presentation.ts',
    'src/modules/events/queries.ts',
    'src/modules/notifications/due-notifications.test.ts',
    'docs/feedback-2026-11-17.md',
    'prisma/migrations/20261117120000_feedback_quick_fixes/migration.sql',
    'src/app/dashboard-event-list.tsx',
    'scripts/publish-feedback-local.ps1',
    'scripts/migrate-feedback-release.mjs',
    'docs/local-feedback-release.md'
)

function Invoke-FeedbackCommand {
    param([string]$Command, [string[]]$CommandArgs)
    & $Command @CommandArgs
    if ($LASTEXITCODE -ne 0) {
        throw "$Command ist mit Exit-Code $LASTEXITCODE fehlgeschlagen. Der Ablauf wurde angehalten; vorhandene Arbeit bleibt erhalten."
    }
}

Push-Location -LiteralPath $feedbackRoot
try {
    $feedbackOrigin = & git remote get-url origin
    if ($LASTEXITCODE -ne 0 -or $feedbackOrigin -notmatch '^https://github\.com/johannesripken81/DiWiSH-Event-Tool(?:\.git)?$') {
        throw 'Das Verzeichnis ist nicht mit dem erwarteten DiWiSH-Event-Tool-Repository verbunden.'
    }
    $feedbackProject = Get-Content -LiteralPath '.vercel/project.json' -Raw | ConvertFrom-Json
    if ($feedbackProject.projectId -ne 'prj_ab2dtFw2kznrT6L8PzftkIPwQGv4' -or $feedbackProject.orgId -ne 'team_dLVHdYNNoYnraHawEbTsqNdX') {
        throw 'Die lokale Vercel-Verknuepfung zeigt nicht auf das erwartete Live-Projekt.'
    }

    if ($Step -eq 'Publish') {
        $feedbackChanges = @(& git -c core.safecrlf=false diff --name-only HEAD --)
        if ($LASTEXITCODE -ne 0) { throw 'Lokale Aenderungen konnten nicht gelesen werden.' }
        $feedbackChanges += @(& git ls-files --others --exclude-standard)
        if ($LASTEXITCODE -ne 0) { throw 'Neue Dateien konnten nicht gelesen werden.' }
        $feedbackUnexpected = @($feedbackChanges | Where-Object { $_ -and $_ -notin $feedbackFiles })
        if ($feedbackUnexpected.Count -gt 0) {
            throw ('Weitere lokale Aenderungen zuerst gesondert sichern: ' + ($feedbackUnexpected -join ', '))
        }
        $feedbackMissing = @($feedbackFiles | Where-Object { -not (Test-Path -LiteralPath $_) })
        if ($feedbackMissing.Count -gt 0) { throw ('Release-Dateien fehlen: ' + ($feedbackMissing -join ', ')) }
        if ($CheckOnly) {
            Write-Host "Projekt und $($feedbackFiles.Count) Release-Dateien geprueft. Keine Git- oder Live-Aenderungen vorgenommen."
            return
        }

        $feedbackCurrentBranch = & git branch --show-current
        if ($LASTEXITCODE -ne 0) { throw 'Der aktuelle Branch konnte nicht gelesen werden.' }
        if ($feedbackCurrentBranch -eq 'main') {
            Invoke-FeedbackCommand -Command 'git' -CommandArgs @('switch', '-c', $feedbackBranch)
        } elseif ($feedbackCurrentBranch -ne $feedbackBranch) {
            throw "Bitte den Release aus main oder $feedbackBranch starten."
        }
        Invoke-FeedbackCommand -Command 'git' -CommandArgs (@('--literal-pathspecs', '-c', 'core.safecrlf=false', 'add', '--') + $feedbackFiles)
        & git diff --cached --quiet
        $feedbackStagedExit = $LASTEXITCODE
        if ($feedbackStagedExit -eq 1) {
            Invoke-FeedbackCommand -Command 'git' -CommandArgs @('commit', '-m', 'Improve event dashboard, templates, task statuses and project assignment')
        } elseif ($feedbackStagedExit -ne 0) { throw 'Der Git-Index konnte nicht geprueft werden.' }
        Invoke-FeedbackCommand -Command 'git' -CommandArgs @('fetch', 'origin', 'main')
        Invoke-FeedbackCommand -Command 'git' -CommandArgs @('rebase', 'origin/main')
        if (-not (Test-Path -LiteralPath 'node_modules/prisma/build/index.js')) {
            Invoke-FeedbackCommand -Command 'npm.cmd' -CommandArgs @('ci')
        }
        Invoke-FeedbackCommand -Command 'npm.cmd' -CommandArgs @('run', 'db:generate')
        Invoke-FeedbackCommand -Command 'npm.cmd' -CommandArgs @('run', 'quality')
        Invoke-FeedbackCommand -Command 'git' -CommandArgs @('push', '-u', 'origin', $feedbackBranch)
        Write-Host "Branch veroeffentlicht: $feedbackBranch"
        Write-Host "Pull Request: https://github.com/johannesripken81/DiWiSH-Event-Tool/compare/main...${feedbackBranch}?expand=1"
        Write-Host 'Als Naechstes: Preview-Migration, Vorschau pruefen, Production-Migration, dann Pull Request mergen.'
    } else {
        $feedbackEnvironment = if ($Step -eq 'MigrateProduction') { 'production' } else { 'preview' }
        if ($CheckOnly) {
            Write-Host "Vercel-Projekt geprueft. Geplanter Migrationsschritt: $feedbackEnvironment. Keine Datenbankverbindung hergestellt."
            return
        }
        $feedbackEnvArgs = @('vercel', 'env', 'run', '--environment', $feedbackEnvironment, '--scope', $feedbackScope)
        if ($feedbackEnvironment -eq 'preview') { $feedbackEnvArgs += @('--git-branch', $feedbackBranch) }
        $feedbackEnvArgs += @('--', 'node', 'scripts/migrate-feedback-release.mjs', $feedbackEnvironment)
        Invoke-FeedbackCommand -Command 'npx.cmd' -CommandArgs $feedbackEnvArgs
    }
} finally {
    Pop-Location
}
