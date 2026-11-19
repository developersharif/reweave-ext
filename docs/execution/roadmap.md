# Roadmap

Effort figures are **assumptions** in ideal working days for one developer working with Claude Code; calendar time depends on availability. Task details and status: [`task-tracker.md`](task-tracker.md).

```
Phase 1 — Useful alone (Chrome, local-first)
  M0 Foundations ─▶ M1 Engine core ─▶ M2 Runtime + YouTube ─▶ M3 Templates, health, library
                                                    └──────▶ M4 Reddit + X (shadow DOM)
                                         M3 ─▶ M5 Studio + UserCSS ─▶ M6 CWS beta ══▶ GATE A
Phase 2 — Community
  GATE A ─▶ M7 Catalog (GitHub PRs + R2 + Worker + static site) ─▶ M8 Compatibility CI ══▶ GATE B
Phase 3 — Sustainability (only if GATE B passes)
  M9 Accounts, sync, supporter + Pro      M10 Firefox release, more sites
```

Critical path to a public beta: **M0 → M1 → M2 → M3 → M6** (YouTube-only beta is acceptable if M4/M5 slip; see "Beta cut" below).

---

## M0 — Foundations (≈2–3 days)

- **Objective:** A repo where every later task can be built, tested, and shipped by any session.
- **Deliverables:** pnpm monorepo, WXT + React extension shell loading in Chrome, package skeletons, CI (typecheck, lint, test, build Chrome + Firefox), brand package.
- **Technical decisions:** D-005, D-007, D-010, D-018. Verify WXT version and runtime content-script registration (T-0.2); record platform facts (T-0.3).
- **Dependencies:** none.
- **Tasks:** T-0.1 … T-0.6.
- **Acceptance:** `pnpm install && pnpm check` (typecheck + lint + test + build) passes locally and in CI; unpacked extension loads in Chrome and shows the popup; Firefox build artifact is produced.
- **Testing:** CI pipeline itself; one smoke unit test per package.
- **Risks:** WXT API differences from these docs → adjust docs in the same PR.

## M1 — Engine core: schema + compiler (≈5–7 days)

- **Objective:** A pure-TypeScript, browser-independent engine that validates, sanitizes, and compiles templates against adapters.
- **Deliverables:** `@reskin/schema` (types, validation, JSON Schema, error codes), `@reskin/compiler` (parse, sanitize, dialect resolution, route groups, tokens/settings), `reskin` CLI (`validate`, `compile`).
- **Technical decisions:** validation library (T-1.1), CSS parser + dialect syntax (T-1.2), compiled output format (T-1.6, D-021).
- **Dependencies:** M0.
- **Tasks:** T-1.1 … T-1.7.
- **Acceptance:** spec example in `template-schema.md` validates and compiles; every attack fixture in `security-model.md` §3 is rejected or flagged with the right code; 256 KB template compiles in < 100 ms in Node; compiler runs in a service-worker-like environment (no DOM APIs).
- **Testing:** Vitest golden files (dialect → CSS), attack fixtures, invalid-manifest fixtures, perf test.
- **Risks:** css-tree can't parse the dialect cleanly → fallback syntax (`:component(name)`); bundle size too large for SW → evaluate alternatives.
- **Outcome (2026-11-19):** done. `:--name` works; tokens became `token(group-name)`; no CSS nesting in v1 (D-026). css-tree is ~23.5 KB gzip via subpath imports.

## M2 — Extension runtime + YouTube adapter + popup (≈7–10 days)

- **Objective:** The end-to-end loop on one real site: enable YouTube → apply a template → it survives navigation → settings update live → one click restores the original.
- **Deliverables:** injection + navigation spikes resolved; background (registry, sites, compile-service, storage, migrations, messages); content script (boot, sheets, routes, live updates, sensitive routes); YouTube adapter v1 + fixtures; Playwright e2e harness; popup v1; one dev template.
- **Technical decisions:** D-021 confirmed or revised (T-2.1); navigation strategy (T-2.2).
- **Dependencies:** M1.
- **Tasks:** T-2.1 … T-2.8.
- **Acceptance (all on a fresh Chrome profile):** enable via popup (one permission prompt for youtube.com only) → template applied on reload with no visible flash on a typical load → home→watch SPA navigation switches route styles without reload → toggling a setting updates the open tab within ~200 ms → "Original site" removes all styles → no errors in page or SW consoles. Covered by an e2e test against fixtures.
- **Testing:** unit (background modules), adapter fixture tests, e2e (Playwright + request interception), manual check on live youtube.com (logged out and logged in).
- **Risks:** FOUC on slow machines; YouTube DOM variance (A/B tests, logged-in vs logged-out); Navigation API not observable from isolated world → fallbacks.

## M3 — Curated templates, palettes, health, library (≈5–7 days)

- **Objective:** Make MVP-1 genuinely useful and show the differentiator (works-today status).
- **Deliverables:** 3 curated YouTube templates with previews; 4 palettes; variants; probes + health badge + "Looks broken?" (prefilled GitHub issue, no server); options/library page; import/export; `storage.sync` mirroring; welcome page.
- **Dependencies:** M2.
- **Tasks:** T-3.1 … T-3.7.
- **Acceptance:** a new user reaches a restyled YouTube in ≤ 4 clicks from install; switching palette re-themes any token-aware template; removing a component from a fixture flips the popup badge to "May be broken"; library export → wipe → import restores everything.
- **Testing:** e2e for onboarding, switching, palette; unit for sync size guards; manual design QA in light/dark.
- **Risks:** template quality (we are the first creators — design time is real work, budget it).

## M4 — Reddit + X adapters, shadow DOM (≈7–10 days, can run parallel to M5)

- **Objective:** Three launch sites (D-004).
- **Deliverables:** shadow-DOM spike; compiler shadow scopes; content-script shadow injector; Reddit adapter + fixtures + 3 templates; X adapter + fixtures + 3 templates.
- **Dependencies:** M2 (M3 for templates/palettes).
- **Tasks:** T-4.1 … T-4.5.
- **Acceptance:** same M2 acceptance flow passes on reddit.com and x.com; Reddit components inside open shadow roots are styled; probes cover each site's cover route.
- **Risks:** closed shadow roots on Reddit; X largely requires login (fixtures must be captured from a logged-in session and sanitized); both sites change often.

## M5 — Studio (local creator mode) + UserCSS (≈8–12 days)

- **Objective:** Let CSS-capable creators build templates on the live page without leaving the browser.
- **Deliverables:** Studio injection + shadow-root UI; component picker; CodeMirror 6 editor with dialect autocomplete + inline diagnostics; live preview; tokens panel; save/export/import `.zip`; UserCSS import/export.
- **Dependencies:** M1, M2 (M3 for tokens UI).
- **Tasks:** T-5.1 … T-5.8.
- **Acceptance:** recreate the curated "Focus YouTube" template from scratch in Studio in < 30 minutes; a Catppuccin-style UserCSS file imports as a local template on its matching supported site.
- **Risks:** scope creep (no drag-and-drop, no AI, no settings builder UI beyond JSON editing in v1).

## M6 — Chrome Web Store beta (≈4–6 days) → GATE A

- **Objective:** Real users, measurable retention.
- **Deliverables:** hardening; privacy policy + terms; store listing; release pipeline; feedback channels + Pro waitlist; name clearance; landing page.
- **Dependencies:** M3 (M4/M5 optional — see beta cut).
- **Tasks:** T-6.1 … T-6.7.
- **Acceptance:** extension approved and live (unlisted first, then public); privacy policy matches `security-model.md` §4; Gate A metrics instrumented via store dashboard + opt-in survey + waitlist.
- **Risks:** CWS review delays/rejection (permission justification, trademark use in listing); name conflict found late.

**Beta cut:** if M4 or M5 slips more than 2 weeks, ship M6 with YouTube only and Studio behind a "Labs" flag.

**Optional opportunity — Arc refugees (Arc stops working 2026-12-22):** a landing page + waitlist targeting Boosts users can ship during M2–M3 (T-6.7 pulled forward). A Boosts importer is only worth it if Arc's export format is accessible (unverified).

## GATE A (≈8 weeks after public beta)
Evaluate `mvp-scope.md` §4. Pass → M7. Fail → stop features, interview uninstallers, decide pivot/stop. Record outcome in `decisions.md`.

## M7 — Community catalog (≈10–14 days)

- **Objective:** Anyone can publish; users can browse and auto-update.
- **Deliverables:** Cloudflare provisioning (R2, Worker, domain, staging/prod); public `templates` repo with CI validation + contributor guide; bundle/sign/upload pipeline; signed index + revocations; Worker API + anonymous install counter; extension update service + browse/install; static marketplace site with before/after; remote adapter updates; content policy + DMCA page.
- **Dependencies:** Gate A pass; M1 CLI.
- **Tasks:** T-7.1 … T-7.8.
- **Acceptance:** an external contributor's PR goes from opened → validated → merged → installed via the website → auto-updated on a new version, with signatures verified; a revoked version disables within one update cycle.
- **Risks:** creator cold start (we seed and recruit; UserCSS import helps); signing-key handling mistakes.

## M8 — Compatibility CI + status (≈6–8 days) → GATE B

- **Objective:** The "works today" promise, backed by automated checks.
- **Deliverables:** scheduled canaries on logged-out routes; template status computation + badges; public status page; opt-in aggregate probe reports.
- **Dependencies:** M7.
- **Tasks:** T-8.1 … T-8.5.
- **Acceptance:** a simulated selector break in a fixture or live canary produces an alert issue within one schedule interval and the affected templates' badges change.
- **Risks:** automated access to target sites (rate limits, bot detection, ToS) → low frequency, logged-out only, minimal pages.

## GATE B (≈3 months after M7)
Evaluate `mvp-scope.md` §4. Pass → Phase 3. Fail → keep as free open-source project; cut costs.

## M9 — Accounts, sync, supporter + Pro (gated)
D1 + auth, web library sync, supporter payment, Pro ($3.99/mo or $29/yr; business-model.md §9), reviews tied to versions, web publishing UI. Re-verify auth library and payment provider status first.

## M10 — Firefox release, more sites (gated, parallelizable)
Firefox AMO release (source submission), Edge listing, next sites chosen by "request this site" votes + feasibility review.
