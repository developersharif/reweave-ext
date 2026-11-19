# Decision Log

Format: each decision has an ID, status, date, the decision, why, and what would make us revisit it. **Append new decisions; don't rewrite history** — supersede instead (`Status: Superseded by D-0xx`).

Status values: `Accepted`, `Proposed` (needs founder confirmation), `Superseded`.

---

### D-001 — Positioning: "maintained redesigns", not "restyle anything"
- **Status:** Accepted · 2026-11-19
- **Decision:** The product's core promise is *redesigns for the few sites you live on that keep working when those sites change*. Compatibility tracking + a platform-maintained site adapter layer is the moat.
- **Why:** Basic userstyles are a free commodity (Stylus: 1M CWS users, URL rules, `@var` settings, auto-update). Stylebot v4 (Oct–Nov 2026) shipped a gallery, profiles and "selectors that keep working". Nobody shows whether a template works *today*. See `docs/research/competitor-analysis.md` §0, §6 (Gap 1).
- **Revisit if:** Stylebot or Tweeks ship credible compatibility tracking before our beta.

### D-002 — Templates are declarative (CSS + JSON). No creator JavaScript.
- **Status:** Accepted · 2026-11-19
- **Why:** CWS allows remote CSS/JSON but bans remote code and "interpreters for complex commands fetched as data". JS needs `chrome.userScripts` + a per-extension toggle that's off by default (Chrome 138+). CSS-only avoids that friction and most of the security review cost. Sources in competitor-analysis §3.2.
- **Revisit if:** creators consistently hit CSS limits that a *tiny* declarative DOM vocabulary would solve — and only after a policy review.

### D-003 — Site Adapter layer between templates and site DOM
- **Status:** Accepted · 2026-11-19
- **Decision:** Platform-maintained, versioned, open-source adapters map routes and semantic components (`:--video-card`) to current selectors. Templates compile against the installed adapter on-device. Spec: `docs/architecture/template-schema.md` §11.
- **Why:** One adapter fix repairs every template using that component. Precedent: News Feed Eradicator split selectors into a separately versioned list on 2026-11-13; Stylish's "Shopping Selectors" layer (competitor-analysis §6, §9).

### D-004 — Launch sites: YouTube first, then Reddit and X. No Facebook/Instagram/LinkedIn at launch.
- **Status:** Accepted · 2026-11-19 (changes the original proposal of Facebook + YouTube)
- **Why:** YouTube uses stable custom elements (`ytd-*`) and has the largest declutter demand (1M-user extensions). Reddit and X show strong demand. Meta's ToS bans changing Facebook's "appearance" and Meta acted against Facebook extensions in 2012, 2013 and 2021; Facebook/Instagram use obfuscated atomic class names. LinkedIn: weak demand, actively probes for extensions. Source: competitor-analysis §8, §10.
- **Revisit if:** demand data from the beta's "request this site" votes strongly favors another site.

### D-005 — Chrome first, built with WXT; keep Firefox build compiling
- **Status:** Accepted · 2026-11-19
- **Why:** Chrome has the users. WXT gives cross-browser builds nearly for free, so we keep `wxt build -b firefox` green in CI from day one and ship Firefox after the Chrome beta. Safari later (needs an App Store app + Apple account).
- **Caveat:** The WXT version/maturity check was part of the interrupted technical research. **T-0.2 verifies** current WXT version and docs via Context7 before scaffolding.

### D-006 — Local-first extension; backend deferred until the extension beta is validated
- **Status:** Accepted · 2026-11-19
- **Decision:** M0–M6 ship a fully useful extension with bundled adapters and curated templates, local import/export, no accounts, no server. Backend starts at M7.
- **Why:** Validates the riskiest assumption (do people keep a redesign installed?) at near-zero infra and compliance cost.

### D-007 — UI: React + TypeScript for extension pages; content script is framework-free TS
- **Status:** Accepted · 2026-11-19 (founder confirmed React)
- **Why:** Popup/options/creator panel are modest UIs; React has the largest ecosystem and the most reliable AI-assisted coding output, and can be shared with a future React Router web app. The content script must stay tiny and never load a framework.
- **Revisit if:** founder is materially faster in Vue.

### D-008 — Backend on Cloudflare (Workers + R2 first; D1 when accounts/ratings arrive)
- **Status:** Accepted · 2026-11-19
- **Why:** Cache-first architecture costs ≈ $5/mo up to ~100k WAU (business-model.md §7). Static signed catalog needs only R2 + a Worker. D1 added in M9 for accounts, ratings, install aggregates. Queues only if moderation/screenshot pipelines need it.

### D-009 — Business model: free core; supporter payment + Pro later; no paid templates for 12–18 months
- **Status:** Accepted · 2026-11-19
- **Why:** CSS is plaintext and stores ban obfuscation, so paid templates leak; marketplace sellers make us liable for tax/payout compliance; small-ticket card fees eat 15–27%. Comparable products are free/donation-based. Pro target: $3.99/mo or $29/yr (sync, private templates, advanced editor, per-site profiles). See business-model.md §0, §9.
- **Revisit if:** compatibility guarantees exist and creators demand paid distribution.

### D-010 — Working brand "Reweave"; code name `reskin`
- **Status:** Proposed · 2026-11-19. The founder named the repo `reweave-ext`, so Reweave is used as the working brand. Trademark/conflict clearance is still incomplete (naming-research.md)
- **Decision:** User-facing strings use the working brand, defined in **one** place (`packages/brand`). Code identifiers, package scope (`@reskin/*`) and internal CSS prefix never contain the brand, so a rename touches one package and the store listing.
- **Revisit:** before the CWS public listing (T-6.6 name clearance).

### D-011 — Permissions: per-site optional host permissions; never `<all_urls>`
- **Status:** Accepted · 2026-11-19
- **Decision:** `permissions: ["storage", "scripting"]`; supported hosts declared under `optional_host_permissions` and requested at the moment the user enables a site. Adding a site = extension update.
- **Why:** Narrowest-permission policy, faster review, trust positioning vs. Stylish/Tweeks.

### D-012 — Internal CSS namespace prefix `rk`
- **Status:** Accepted · 2026-11-19
- **Decision:** Compiled CSS uses `--rk-<token>` and `--rk-s-<setting>` custom properties. Creators never write the prefix (the authoring dialect compiles to it). No `data-rk-*` attributes are written to pages (see D-021).

### D-013 — One active template per site (+ one optional palette)
- **Status:** Accepted · 2026-11-19
- **Why:** Avoids cascade conflicts, makes breakage attributable, simplifies UI.

### D-014 — No network from template CSS
- **Status:** Accepted · 2026-11-19
- **Decision:** Only `asset(<id>)` references to bundled files. No `@import`, no external `url()`.
- **Why:** Kills CSS exfiltration/beacon attacks by construction. A local experiment during research (scratchpad CSP test) observed extension-injected CSS (manifest CSS, content-script `<style>`, adopted sheets) issuing external `url()` requests — so we cannot rely on page CSP to block them.

### D-015 — Interoperate with UserCSS (Stylus format)
- **Status:** Accepted · 2026-11-19 (implementation in M5)
- **Decision:** Import UserCSS (`@-moz-document`, `@var`, `@version`) as a *local, raw-selector* template; export our templates as UserCSS (compiled against current adapter) for portability.
- **Why:** Taps existing Stylus/USw/Catppuccin supply; competitor-analysis §10.1.

### D-016 — Open-source extension client and adapters (MIT); backend private initially
- **Status:** Accepted · 2026-11-19. The repo is public at github.com/developersharif/reweave-ext with an MIT `LICENSE`. The founder can change the license before the first release
- **Why:** Trust positioning ("we don't collect your browsing data — read the code"), community adapter fixes via PR. Backend can open later.

### D-017 — Telemetry: none by default
- **Status:** Accepted · 2026-11-19
- **Decision:** No analytics in the extension by default. Opt-in only: aggregate adapter-probe health (adapter id/version, component id, pass/fail, extension version, day bucket). Never URLs, titles, page content, or user identifiers. Install counts come from catalog downloads (server-side, anonymous).

### D-018 — Monorepo with pnpm workspaces
- **Status:** Accepted · 2026-11-19
- **Layout:** `apps/extension`, `apps/web` (M7), `apps/api` (M7), `packages/schema`, `packages/compiler`, `packages/adapters`, `packages/templates` (curated, bundled), `packages/brand`, `packages/test-fixtures`.

### D-019 — MVP publishing = GitHub pull requests (no publishing backend yet)
- **Status:** Accepted · 2026-11-19 (applies to M7)
- **Decision:** Community templates are submitted as PRs to a public `templates` repo. CI runs the same validator/compiler, a maintainer reviews, merge triggers CI to build, sign, and upload bundles + a signed index to R2. The marketplace site is generated statically from the same repo.
- **Why:** Proven cold-start model (Obsidian community themes, Catppuccin), zero auth/moderation UI to build, transparent review. A web publishing UI comes in M9+ once creator demand is proven.

### D-020 — Testing approach
- **Status:** Accepted · 2026-11-19
- **Decision:** Vitest for schema/compiler/runtime units; Playwright with a persistent Chromium context loading the unpacked extension for e2e against **local DOM fixtures** (saved, sanitized snapshots of target pages). Live-site canaries run separately on a schedule (M8) and never gate PRs.

### D-021 — Route groups as separate adopted stylesheets; settings compiled in
- **Status:** Accepted for the compiler output · 2026-11-19 (T-1.6). The injection half is still validated in T-2.1.
- **Output contract (T-1.6):** `{ engineVersion, templateId, templateVersion, adapterId, adapterVersion, hash, groups: [{ routes, css }], sensitiveRoutes, routeTable, rawSelectors, components, assets }`. `groups[0]` covers all target routes and starts with the generated `:root` rule; other groups follow in manifest order; hide rules are appended to their route's group. `hash` is a fast cache key (cyrb53), not an integrity check.
- **Decision:** Each route-scoped style group compiles to its own `CSSStyleSheet` in `document.adoptedStyleSheets`; navigation toggles `sheet.disabled`. Settings and tokens are compiled into the CSS (blocks included/excluded; values as `:root` custom properties), so the page's DOM is never annotated.
- **Why:** No selector rewriting for routes, no attributes the page can strip, no DOM markers for fingerprinting, O(1) work on navigation.
- **Revisit if:** adopted sheets prove unreliable on a target site (fallback: `<style>` kept last; extension-architecture §3.2).

### D-022 — Pin TypeScript 6.0.x (not 7.x)
- **Status:** Accepted · 2026-11-19
- **Decision:** `typescript@~6.0.3` workspace-wide.
- **Why:** `typescript@7.0.2` (npm `latest`) is the native compiler. Its package exports only a version stub plus `unstable/*` APIs, while WXT and other tools still expect the classic JS compiler API (`peerDependencies: typescript >=5.4`).
- **Revisit when:** WXT and Vitest document TypeScript 7 support.

### D-023 — Biome for lint + format
- **Status:** Accepted · 2026-11-19
- **Why:** a single fast tool with no TypeScript compiler-API dependency, covering lint, format and import sorting. Config is in `biome.json`; run `pnpm format` to auto-fix.

### D-024 — Built-manifest guard in CI
- **Status:** Accepted · 2026-11-19
- **Decision:** `scripts/check-manifest.mjs` fails `pnpm check` if a production manifest has a permission other than `storage`/`scripting`, an unlisted optional host, `host_permissions`, `web_accessible_resources`, `externally_connectable`, static `content_scripts`, or a custom CSP.
- **Why:** it enforces AGENTS.md non-negotiables 5 and 7 mechanically. It was negative-tested against a deliberately bad manifest.
- **Changing it:** extend the allowlists in the same PR as the decision that requires it, e.g. adding Reddit/X hosts in M4 or `activeTab` in M5.

### D-025 — Valibot for schemas
- **Status:** Accepted · 2026-11-19 (T-1.1)
- **Decision:** `valibot@1.5.0` in `packages/schema`; `@valibot/to-json-schema@1.8.0` generates the editor JSON Schemas.
- **Why:** for the same manifest schema, 2.5 KB gzip vs 7.6 KB (Zod Mini) and 92.7 KB (Zod 4) (technical-research §9). The schema ships in the service worker and later in the content-script boundary checks, so size matters more than ecosystem.
- **Revisit if:** Valibot's JSON Schema output blocks editor features we need.

### D-026 — Authoring dialect syntax v1
- **Status:** Accepted · 2026-11-19 (T-1.2)
- **Decision:** keep `:--component` (no `:component()` fallback). Tokens are written `token(group-name)` in CSS (dotted names stay in JSON). `@setting id`, `@setting !id`, `@setting id = value` are the only preludes. No CSS nesting in v1. No components inside `@scope` preludes in v1.
- **Why:** css-tree 3.2.1 parses `:--name` everywhere, but rejects dots inside function arguments and doesn't support nesting (technical-research §9). A hyphenated token mirrors the compiled `var(--rk-group-name)`.
- **Revisit:** nesting when css-tree supports it (T-5.9).

### D-027 — `.ts` extensions in relative imports; Node runs TypeScript directly
- **Status:** Accepted · 2026-11-19
- **Decision:** `tsconfig.base.json` sets `allowImportingTsExtensions` and `erasableSyntaxOnly`. Packages import relatives with `.ts` extensions, so Node ≥ 22.18/24 runs the CLI (`packages/compiler/bin/reskin.js`) and scripts with built-in type stripping. No build step, no `tsx` dependency.
- **Constraints:** no `enum`, `namespace` or parameter properties (TypeScript syntax that isn't erasable). Node prints an `ExperimentalWarning`; scripts pass `--disable-warning=ExperimentalWarning`.

### D-028 — Protected components can't be styled at all
- **Status:** Accepted · 2026-11-19 (T-1.4)
- **Decision:** any selector that uses a protected component (`:--consent-dialog`, `:--consent-dialog button`), or a raw selector naming one of its elements/ids/classes, is an error (`PROTECTED_COMPONENT_STYLED`). `hide` rules on protected components are errors (`PROTECTED_COMPONENT_HIDDEN`).
- **Why:** stricter than the original list of hiding techniques in security-model T2, and simpler: there's no property list to keep up to date. Ancestor hiding and overlays need a runtime guard (T-2.9).

