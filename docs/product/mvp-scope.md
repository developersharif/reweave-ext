# MVP Scope

## 1. Evaluation of the proposed MVP

| Proposed | Verdict | Change |
|---|---|---|
| Chrome only | ✅ Keep | Keep Firefox *building* in CI (WXT makes it cheap); ship Firefox after the Chrome beta |
| Facebook and YouTube initially | ⚠️ Change | **YouTube first**, then **Reddit and X**. Facebook dropped: Meta ToS "appearance" clause + enforcement history + atomic class names (D-004) |
| CSS-based templates | ✅ Keep | Plus declarative `hide` rules, settings, tokens; compiled against adapters (D-002, D-003) |
| JSON manifests | ✅ Keep | Spec: `docs/architecture/template-schema.md` |
| Local installation | ✅ Keep | Bundled curated templates + import/export `.zip` and UserCSS |
| Basic theme management | ✅ Keep | Per-site assignment, enable/disable, settings, palette |
| Small curated gallery | ✅ Keep, split | Phase 1: inside the extension (bundled). Phase 2: static site from GitHub repo |
| Simple template publishing | ⚠️ Defer | Phase 2 via GitHub PRs (D-019). No publishing backend in the first release |
| No paid marketplace | ✅ Keep | No payments until Gate B passes (D-009) |
| — (missing) | ➕ Add | **Adapter layer + on-device health probes + "looks broken" flow**: the differentiator must be in the MVP, or the MVP only proves what Stylus already proved |

## 2. MVP-1: "Useful alone" (Chrome Web Store beta) — M0–M6

**In scope**
- Extension (Chrome MV3, WXT, React UI, vanilla content script).
- Adapters: YouTube (M2), Reddit + X (M4).
- 3 curated templates per site, built by us: *Focus* (hide distractions), *Compact* (density), *Calm* (typography/spacing + palette-aware).
- 4 palettes: Default Dark, Default Light, plus two community-style palettes with compatible licenses (verify license before bundling).
- Popup: site detection, on/off, switch template, settings, variant, palette, "looks broken".
- Options/library: per-site assignments, reset, export/import library JSON, global pause.
- Local health probes → compatibility badge in popup.
- Local Creator mode (M5): component picker, CodeMirror editor, tokens panel, live preview, export `.zip`.
- UserCSS import (local, flagged "raw selectors").
- Free settings sync via `chrome.storage.sync` (assignments + settings only).
- Privacy policy, store listing, zero telemetry by default.

**Out of scope for MVP-1**
Accounts · backend · ratings/reviews · install counts · paid anything · AI · Firefox/Safari releases · sites beyond the three · DOM-moving operations · multiple templates per site · web publishing UI.

## 3. MVP-2: "Community" — M7–M8

- Public `templates` repo, PR-based submissions, CI validation (same compiler), maintainer review.
- Signed catalog index + bundles on R2 behind a Worker; extension "Browse" tab and auto-updates.
- Static marketplace site (`/`, `/sites/:adapter`, `/t/:owner/:slug`, `/u/:handle`) generated from the repo, with before/after previews.
- Anonymous install counter (Worker; no identifiers).
- Compatibility CI: scheduled headless runs on logged-out pages → status badges + public status page.
- Remote adapter updates (signed data, no store review needed).

## 4. Validation gates (what the MVP must prove)

Thresholds are **assumptions** to be revisited with real data; they're set so a "no" is actionable.

| # | Hypothesis | Metric | Gate A (end of MVP-1 beta, ~8 weeks live) | Gate B (end of MVP-2, ~3 months live) |
|---|---|---|---|---|
| 1 | Users want alternative designs | CWS installs; 30-day retention (store dashboard "weekly users" ÷ cumulative installs) | ≥ 1,000 installs, ≥ 30% still active | ≥ 5,000 installs |
| 2 | Users install community templates | % of active users with a non-default template; templates installed per user | ≥ 50% keep a template applied after 7 days | ≥ 25% install at least one community (non-curated) template |
| 3 | Creators want to publish | External creators with a merged template | ≥ 5 people express intent (issues, Discord, email) | ≥ 15 external creators, ≥ 40 templates |
| 4 | Templates stay functional | Median time from site change → adapter fix; % templates "Working" | Adapter fix ≤ 72 h after detection | ≥ 90% of listed templates "Working"; fix ≤ 48 h |
| 5 | Credible monetization | Supporter payments / Pro waitlist sign-ups (as % of WAU) | Pro waitlist ≥ 3% of WAU | ≥ 1% of WAU pay a supporter fee or pre-order Pro |

Measurement must respect D-017 (no telemetry by default). Sources: CWS developer dashboard, opt-in in-extension survey, catalog download counts, GitHub activity, waitlist form on the website.

**If Gate A fails:** stop building features; interview 10 uninstallers; decide whether to pivot (e.g., focus-only product, accessibility, or contribute adapters to Stylus/Stylebot) before any backend work.

## 5. Explicit non-goals (first 6 months)

- Visual drag-and-drop layout builder.
- AI template generation.
- Paid templates or creator payouts.
- Supporting logged-in-only areas we can't test in CI (we still apply there, but no CI badges).
- Supporting every site: new sites only by vote + feasibility review.
