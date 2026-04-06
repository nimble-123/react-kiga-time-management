# CLAUDE.md

## Projekt

KITA-Zeiterfassung Webapp -- Next.js 15 Full-Stack App mit SQLite, fuer ~8 Benutzer im LAN.

## Befehle

- `npm run dev` -- Entwicklungsserver
- `npm test` -- Unit + Integration Tests (Vitest)
- `npm run test:e2e` -- E2E Tests (Playwright, startet Dev-Server)
- `npx next build` -- Produktions-Build
- `npx prisma db push` -- Schema auf DB anwenden
- `npx tsx prisma/seed.ts` -- Testdaten laden
- `npx prisma studio` -- DB-Browser

## Architektur

- **Full-Stack Next.js** (App Router) -- kein separates Backend
- **Server Actions** in `src/actions/` fuer alle Mutationen
- **Prisma + SQLite** -- DB-File unter `prisma/data/app.db`
- **NextAuth.js** (Credentials Provider) -- Session-basiert
- Berechungslogik in `src/lib/calculations.ts` -- rein funktional, gut testbar
- Validierung via Zod in `src/lib/validations.ts`

## Konventionen

- Kein `"use client"` in Server-Komponenten -- nur wo noetig
- Server Actions geben `{ success: boolean; error?: string }` zurueck
- Zeiten als `"HH:MM"` Strings (nicht Date-Objekte)
- Deutsche UI-Texte, aber englische Code-Bezeichner
- Commit-Messages: Conventional Commits (feat/fix/chore)
- Tests: Unit-Tests fuer Berechnungslogik, Integration-Tests fuer DB-Operationen, E2E fuer User-Flows

## Wichtige Fachlogik

- Urlaub/Krank/Feiertag: IST = SOLL automatisch
- Ueberstundenabbau: IST = 0, Delta = -SOLL
- Genehmigung auf Monatsebene (nicht pro Tag)
- Ueberstundenkonto = initial_balance + Summe aller Monats-Deltas
- SOLL-Berechnung beruecksichtigt Eintritts-/Austrittsdatum
