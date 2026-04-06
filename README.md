# Zeiterfassung - KITA Mitte

Webbasierte Arbeitszeiterfassung fuer KITA-Mitarbeiter. Ersetzt die bestehende Excel-basierte Erfassung durch eine moderne, mehrbenutzerfaehige Webapp fuer das lokale Netzwerk.

## Features

- **Wochenansicht** mit Inline-Editing (nah am Excel-Workflow)
- **Tagesdetailansicht** fuer komplexe Eintraege mit beliebig vielen Zeitbloecken
- **Monatsansicht** mit Wochensummen, KPIs und Einreichungsfunktion
- **Monatliche Genehmigung** durch Admin mit kompakter Detailansicht
- **Automatische Berechnung** von IST/SOLL/Delta und Ueberstundenkonto
- **Tageskennzeichnungen**: Urlaub, Krankheit, Feiertag, Ueberstundenabbau
- **Benutzerverwaltung** mit Rollen (User/Admin), Ein-/Austrittsdatum
- **Feiertagsverwaltung**
- **Datenschutzfreundlich**: Laeuft komplett lokal im LAN, keine Cloud

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Framework | Next.js 15 (App Router) |
| Sprache | TypeScript |
| Datenbank | SQLite (via Prisma ORM) |
| Auth | NextAuth.js (Credentials) |
| UI | shadcn/ui + Tailwind CSS |
| Tests | Vitest (Unit/Integration) + Playwright (E2E) |
| Deployment | Docker |

## Schnellstart (Entwicklung)

```bash
# Dependencies installieren
npm install

# Datenbank initialisieren + Seed
npx prisma db push
npx tsx prisma/seed.ts

# Entwicklungsserver starten
npm run dev
```

Oeffne http://localhost:3000. Login-Daten (Seed):
- **Admin:** admin / admin123
- **User:** inge / user123
- **User:** petra / user123

## Tests

```bash
# Unit + Integration Tests
npm test

# E2E Tests (startet automatisch einen Dev-Server)
npm run test:e2e

# E2E Tests mit UI
npm run test:e2e:ui
```

## Docker (Produktion)

### Mit docker compose (empfohlen)

```bash
# .env Datei anlegen
cp .env.example .env
# AUTH_SECRET aendern! Mindestens 32 Zeichen.

# Bauen und starten
docker compose up -d

# Logs pruefen
docker compose logs -f
```

Die SQLite-Datenbank wird in einem Docker-Volume gespeichert und ueberlebt Container-Neustarts und -Updates.

### Mit Bind-Mount (Daten auf dem Host)

```yaml
# In docker-compose.yml die volumes-Sektion aendern:
volumes:
  - ./data:/app/data   # Daten liegen direkt im Projektordner
```

### Backup

```bash
# Variante 1: Backup-Script
./scripts/backup.sh

# Variante 2: Direkt aus dem Container
docker cp $(docker compose ps -q app):/app/data/app.db ./backup-$(date +%F).db
```

### Update

```bash
docker compose down
docker compose build
docker compose up -d
```

Die Datenbank wird beim ersten Start automatisch initialisiert. Bestehende Daten bleiben bei Updates erhalten.

## Projektstruktur

```
src/
  app/              # Next.js App Router Seiten
    (app)/          # Geschuetzter Bereich (mit Sidebar)
      dashboard/    # User-Dashboard
      time-entry/   # Wochenansicht
      monthly/      # Monatsansicht
      admin/        # Admin-Bereich
      profile/      # Profilseite
    login/          # Login-Seite
    api/            # API-Routes
  actions/          # Server Actions (CRUD)
  components/       # React-Komponenten
    ui/             # Basis-UI-Komponenten
    layout/         # App-Shell, Navigation
    time-entry/     # Wochenansicht-Komponenten
    monthly/        # Monatsansicht-Komponenten
  lib/              # Shared Libraries
    auth.ts         # NextAuth Konfiguration
    calculations.ts # IST/SOLL/Delta Berechnungen
    prisma.ts       # Prisma Client
    validations.ts  # Zod Schemas
    utils.ts        # Hilfsfunktionen
  types/            # TypeScript-Typen
prisma/
  schema.prisma     # Datenmodell
  seed.ts           # Testdaten
tests/
  unit/             # Unit Tests (Vitest)
  integration/      # Integration Tests (Vitest + Prisma)
  e2e/              # E2E Tests (Playwright)
```

## CI/CD

- **CI Pipeline** (`.github/workflows/ci.yml`): Lint, Typecheck, Unit Tests, E2E Tests, Docker Build + Smoke Test
- **Release Please** (`.github/workflows/release-please.yml`): Automatische Releases und Changelog via Conventional Commits

### Conventional Commits

Commit-Messages folgen dem [Conventional Commits](https://www.conventionalcommits.org/) Format:

```
feat: Wochenansicht mit Inline-Editing
fix: Logout-Fehler bei Session-Ablauf
chore: Dependencies aktualisieren
```

## Berechnungslogik

| Tageskennzeichnung | IST | SOLL | Delta |
|-------------------|-----|------|-------|
| Normal (keine) | Summe Arbeitsbloecke - Pausen | Lt. Arbeitszeitmodell | IST - SOLL |
| Urlaub | = SOLL | Lt. Modell | 0 |
| Krankheit | = SOLL | Lt. Modell | 0 |
| Feiertag | = SOLL | 0 | 0 |
| Ueberstundenabbau | 0 | Lt. Modell | -SOLL |

**Ueberstundenkonto** = Initialer Uebertrag + Summe aller monatlichen Differenzen

## Lizenz

ISC
