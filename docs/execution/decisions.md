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
- **Status:** Proposed · 2026-11-19 (founder may switch to Vue; low-cost to change before M2)
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
- **Status:** Proposed · 2026-11-19 (trademark/conflict clearance incomplete — see naming-research.md)
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
- **Status:** Proposed · 2026-11-19
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
- **Status:** Proposed · 2026-11-19 (validate in T-1.6 and T-2.1)
- **Decision:** Each route-scoped style group compiles to its own `CSSStyleSheet` in `document.adoptedStyleSheets`; navigation toggles `sheet.disabled`. Settings and tokens are compiled into the CSS (blocks included/excluded; values as `:root` custom properties), so the page's DOM is never annotated.
- **Why:** No selector rewriting for routes, no attributes the page can strip, no DOM markers for fingerprinting, O(1) work on navigation.
- **Revisit if:** adopted sheets prove unreliable on a target site (fallback: `<style>` kept last; extension-architecture §3.2).
