# Requirements

IDs are stable. Each requirement names the milestone that delivers it. MVP-1 means M0–M6.

## Functional requirements

### Site support & application
| ID | Requirement | Milestone |
|---|---|---|
| FR-01 | Detect whether the active tab is a supported site, and the current route, via adapters | M2 |
| FR-02 | Enable a site with a just-in-time optional host permission covering only that site | M2 |
| FR-03 | Apply the assigned template automatically on matching pages, from `document_start` | M2 |
| FR-04 | Keep styles correct across in-page (SPA) navigation without reloads | M2 |
| FR-05 | Never apply templates on adapter-marked sensitive routes | M2 |
| FR-06 | Per-site on/off, a global pause, and "Original site" in one click | M2 |
| FR-07 | Switch between installed templates for a site live | M2 |
| FR-08 | Style components inside open shadow roots where the adapter declares them | M4 |

### Templates, settings, palettes
| ID | Requirement | Milestone |
|---|---|---|
| FR-10 | Validate, sanitize and compile templates per `template-schema.md` | M1 |
| FR-11 | Render setting controls (boolean, select, range, color, font) from the manifest; apply changes live | M2 |
| FR-12 | Variants: one-click presets of settings and tokens | M3 |
| FR-13 | Palettes: choose a palette per site, or globally, that token-aware templates wear | M3 |
| FR-14 | Ship 3 curated templates per launch site, plus 4 palettes | M3 / M4 |
| FR-15 | Import and export templates as `.zip`; import and export the whole library as JSON | M3 |
| FR-16 | Import UserCSS as a local template; export templates as UserCSS | M5 |
| FR-17 | Sync site assignments and settings through `chrome.storage.sync` | M3 |

### Compatibility
| ID | Requirement | Milestone |
|---|---|---|
| FR-20 | Run adapter probes locally and show a template health badge in the popup | M3 |
| FR-21 | "Looks broken?" produces a prefilled report the user reviews before submitting. It contains no URLs or page content | M3 |
| FR-22 | Scheduled canaries compute public template status badges | M8 |
| FR-23 | Adapter fixes reach users without a store release, as signed data | M7 |

### Creator
| ID | Requirement | Milestone |
|---|---|---|
| FR-30 | Studio: in-page editor with a component picker, dialect autocomplete and inline diagnostics | M5 |
| FR-31 | Live preview of edits on the real page | M5 |
| FR-32 | Tokens panel | M5 |
| FR-33 | Publish through a GitHub PR to the templates repo, with automated validation feedback | M7 |

### Catalog & web
| ID | Requirement | Milestone |
|---|---|---|
| FR-40 | Signed catalog index, bundles and revocation list; the extension verifies and auto-updates | M7 |
| FR-41 | Browse and install from inside the extension | M7 |
| FR-42 | Static marketplace site: site pages, template detail with before/after, creator pages, install button | M7 |
| FR-43 | Anonymous install counts | M7 |
| FR-44 | Accounts, web library sync, version-scoped reviews, web publishing UI | M9 |
| FR-45 | Supporter payment and Pro subscription | M9 |

## Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Content script ≤ 25 KB minified and ≤ 5 ms main-thread at `document_start` (p95). Route toggle ≤ 16 ms. Full budgets: extension-architecture §14 |
| NFR-02 | Perceived quality | No visible flash of the original layout on ≥ 95% of normal loads (measured in T-2.1) |
| NFR-03 | Privacy | No telemetry by default. Never transmit URLs, titles or page content (D-017) |
| NFR-04 | Security | Template CSS has no network access. Sanitized on both server and client. Signed bundles. Revocation within one update cycle (security-model) |
| NFR-05 | Permissions | Only `storage` and `scripting`, plus per-site optional hosts. `activeTab` and `alarms` are added only when their milestone needs them |
| NFR-06 | Offline | Everything installed works offline. The server is never on the page-load path |
| NFR-07 | Compatibility | Chrome stable and stable−1. The Firefox build compiles in CI from M0 |
| NFR-08 | Accessibility | Popup and options are keyboard-operable, have visible focus and meet WCAG AA contrast. Studio is keyboard-reachable |
| NFR-09 | Maintainability | TypeScript strict. The engine has no browser dependencies (testable in Node). Adapters are data with fixture tests |
| NFR-10 | Reliability | Adapter fix ≤ 72 h after detection (Gate A), ≤ 48 h (Gate B) |
| NFR-11 | Cost | Cloudflare spend ≤ $10/mo until 100K WAU (business-model §7) |
| NFR-12 | Portability | The brand is defined in one package (D-010). Templates import and export as UserCSS (D-015) |
