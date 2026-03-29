# CLAUDE.md

## Project

Static component boilerplate — Vite + Handlebars + Tailwind. Components are reference implementations meant to be ported to frameworks or Web Components. Types serve as machine-readable contracts, not build-time enforcement.

## Tech Stack

- **Bundler:** Vite (handles TS transpilation; `tsc` is type-check only)
- **Templates:** Handlebars via `vite-plugin-handlebars`
- **Styling:** Tailwind v4 + PostCSS nesting
- **Unit tests:** Vitest + jsdom
- **E2E tests:** Playwright + axe-playwright
- **TypeScript:** DateField only (`strict: true`, `noEmit: true`). Other components are `.js` — convert in separate sessions.

## Commands

```bash
npm run dev          # dev server
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Playwright e2e tests
npm run typecheck    # tsc --noEmit (TypeScript files only)
```

## Structure

```
src/partials/components/<Name>/   # component source + CSS
src/js/script.js                  # entry point, imports all components
tests/<Name>.unit.test.*          # unit tests
tests/<Name>.e2e.test.*           # e2e tests
docs/superpowers/specs/           # design specs
docs/superpowers/plans/           # implementation plans
```

## Workflow Preferences

- **New features / design decisions:** subagent-driven development + full spec + quality review
- **Mechanical tasks (migrations, renames, type annotations):** inline execution, skip brainstorming
- **TypeScript migrations:** one component per session; no logic changes

## Constraints

- No framework code — vanilla JS/TS only
- No build-time type checking — Vite transpiles, `tsc --noEmit` validates
- No logic changes during TypeScript migrations
- E2E tests stay `.js` (Playwright has its own type setup)
