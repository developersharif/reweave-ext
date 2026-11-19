# Architecture Overview

## 1. System at a glance

```
                ┌──────────────────────── Phase 2+ (M7+) ────────────────────────┐
                │                                                                 │
 creators ──PR──▶  GitHub: templates repo ──CI: validate/compile/sign──▶  R2 bucket │
                │        (D-019)                     (Ed25519)          bundles,  │
                │                                                       index,    │
                │                                   Worker (Hono) ◀─────adapters  │
                │                                   /v1/catalog …                 │
                │                                   /v1/installs (anon counter)   │
                │   Static marketplace site (Astro) ─ Workers static assets       │
                └───────────────────────────────▲─────────────────────────────────┘
                                                │ signed JSON only (no code)
┌───────────────────────── Chrome extension (Phase 1, M0–M6) ─────────────────────────┐
│                                                                                      │
│  Popup / Options / Welcome (React)  ──messages──▶  Background service worker         │
│        ▲                                            • registry (bundled + imported)  │
│        │ chrome.storage                             • compiler (@reskin/compiler)    │
│        ▼                                            • permissions + CS registration  │
│  chrome.storage.local  ◀───── compiled CSS ──────── • updates (M7)                   │
│        │                                                                             │
│        ▼ (document_start)                                                            │
│  Content script (vanilla TS, tiny): adoptedStyleSheets · route watcher · probes      │
│        │                                                                             │
│        ▼                                                                             │
│  youtube.com / reddit.com / x.com  (DOM untouched except styles)                     │
│                                                                                      │
│  Studio (Creator mode, M5): injected on demand; bundles compiler for live preview    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Packages (monorepo, D-018)

| Package | Runs in | Responsibility | Milestone |
|---|---|---|---|
| `packages/schema` | everywhere | Types + runtime validation for template/adapter/palette manifests; JSON Schema generation; error codes | M1 |
| `packages/compiler` | SW, Studio, CI, Worker | Parse (css-tree), sanitize (allowlist), resolve dialect (`:--x`, `token()`, `@setting`, `setting()`), emit per-route-group CSS; also a CLI (`reskin validate`/`compile` in M1; `bundle` in M7) | M1 |
| `packages/adapters` | bundled + remote data | `youtube`, `reddit`, `x` adapter JSON + fixture-based tests | M2, M4 |
| `packages/templates` | bundled | Curated templates + palettes shipped in the extension | M3 |
| `packages/brand` | UI | Product name, tagline, URLs, colors (single rename point, D-010) | M0 |
| `packages/test-fixtures` | tests | Sanitized DOM snapshots of target routes (structure only, no scripts/personal data) | M2 |
| `apps/extension` | browser | WXT app: background, content script, popup, options, welcome, studio | M0–M6 |
| `apps/api` | Cloudflare Worker | Catalog/bundle/adapter delivery, anonymous counters, opt-in reports | M7 |
| `apps/web` | Cloudflare (static assets) | Marketplace + docs + legal pages | M7 |

Dependency rule: `schema` ← `compiler` ← (`extension`, `api`, CLI). Adapters/templates are data validated by `schema` + `compiler` in tests. `extension` never imports from `apps/*`.

## 3. Key flows

1. **Enable a site:** popup → `permissions.request(origins)` → background registers content script for those origins (`scripting.registerContentScripts`, `document_start`, persisted) → compiles active template → writes `rk:compiled:<adapter>`.
2. **Page load:** content script reads `rk:compiled:<adapter>` → builds one `CSSStyleSheet` per route group → `document.adoptedStyleSheets` → enables sheets matching current route → watches navigation.
3. **Change a setting:** popup → background recompiles (fast, local) → storage write → content script `storage.onChanged` → `sheet.replaceSync()` (no reload).
4. **Adapter/template update (M7):** background alarm → fetch signed index → verify → fetch changed bundles/adapters → verify → recompile → storage write → live pages update.
5. **Health:** content script runs adapter probes at idle per route → `rk:health:<adapter>` → popup badge. Opt-in aggregate upload in M8.

## 4. Cross-cutting principles

- **Data, not code, crosses the network.** Only signed JSON/CSS/assets are fetched (CWS remote-code policy; D-002).
- **Compile on device.** Templates compile against the adapter version the user has; adapter fixes heal templates without creator action (D-003).
- **Local-first.** Everything works offline once installed; the server is a distribution channel, not a dependency.
- **Narrow permissions.** Per-site optional host permissions; no `<all_urls>`; no `webNavigation`/`tabs` permission (D-011).
- **No telemetry by default** (D-017).

## 5. Technology choices (summary)

| Concern | Choice | Status |
|---|---|---|
| Extension framework | WXT (TypeScript) | D-005, version verified in T-0.2 |
| UI | React + TS (popup/options/studio); vanilla TS content script | D-007 (Proposed) |
| CSS parsing | css-tree 3.2.1, subpath imports (D-026, technical-research §9) | Decided (M1) |
| Schema validation | Valibot 1.5.0 (D-025) | Decided (M1) |
| Editor | CodeMirror 6 | M5 |
| Tests | Vitest; Playwright (persistent Chromium + unpacked extension + request interception) | D-020 |
| Backend | Cloudflare Workers (Hono) + R2; D1 at M9 | D-008 |
| Website | Astro static on Workers static assets (M7) | Proposed |
| Signing | Ed25519 (WebCrypto in extension; key held by CI only) | M7 |

Details: [`extension-architecture.md`](extension-architecture.md), [`backend-architecture.md`](backend-architecture.md), [`security-model.md`](security-model.md), [`template-schema.md`](template-schema.md).
