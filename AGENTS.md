# AGENTS.md

## Stack & Conventions

- **Framework**: SvelteKit 3 + Svelte 5 + TypeScript + Vite 8 (`@sveltejs/adapter-static`, `prerender = true`).
- **Libraries**: `@lucide/svelte` for icons; `d3`, `topojson-client`, and `world-atlas` for globe/data visualizations.
- **Config**: SvelteKit is configured inline inside `vite.config.ts` (there is no `svelte.config.js`).
- **Svelte 5 Runes**: `runes: true` is enforced across the project. Use `$props()`, `$state()`, `$derived()`, `$effect()`, and `{@render ...}`—never legacy `export let`, `$:`, or `<slot>`.
- **Imports**: Use Node subpath imports `#lib` and `#lib/*` (mapped to `./src/lib/*`), not `$lib/*`.
- **Styling**: Scoped component `<style>` blocks and CSS variables in `src/app.css` (no Tailwind).
- **Formatting**: Tabs, single quotes, no trailing commas, `printWidth: 100`.

## Verification (Required Before Finalizing Code Changes)

Always run and pass these checks before completing a task that modifies code:

1. `npm run format` (or `npm run format:check`)
2. `npm run lint`
3. `npm run check`

## Git Policy

- Do **not** create branches, stage files, commit, push, or open a PR unless the user explicitly requests that action in the current task.
