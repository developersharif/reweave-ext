# AGENTS.md: Working Rules for Coding Sessions

This repo is built across many sessions, by Claude Code and other agents. These rules keep them consistent. **Read this file, then [`docs/execution/session-handover.md`](docs/execution/session-handover.md), then the task you're picking up in [`docs/execution/task-tracker.md`](docs/execution/task-tracker.md).**

## 1. What we're building

A Chrome MV3 extension that applies community-made **templates** to supported sites (YouTube → Reddit → X). Templates are declarative CSS plus JSON, written against platform-maintained **site adapters** and compiled on the device. Later phases add a GitHub-PR-based community catalog and a Cloudflare backend.

- Product context: `docs/product/`.
- Architecture: `docs/architecture/`.
- Formats: `docs/architecture/template-schema.md`.

**Names:**
- The working brand is "Reweave", and it lives **only** in `packages/brand`.
- The code name `reskin` is used for package scope (`@reskin/*`), the CLI and identifiers.
- The internal CSS prefix is `rk`.

## 2. Non-negotiables

Break one only with a new Accepted entry in `docs/execution/decisions.md`.

1. **No remote code.** The extension never fetches or evaluates JS or Wasm. Only signed JSON, CSS and assets cross the network. Don't add `eval`, `new Function`, or a DOM-operation interpreter (D-002; CWS policy, technical-research F1–F2).
2. **No creator JavaScript** in templates, in any form (D-002).
3. **No network from template CSS:** no `@import` and no external `url()`. Assets only via `asset()` (D-014).
4. **Sanitize twice:** the compiler's sanitizer runs in CI/server *and* in the extension before install/compile (security-model §3).
5. **Permissions:** `storage` and `scripting` only, plus per-site `optional_host_permissions`. Never `<all_urls>`, `tabs`, `webNavigation`, `history` or `cookies`. `activeTab` (M5) and `alarms` (M7) only when their milestone needs them (D-011).
6. **No telemetry by default.** Never send URLs, titles, page content or user identifiers (D-017).
7. **Expose no `web_accessible_resources` and leave no DOM markers** on pages (security-model T8).
8. **Content script stays tiny:** no framework, no compiler, ≤ 25 KB minified (NFR-01).
9. **Never apply templates on adapter `sensitive` routes**, and never let templates hide `protected` components.
10. **No Facebook, Instagram or LinkedIn adapters** at launch (D-004).

## 3. How to work

1. Pick the first `todo` task whose dependencies are `done`. Mark it `in-progress (date)`.
2. **Spike tasks (🔬)** produce written findings (with source URLs or measurements) in the named doc *before* dependent code is written.
3. **Library and API docs:** use Context7 for WXT, React, Chrome extension APIs, Cloudflare, css-tree, CodeMirror, Playwright, Vitest (`resolve-library-id` → `query-docs`). Don't rely on memory for APIs that change.
4. Keep changes scoped to the task. If you discover new work, add a task to the tracker rather than expanding scope.
5. When you finish:
   - mark the task `done`;
   - add a row to the handover session log;
   - update "Next action";
   - record any decision in `decisions.md`;
   - update any doc your change made inaccurate, in the same change.

## 4. Conventions

- **TypeScript:** strict mode with `noUncheckedIndexedAccess`. No `any` (use `unknown` and narrow). Prefer named exports, small modules, and pure functions in the engine.
- **Boundaries:**
  - `packages/schema` and `packages/compiler` must not use DOM or `chrome.*` APIs; they must run in Node, the service worker and CI.
  - Browser APIs stay in `apps/extension`.
- **Errors:** validation and compile problems are `{ code, path, message, severity }` with stable `UPPER_SNAKE` codes. Tests assert codes, not messages.
- **Messages and storage:** every runtime message and storage value has a schema in `packages/schema` and is validated at the boundary.
- **Tests:**
  - Vitest next to the code (`*.test.ts`), never inside `src/entrypoints/`.
  - Golden files for compiler output.
  - Attack fixtures for the sanitizer.
  - Adapter tests run against `packages/test-fixtures`.
  - E2E uses Playwright with request interception against fixtures. **CI never hits live sites.**
- **Fixtures:** structure-only snapshots. Strip scripts, text, images and anything personal.
- **Dependencies:** justify each new runtime dependency in the PR or commit message. Prefer zero-dependency code for the content script. Pin versions.
- **Git:**
  - one branch per task (`t-2.6-content-sheets`);
  - Conventional Commits (`feat(compiler): …`);
  - commit only when the user asks.

## 5. Definition of done

- [ ] The acceptance criteria in the tracker are met.
- [ ] `pnpm check` passes (typecheck, lint, test, build for Chrome **and** Firefox).
- [ ] New logic has tests. Sanitizer or security-relevant changes add or extend attack fixtures.
- [ ] No non-negotiable is violated. Permissions in the built manifest are unchanged unless the task says otherwise.
- [ ] Docs, tracker and handover are updated.

## 6. Commands

Requirements: Node ≥ 22 (`.nvmrc` pins 24) and pnpm 12 (`packageManager` field).

| Command | What it does |
|---|---|
| `pnpm install` | Installs the workspace. Also runs `wxt prepare`, which generates `apps/extension/.wxt/` types |
| `pnpm dev` | WXT dev mode for Chrome with auto-reload. Dev builds add `tabs`/`scripting`; that's expected |
| `pnpm --filter @reskin/extension dev:firefox` | Firefox dev mode |
| `pnpm check` | **Run before every commit.** typecheck → Biome lint → unit tests → Chrome + Firefox builds → `check:manifest` guard → `check:size` bundle budgets → JSON Schema freshness |
| `pnpm test` | Vitest in every package (extension tests use `WxtVitest` + `fakeBrowser`). Adapter tests run selectors in Playwright's Chromium (D-030): the first time, run `pnpm --filter @reskin/extension exec playwright install chromium` |
| `pnpm test:e2e` | Builds the `RK_E2E` extension (`.output/chrome-mv3-e2e`, site access pre-granted, D-029), then runs Playwright against fixture-backed youtube.com. No live network |
| `pnpm format` | Biome auto-fix (format + organize imports) |
| `pnpm --filter @reskin/extension zip` | Store-ready zips in `apps/extension/.output/` |
| `pnpm reskin validate <dir> [--adapter <adapter.json>]` | Validate a template directory (manifest, files, CSS sanitizer, dialect). Add `--json` for machine output |
| `pnpm reskin compile <dir> --adapter <file> [--set id=value] [--variant id] [--palette file]` | Print the compiled output for one adapter |
| `pnpm --filter @reskin/schema gen:json-schema` | Regenerate `packages/schema/json/*.v1.json` after changing a schema |
| `pnpm --filter @reskin/compiler exec vitest run -u` | Rewrite compiler golden files. Review the diff before committing |
| `node apps/extension/scripts/live-check-youtube.mjs [--profile <dir>]` | **Manual, live site.** Counts adapter component matches on real YouTube pages; `--profile` opens a headed, signed-in profile. Never in CI |
| `node apps/extension/scripts/capture-youtube-fixtures.mjs` | **Manual, live site.** Re-captures the structure-only YouTube fixtures. Review the diff; adapter tests must still pass |
| `cd apps/extension && pnpm build:e2e && node spikes/live-youtube/smoke.mjs` | **Manual, live site.** The real extension on live YouTube: apply, SPA navigation, live settings, "Original site" |
| `pnpm --filter @reskin/templates exec vitest run -u` | Rewrite the bundled templates' golden files. Review the diff before committing |
| `node apps/extension/scripts/map-youtube-theme.mjs [--write] [--preview <png>]` | **Manual, live site.** Regenerates the YouTube adapter's `theme` map (D-033). Run it when health reports "Colours may not apply"; `--write` updates `adapter.json` (bump its version) |
| `cd apps/extension && pnpm build:e2e && node scripts/capture-previews.mjs [--dark]` | **Manual, live site.** Re-captures the bundled templates' blurred previews (`packages/templates/*/previews/*.jpg`). Look at every image before committing |

## 7. Layout notes (M0–M3)

- `apps/extension/src/entrypoints/` contains **only** WXT entrypoints. Any file there, including tests, is treated as an entrypoint. Keep entrypoints thin: put logic in `src/<area>/` modules with tests beside them.
- `apps/extension/e2e/` has its own tsconfig with Node types. Extension source must not see Node types.
- Workspace packages export TypeScript source directly (`"exports": { ".": "./src/index.ts" }`). There is no package build step; Vite, Vitest and tsc consume the source.
- TypeScript is pinned to 6.0.x (D-022). Don't bump it to 7.x.
- Relative imports in `packages/` use `.ts` extensions (D-027), so Node runs the CLI and scripts without a build. No `enum`, `namespace` or parameter properties.
- `packages/compiler/test/` and `cli/` have their own Node-typed tsconfigs. `src/` stays free of Node, DOM and `chrome.*` types. Vitest returns empty strings for `?raw` CSS imports, so fixture-driven tests read files with `node:fs` from `test/`.
- Biome must not touch template-dialect CSS, fixtures or golden files (`biome.json` excludes `packages/**/*.css`, `packages/test-fixtures/**`, golden dirs and `packages/schema/json/**`). Formatting them would break golden comparisons.
- New sanitizer rules start as an attack fixture in `packages/compiler/test/attacks/` with a `/* expect: CODE */` header.
- Diagnostic codes live in `packages/schema/src/diagnostics.ts`. Add new codes there; never rename one that shipped.
- The content script imports only `@reskin/schema/routes` and `@reskin/schema/runtime` (subpaths), never the package root, and never `@reskin/compiler`. `check:size` fails the build if React or the compiler ends up in it.
- Supported sites live in `apps/extension/src/shared/sites.ts`. The manifest's `optional_host_permissions` are generated from it; adding a site means adding an adapter in `packages/adapters` and an entry there.
- Background state changes go through `exclusive()` (`src/background/exclusive.ts`) so storage and content-script registrations are never changed by two handlers at once.
- `permissions` and `scripting` aren't implemented by WXT's fake browser: mock them with `vi.spyOn` in tests (see `src/background/testing.ts`).
- Fixtures under `packages/test-fixtures/` are captured from live pages by script and must stay structure-only; a test enforces it.
- Health and the theme map (D-033, D-036): the adapter's `theme` block is generated by `map-youtube-theme.mjs`, not edited by hand. Token-aware templates (`tokens.consumes: "standard/v1"`) must not paint the site's backgrounds or text themselves; a test in `packages/templates` enforces it for the bundled ones.
- Extension pages (popup, options, welcome) share `src/ui/tokens.css`. Preview images come from `@reskin/templates/previews` (Vite `?url` imports), which only extension pages import. Never import it from the background or the content script.
- Imported templates (`rk:installed`, D-034) are re-validated whenever the registry loads. Background code gets the registry from `currentRegistry()` and calls `invalidateRegistry()` after changing `rk:installed`.
- `storage.sync` (D-035) mirrors `rk:sites` (without `enabled`) and `rk:settings:*`. New keys that should follow the user belong in `isMirrored()` in `src/background/sync.ts`, and must fit the 8 KB per-item limit.
- Background tests share `resetBrowser()` from `src/background/testing.ts` (fake browser reset, `permissions`/`scripting` mocks, registry cache reset).
