# Risk Register

L = likelihood, I = impact (H/M/L). Review at each milestone end; update status.

| ID | Risk | L | I | Mitigation | Trigger / early signal | Status |
|---|---|---|---|---|---|---|
| R-01 | **Stylebot (or Tweeks) ships compatibility tracking + ratings first** | M | H | Ship M2–M3 fast; make adapter layer + "works today" badges the headline; open-source adapters to build a contributor base | Their release notes | Open |
| R-02 | **Users don't keep redesigns installed** (novelty churn) | M | H | Gate A retention metric before backend; focus templates solve a daily annoyance (Shorts, feeds) rather than pure aesthetics | 30-day retention < 30% | Open |
| R-03 | **Adapter maintenance outpaces one developer** | H | H | Stable hooks only; probes; launch with 1 site, add 2 more only after M2; community adapter PRs; status page sets expectations | > 1 breaking site change/week | Open |
| R-04 | FOUC / flash of original layout on page load | M | M | adoptedStyleSheets at `document_start`; measure in T-2.1; fallback `<style>` | T-2.1 numbers | Open |
| R-05 | **CWS rejection or policy change** (permissions, remote data, trademark use in listing) | M | H | Narrow optional permissions; data-only updates; descriptive trademark use; clear single-purpose statement; no DOM-operation interpreter | Review feedback | Open |
| R-06 | Declarative features drift toward "interpreting remote commands" | L | H | Keep templates CSS + static JSON; no DOM-ops vocabulary without policy review (D-002) | Any proposal for runtime DOM ops | Open |
| R-07 | Malicious or scammy community template | M | H | Sanitizer + no-network CSS + protected components + human review + signed revocation (security-model) | Abuse report | Open |
| R-08 | Signing key compromise | L | H | Key only in protected CI env; key rotation via `keyId`; incident runbook | Unexpected signed artifacts | Open |
| R-09 | Target site hostility: detection, ToS enforcement, DOM obfuscation | M | M | No web-accessible resources, no DOM markers; avoid Facebook/Instagram/LinkedIn (D-004); purely cosmetic changes | Site blocks or C&D | Open |
| R-10 | **Revenue never covers upkeep** (realistic scenario ≈ $534 MRR at month 24) | H | M | Keep costs ≈ $5/mo; treat as open-source side project until Gate B; don't build payments early (D-009) | Gate B fails | Open |
| R-11 | Creator cold start | H | M | We author 9+ curated templates; UserCSS import; recruit Catppuccin/USw authors; GitHub-PR publishing (D-019) | < 5 interested creators at Gate A | Open |
| R-12 | AI page-editing in browsers commoditizes customization | M | M | Position on maintained, reviewable, compatible templates; later AI authoring that outputs adapter-based templates | Chrome/Gemini announcements | Open |
| R-13 | Name conflict / trademark issue discovered late | M | M | Brand isolated in `packages/brand` (D-010); clearance before public listing (T-6.6) | Clearance results | Open |
| R-14 | X fixtures need a logged-in session; legal/ToS sensitivity of captured markup | M | L | Structure-only sanitized fixtures, no content; don't publish raw captures | — | Open |
| R-15 | Payment provider instability (e.g. Lemon Squeezy shutdown reported for 2027-03-31) | M | L | Choose provider at M9 after re-verification; abstract billing behind one module | — | Open |
| R-16 | Research gaps (market demand mining, full technical + legal pass were interrupted) | — | M | Spikes T-0.2, T-0.3, T-2.1, T-2.2, T-4.1; legal checklist items re-verified before M6/M7 | — | Open |
| R-17 | Parser differential: css-tree accepts something the browser parses differently, letting CSS past the sanitizer | L | H | Output is regenerated from the checked AST, never copied; escapes outside strings and any parse error are rejected; function allowlist; every bypass found gets an attack fixture | New CSS syntax in Chrome release notes; fuzzing finds a mismatch | Open |
| R-18 | Pages can detect that a template is active: adopted sheets are listed in `document.adoptedStyleSheets` and their rules are readable from the page; `--rk-*` custom properties and computed styles reveal it too (technical-research §5.1) | H | L | Compiled CSS carries no template ids, names or comments; no DOM nodes, attributes or page globals (T8); hostile detection only learns "some reskin is active" | A site starts blocking or penalizing users with active styles | Accepted |
