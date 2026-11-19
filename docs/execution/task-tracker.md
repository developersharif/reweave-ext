# Task Tracker

**How to use:** pick the first task whose status is `todo` and whose dependencies are `done`. Set it to `in-progress` with your session date, do it, set `done`, and update `session-handover.md`. Tasks are sized to fit one session (≤ ~1 day). If a task grows, split it here before continuing.

Status: `todo` · `in-progress (YYYY-MM-DD)` · `done` · `blocked (reason)` · `dropped (reason)`
Size: S (≤ 2 h) · M (half day) · L (1 day)

Spike tasks (🔬) produce a **written result** in the named doc before dependent code is written.

---

## M0 — Foundations

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-0.1 | `git init`; pnpm workspace (`apps/*`, `packages/*`); root `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`); lint/format (Biome or ESLint+Prettier — pick one, record in decisions); `.nvmrc`/`engines`; MIT `LICENSE`; root scripts `check`, `test`, `build`, `dev` | M | — | `pnpm install && pnpm check` passes on empty packages | done (2026-11-19) |
| T-0.2 🔬 | Fetch current WXT docs via Context7; scaffold `apps/extension` (WXT + React + TS). Confirm: runtime-registered content scripts, shadow-root UI helper, i18n, `build -b firefox`, testing utilities (fake browser). Record WXT version + findings in `docs/research/technical-research.md` §4 and D-005 | M | T-0.1 | Unpacked build loads in Chrome; popup renders; Firefox zip builds; findings written | done (2026-11-19) |
| T-0.3 🔬 | Targeted Chrome-docs check (no broad research): `storage.local`/`sync` quotas; `optional_host_permissions` update behavior; `permissions.request` gesture rules; `scripting.registerContentScripts` options (`persistAcrossSessions`, `runAt`, `world`); `URLPattern` support; Navigation API availability in content scripts. Write results to technical-research.md §3 with URLs | M | — | Every item answered with a source URL, or marked "test in T-2.x" | done (2026-11-19) |
| T-0.4 | GitHub Actions CI: install (cached), typecheck, lint, test, build Chrome + Firefox, upload zips as artifacts | S | T-0.2 | CI green on main | done (2026-11-19) |
| T-0.5 | `packages/brand`: name, tagline, URLs, colors; wire into WXT `_locales` (`appName`, `appDescription`) | S | T-0.2 | Changing the brand name in one file changes the popup + manifest name | done (2026-11-19) |
| T-0.6 | Skeletons: `packages/schema`, `compiler`, `adapters`, `templates`, `test-fixtures` with Vitest + one smoke test each; path aliases | S | T-0.1 | `pnpm test` runs 5 smoke tests | done (2026-11-19) |

## M1 — Engine core

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-1.1 🔬 | Pick validation lib (Zod 4 vs Valibot) by measured SW bundle size + DX; implement Template/Adapter/Palette schemas per `template-schema.md` §3, §6, §11; error code enum; JSON Schema generation script | L | T-0.6 | Spec example valid; ≥ 20 invalid fixtures fail with expected `{code,path}`; decision recorded | done (2026-11-19) |
| T-1.2 🔬 | css-tree spike: parse + regenerate `:--name`, `token(x.y)` (became `token(x-y)`, D-026), `@setting id { }`, `@setting id = v { }`, `setting(id)`, `asset(id)`; measure bundle size; decide dialect syntax (fallback `:component(name)`) | M | T-0.6 | Round-trip tests pass; decision in decisions.md | done (2026-11-19) |
| T-1.3 | Sanitizer: allowlist walk (§4.1 at-rules/properties/values, `url()` rules, `content` length flag, selector + `:has()` limits, size limits) returning `errors[]`, `warnings[]`, `reviewFlags[]` | L | T-1.2 | All attack fixtures (T-1.3a) caught; benign corpus passes | done (2026-11-19) |
| T-1.3a | Attack fixtures `packages/compiler/test/attacks/`: attribute-selector exfil, `@import` beacon, font `unicode-range`, external `image-set`, authored `data:` URL, long `content` overlay, hidden protected component (each hiding technique), `pointer-events` decoy, deep `:has()` | M | T-0.6 | ≥ 15 fixtures, each with expected code | done (2026-11-19) |
| T-1.4 | Dialect resolver: components → `:is(<adapter selectors>)`; unknown component error; `hide` rules; protected-component checks; `rawSelectors` detection | L | T-1.1, T-1.2 | Golden-file tests for each construct | done (2026-11-19) |
| T-1.5 | Tokens + settings: resolution order (schema §6), generated `:root` block, `@setting` include/exclude, `setting()` values with clamping/validation | M | T-1.4 | Golden tests; palette override test | done (2026-11-19) |
| T-1.6 | Output format + route groups: `{ hash, groups:[{routes,css}], sensitiveRoutes, routeTable, adapterVersion }`; perf test (256 KB < 100 ms); confirm D-021 | M | T-1.4, T-1.5 | Perf test green; D-021 → Accepted or revised | done (2026-11-19) |
| T-1.7 | CLI `reskin validate <dir>` / `reskin compile <dir> --adapter <path>` (pretty diagnostics, JSON output flag) | S | T-1.6 | Works on the spec example directory | done (2026-11-19) |

## M2 — Extension runtime + YouTube

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-2.1 🔬 | Injection spike on live YouTube: `document.adoptedStyleSheets` from content script at `document_start`; FOUC measurement (normal + 4× CPU throttle); overwrite detection; `<style>` fallback comparison | M | T-0.2 | Results + numbers in technical-research.md §5; D-021 status updated | done (2026-11-19) |
| T-2.2 🔬 | Navigation spike: `currententrychange` from isolated world, `yt-navigate-finish`, `popstate`/`pageshow`, poll fallback; latency of each | S | T-0.2 | Chosen strategy documented in extension-architecture §4 | done (2026-11-19): D-031 |
| T-2.3 | YouTube adapter v1: routes (home, watch, shorts, search, channel, subscriptions, playlist; `account` sensitive), ~25 components (stable hooks only), probes, `navigationEvents`; logged-out fixtures for home/watch/search (structure-only) | L | T-1.1 | Every component matches on its fixture; probes pass; manual live check logged-in + logged-out | done (2026-11-19): 7 pages (also shorts, channel, subscriptions, playlist), 38 components (1 protected); live logged-out check passes; logged-in check in T-2.11 |
| T-2.4 🔬 | Playwright e2e harness: persistent Chromium + `--load-extension`; `context.route("https://www.youtube.com/**")` fulfilling fixtures; helper to enable a site without a permission dialog (test-only path) | M | T-0.2, T-2.3 | A test opens fixture-backed youtube.com and asserts a computed style from a test template | done (2026-11-19): `RK_E2E` build, D-029 |
| T-2.5 | Background: `registry` (bundled), `sites` (enable/disable, `registerContentScripts` per adapter, re-sync on startup), `compile-service`, typed storage + `migrations`, validated message router | L | T-1.6 | Unit tests with fake browser; e2e enable→apply works | done (2026-11-19) |
| T-2.6 | Content script: boot (storage read → sheets), route toggling, `storage.onChanged` live update, sensitive routes off, global pause | M | T-2.1, T-2.2, T-2.5 | e2e: SPA nav switches route styles; setting change applies without reload | done (2026-11-19) |
| T-2.7 | Popup v1 (React): site detection states (supported/granted, supported/not granted, unsupported, sensitive), enable (permission request), on/off, template switch incl. "Original site", settings controls generated from manifest | L | T-2.5 | Matches `user-flows.md` §3 wireframe (minus palette/report) | done (2026-11-19): site detection without `tabs`, D-032 |
| T-2.8 | Dev template "Focus YouTube" (hide Shorts, optional hide home feed, width range) | S | T-2.3 | Used by e2e tests | done (2026-11-19) |
| T-2.9 | Runtime protected-component guard: while any adapter `protected` component is present and visible (consent/security UI), disable the template's sheets; re-enable when it's gone. Catches what static checks can't (hiding an ancestor, overlays) | M | T-2.6 | e2e: fixture with the consent dialog shows the original site until the dialog closes | done (2026-11-19) |
| T-2.10 | Wire the compiler into the service worker (`compile-service`): bundle-size check that css-tree stays on subpath imports (fail CI if the SW grows > 60 KB gzip) | S | T-2.5 | Size guard in `pnpm check` | done (2026-11-19): `check:size`, also guards the content script (25 KB, no React or compiler) |
| T-2.11 | Logged-in live check of the YouTube adapter: run `apps/extension/scripts/live-check-youtube.mjs --profile <dir>` signed in to a YouTube account; fix selectors that differ from logged-out pages, and capture logged-in fixture variants if they differ structurally | S | T-2.3 | All components match on all 7 pages while signed in, or differences recorded in technical-research §5.3 | done (2026-11-19): run by the founder on a signed-in profile, every component matched on all 7 pages (home 12/12, watch 20/20, search 16/16, shorts 12/12, channel 16/16, subscriptions 11/11, playlist 13/13) |

## M3 — Templates, palettes, health, library

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-3.1 | Curated YouTube templates: Focus, Compact, Calm (token-aware) + cover and before/after previews | L | T-2.8 | Design QA in light/dark; all `Working` on fixtures + live | done (2026-11-19): Focus, Compact, Calm (`tokens.consumes: standard/v1`, D-033) with blurred cover/before/after captured from live YouTube (`scripts/capture-previews.mjs`). Health "working" on fixtures (e2e) and live, logged out, for all three; dark-mode QA from screenshots |
| T-3.2 | Palettes: Default Dark/Light + 2 community-style palettes (license verified); palette picker in popup | M | T-1.5, T-2.7 | Palette switch re-themes all 3 templates live | done (2026-11-19): `packages/palettes` (Default Dark/Light, Catppuccin Mocha, Nord; MIT licences copied from upstream). Popup "Colours" picker; palette switch re-themes live (e2e `theme.spec.ts`) through the adapter theme map (D-033) |
| T-3.3 | Probes runtime + `rk:health` + popup badge + "Looks broken?" → prefilled GitHub issue URL (ids, versions, failed probes; user reviews before submitting) | M | T-2.6 | Removing a component from a fixture flips badge; issue URL contains no page URL/content | done (2026-11-19): probes in the content script, `rk:health:<adapter>`, popup badge, "Looks broken?" issue link (D-036). e2e `health.spec.ts`: renaming the comments element flips the badge; the link holds no page URL |
| T-3.4 | Options/library page: per-site assignments, reset settings, uninstall template, export/import library JSON, import template `.zip`, global pause | L | T-2.5 | Export → clear storage → import restores state | done (2026-11-19): options page `src/options/Library.tsx`; zip reader without dependencies; `rk:installed` (D-034). e2e `options.spec.ts`: zip import → apply → export → clear storage → import restores → uninstall |
| T-3.5 | `storage.sync` mirroring for `rk:sites` + `rk:settings:*` with size guards (100 KB total, 8 KB/item), **debounced/batched writes** (limits: 120 writes/min, 1,800/h; technical-research §3), and a conflict rule (last-write-wins per key) | M | T-2.5 | Unit tests at quota edges; a slider drag produces ≤ 1 sync write per 5 s | done (2026-11-19): `src/background/sync.ts` (D-035). Unit tests at 8 KB/100 KB edges; a 20 s slider drag makes ≤ 1 sync write per 5 s |
| T-3.6 | Welcome page (extension): pick sites → permission → 3 template cards with previews → "Try it" | M | T-3.1 | Install → restyled site in ≤ 4 clicks (e2e) | done (2026-11-19): `welcome.html` opens on install (D-037). e2e `welcome.spec.ts`: install → "Try it" → restyled YouTube in 1 click (access pre-granted in the e2e build; a real install adds "Allow access" and the prompt: 3 clicks) |
| T-3.7 | Variants in popup | S | T-2.7 | Variant switch applies its settings/tokens | done (2026-11-19): popup and options "Variant" select; e2e checks Deep focus turns its settings on and Calm's Day variant swaps its colours |
| T-3.8 🔬 | Theme-map stability: re-run `map-youtube-theme.mjs` weekly for 4 weeks (or after a visible YouTube redesign) and record whether the generated `--t<hash>` names change; decide whether the map needs automatic regeneration in CI (M8) | S | T-3.1 | Findings with dates in technical-research §5.4; D-033 revisited if names churn | todo |

## M4 — Reddit + X

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-4.1 🔬 | Shadow DOM spike on Reddit: which components live in open/closed roots; per-root adopted sheets; `chrome.dom.openOrClosedShadowRoot` availability; observer cost | M | T-2.6 | Findings in technical-research.md §6 | todo |
| T-4.2 | Compiler: shadow scopes (`adapter.shadowRoots`) → per-scope sheets | M | T-4.1, T-1.6 | Golden tests | todo |
| T-4.3 | Content script shadow injector (observer only for shadow adapters) + e2e | M | T-4.2 | Fixture with shadow host styled; perf budget met | todo |
| T-4.4 | Reddit adapter + fixtures + 3 curated templates | L | T-4.3, T-3.1 | M2 acceptance flow passes on reddit.com | todo |
| T-4.5 | X adapter (`data-testid`, ARIA) + sanitized logged-in fixtures + 3 curated templates | L | T-2.6, T-3.1 | M2 acceptance flow passes on x.com | todo |

## M5 — Studio + UserCSS

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-5.1 | Studio injection (`scripting.executeScript`) + shadow-root UI shell + open/close from popup | M | T-2.7 | Studio opens/closes without page style leaks either way | todo |
| T-5.2 | Component picker (hover label nearest component; Alt = raw element + fragile warning) | M | T-5.1, T-2.3 | Picks correct component on 10 fixture elements | todo |
| T-5.3 | CodeMirror 6 editor: CSS + dialect autocomplete (components, tokens, settings), inline diagnostics from compiler | L | T-5.1, T-1.7 | Errors from attack fixtures show inline with codes | todo |
| T-5.4 | Live preview: debounced compile in Studio → preview sheet replaces active template while open | M | T-5.3 | Keystroke → visible change < 300 ms | todo |
| T-5.5 | Tokens panel (color pickers for standard tokens, palette preview) | M | T-5.4, T-3.2 | Edits reflect live | todo |
| T-5.6 | Manifest editor (JSON with schema validation), save local, export/import `.zip` | M | T-5.4 | Round-trip zip equals source | todo |
| T-5.7 | UserCSS import (metadata block, `@var` → settings, `@-moz-document` → target) as local raw-selector template; UserCSS export (compiled) | L | T-1.6 | A Catppuccin-style YouTube UserCSS imports and applies | todo |
| T-5.8 | (Stretch) `activeTab` + local raw-CSS style on unsupported sites | M | T-5.4 | Behind "Labs" flag | todo |
| T-5.9 | Revisit CSS nesting: v1 rejects nested rules because css-tree 3.2.1 can't parse them (technical-research §9). If css-tree ships nesting, allow it in the dialect and sanitizer | S | — | Decision recorded; attack fixtures still pass | todo |

## M6 — CWS beta

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-6.1 | Hardening: React error boundaries, migration tests, perf budget checks (extension-architecture §14), popup a11y (keyboard, focus, contrast) | L | M3 | Budgets met; axe check clean on popup/options | todo |
| T-6.2 | Privacy policy + terms (static pages), exactly matching security-model §4 | M | — | Reviewed against data inventory | todo |
| T-6.3 | Store listing: description (descriptive trademark use only: "for YouTube"), screenshots, promo tile, single-purpose statement, permission justifications | M | T-3.1 | Checklist in security-and-legal.md §5 satisfied | todo |
| T-6.4 | Release pipeline: version bump, changelog, signed zip artifact; unlisted submission → public | M | T-0.4 | First version approved | todo |
| T-6.5 | Feedback: GitHub Discussions (or Discord), in-extension feedback link, opt-in 3-question survey link at day 7 | S | T-2.7 | Links live | todo |
| T-6.6 | Name clearance: USPTO/EUIPO/WIPO searches for shortlisted names, conflict review, buy domain(s), reserve handles; update D-010 | M | — | D-010 Accepted (or name changed in `packages/brand`) | todo |
| T-6.7 | Landing page (static) + Pro/creator waitlist (privacy-respecting form) | M | T-6.6 | Page live; waitlist works | todo |

## M7 — Community catalog (after Gate A)

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-7.1 | Cloudflare: R2 bucket(s), Worker, domain, wrangler config, staging/prod; verify current pricing/limits | M | Gate A | `wrangler deploy` to staging works | todo |
| T-7.2 | Public `templates` repo: layout, PR template, CONTRIBUTING (creator guide), CI `reskin validate` with PR comment | L | T-1.7 | Bad PR gets annotated errors; good PR passes | todo |
| T-7.3 | Bundle + sign (Ed25519, protected env) + upload; signed catalog/adapters/revocations indexes | L | T-7.1, T-7.2 | Signature verifies with extension's pinned key | todo |
| T-7.4 | Worker API (Hono): index/bundle/asset/adapter GETs with caching; `POST /v1/installs` counter; rate limiting | M | T-7.1 | Contract tests; no PII stored | todo |
| T-7.5 | Extension update service (`alarms`), signature + rollback checks, browse/install UI, revocation handling | L | T-7.3, T-7.4 | Auto-update + revocation e2e against staging | todo |
| T-7.6 | Static marketplace site (Astro): home, `/sites/:adapter`, `/t/:owner/:slug` (before/after), `/u/:handle`, legal pages; install button via `externally_connectable` | L | T-7.3 | Install from site works end-to-end | todo |
| T-7.7 | Remote adapter updates (signed) applied without store release | M | T-7.5 | Adapter PATCH reaches extension within one cycle | todo |
| T-7.8 | Content policy, DMCA/takedown page, designated agent registration (if serving US users), repeat-infringer policy | M | — | Pages live; registration done or decision recorded | todo |

## M8 — Compatibility CI

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-8.1 | Scheduled canary (GitHub Actions or Cloudflare Browser Rendering): logged-out routes, run probes, store results, open issue on failure | L | T-7.3 | Simulated break → issue within one interval | todo |
| T-8.2 | Template status computation (schema §11.1) + badges in catalog/site/popup | M | T-8.1 | Badges change when canary fails | todo |
| T-8.3 | Public status page per adapter | S | T-8.2 | Live | todo |
| T-8.4 | Opt-in aggregate probe reports (extension → `POST /v1/reports`) | M | T-7.4 | Payload contains only allowed fields (test) | todo |
| T-8.5 | (Stretch) Automated before/after screenshots for curated templates | M | T-8.1 | Generated in CI | todo |

## M9 / M10
Break down only after Gate B. See `roadmap.md`. Known items so far:

| ID | Task | Size | Deps | Acceptance | Status |
|---|---|---|---|---|---|
| T-10.1 | AMO source submission: configure `zip.sourcesRoot` (or a custom script) so the Firefox sources zip contains the whole workspace, with build instructions | S | — | A reviewer can rebuild an identical Firefox zip from the sources zip | todo |
