# Phase 0 — Foundation and Live Deployment

## Objective

A strict Vite/React/TypeScript repository builds, verifies, and serves a public no-auth product shell.

## In scope

- Git/Vite scaffold
- strict TypeScript
- ESLint, Vitest, required scripts
- basic app shell and honest WebMCP status placeholder
- MIT license
- Vercel or Netlify deployment
- planning package copied into repository

## Out of scope

Basketball domain logic, court drawing, tool registration, persistence, design polish.

## Required tests

- App smoke render.
- `npm run verify` passes from clean install.

## Acceptance

- [ ] Public HTTPS URL loads in a fresh browser.
- [ ] No authentication or secret is required.
- [ ] Product label and shell are visible.
- [ ] Typecheck, lint, tests, and production build pass.
- [ ] `docs/PHASE_STATUS.md` records URL and accepted commit.

## Cut strategy

Use plain CSS and a simple placeholder. Do not spend the phase on styling.
