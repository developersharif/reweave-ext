# Template Specification (v1 draft)

Status: **Draft for M1 implementation.** Format version `schemaVersion: 1`.
Owner decisions live in [`../execution/decisions.md`](../execution/decisions.md). Security rationale lives in [`security-model.md`](security-model.md).

This document defines three package types:

| Package | Authored by | Purpose |
|---|---|---|
| **Site Adapter** | Platform team (open source, PR-reviewed) | Maps a website's routes and UI components to current selectors. Absorbs site changes so templates don't break. |
| **Template** | Community creators | The redesign: CSS written against adapter components, settings, variants, previews. |
| **Palette** | Anyone | A set of standard design tokens (colors, fonts, radii) that any token-aware template can wear. |

The core idea: **templates never depend directly on a website's DOM if they can avoid it.** They depend on a versioned adapter. When YouTube renames a class, one adapter release fixes every template that uses that component. This is the main technical differentiator vs. raw userstyles (see `docs/research/competitor-analysis.md`).

---

## 1. Design principles

1. **Declarative only.** CSS + JSON. No JavaScript from creators, ever, in v1. (Chrome Web Store remote-code rules and the threat model both point here. See `docs/research/technical-research.md` §2 and `docs/research/security-and-legal.md`.)
2. **No network from CSS.** Compiled CSS may not reference any external URL. Images and fonts ship inside the bundle as `asset:` references. This eliminates CSS-exfiltration and tracking-beacon attacks by construction.
3. **Compile, don't interpret.** Creators write a small superset of CSS (the *authoring dialect*). The extension's bundled compiler turns it into plain CSS using the adapter version installed on the device. Recompilation happens locally whenever the adapter, settings, or palette change.
4. **One active template per site** (plus one optional palette). Avoids cascade fights between templates and makes "is it broken?" answerable.
5. **Immutable, content-addressed, signed releases.** Every published version is a frozen bundle with a SHA-256 digest, signed by the platform after review.
6. **Forward-compatible.** Unknown optional fields are ignored; unknown required features (`requires`) cause a clean "update the extension" message instead of a broken page.

---

## 2. Source layout (what a creator edits)

```
minimal-youtube/
├── template.json          # manifest (this spec)
├── styles/
│   ├── base.css           # applies on every matched route
│   ├── watch.css          # applies on the "watch" route only
│   └── home.css
├── assets/
│   ├── inter-var.woff2    # OFL font, declared in manifest
│   └── noise.webp
└── previews/
    ├── cover.webp         # 1600×1000, required
    └── watch-before-after.webp
```

On publish, the API validates, sanitizes, compiles a **bundle** (§9), stores it in R2, and records metadata in D1.

---

## 3. Manifest (`template.json`)

### 3.1 Example

```json
{
  "$schema": "https://schemas.example.invalid/template/v1.json",
  "schemaVersion": 1,
  "id": "demo/minimal-youtube",
  "name": "Minimal YouTube",
  "summary": "Distraction-free YouTube: no Shorts, no homepage feed, calm typography.",
  "version": "1.2.0",
  "license": "MIT",
  "authors": [{ "handle": "demo" }],
  "category": "focus",
  "tags": ["minimal", "focus", "no-shorts"],

  "targets": [
    {
      "adapter": "youtube",
      "adapterRange": "^2.0.0",
      "styles": [
        { "file": "styles/base.css" },
        { "file": "styles/home.css",  "routes": ["home"] },
        { "file": "styles/watch.css", "routes": ["watch"] }
      ],
      "hide": [
        { "component": "shorts-shelf", "when": "hideShorts" },
        { "component": "home-feed",    "when": "hideHomeFeed" }
      ]
    }
  ],

  "tokens": {
    "consumes": "standard/v1",
    "defaults": {
      "color.bg": "#0f0f10",
      "color.text": "#e8e8ea",
      "color.accent": "#7aa2f7",
      "font.body": "Inter",
      "radius.md": "10px"
    }
  },

  "settings": [
    { "id": "hideShorts",   "type": "boolean", "label": "Hide Shorts",        "default": true },
    { "id": "hideHomeFeed", "type": "boolean", "label": "Hide homepage feed", "default": false },
    { "id": "density",      "type": "select",  "label": "Density", "default": "comfortable",
      "options": [{ "value": "compact", "label": "Compact" }, { "value": "comfortable", "label": "Comfortable" }] },
    { "id": "maxWidth",     "type": "range",   "label": "Content width", "default": 1200,
      "min": 800, "max": 1800, "step": 50, "unit": "px" }
  ],

  "variants": [
    { "id": "focus",  "label": "Deep focus", "settings": { "hideHomeFeed": true } },
    { "id": "light",  "label": "Light", "tokens": { "color.bg": "#fafafa", "color.text": "#111" } }
  ],

  "assets": [
    { "id": "inter", "file": "assets/inter-var.woff2", "kind": "font", "license": "OFL-1.1" }
  ],

  "previews": [
    { "file": "previews/cover.webp", "alt": "Watch page with dark minimal layout", "role": "cover" },
    { "file": "previews/watch-before-after.webp", "alt": "Before/after of the watch page", "route": "watch" }
  ],

  "requires": { "engine": ">=1.0.0" }
}
```

### 3.2 Field reference

| Field | Type | Req | Rules |
|---|---|---|---|
| `$schema` | URL | no | JSON Schema URL for editor tooling. Ignored at runtime. |
| `schemaVersion` | integer | **yes** | Format version. Engine supports current and previous major (`N`, `N-1`) with bundled migrations. |
| `id` | `owner/slug` | **yes** | `owner` = creator handle; `slug` = `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–48 chars. Immutable after first publish. |
| `name` | string | **yes** | 3–60 chars. **Must not imply official affiliation** (no "Official", no site logos). See §10. |
| `summary` | string | **yes** | ≤140 chars, plain text. |
| `description` | string | no | Markdown, ≤10 000 chars, rendered with a strict sanitizer (no raw HTML, no images except bundle previews). |
| `version` | semver | **yes** | Strictly increasing per `id`. See §8. |
| `license` | SPDX id | **yes** | Allowed: `MIT`, `Apache-2.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC0-1.0`, `MPL-2.0`. Default suggested: `MIT`. |
| `authors` | array | **yes** | `{ handle }` of platform accounts; first is owner. |
| `category` | enum | **yes** | `focus`, `aesthetic`, `compact`, `accessibility`, `retro`, `dark`, `other`. |
| `tags` | string[] | no | ≤8, lowercase kebab-case, ≤24 chars each. |
| `targets` | Target[] | **yes** | 1–5 targets (one per adapter). |
| `tokens` | object | no | §6. |
| `settings` | Setting[] | no | ≤32 settings. §5. |
| `variants` | Variant[] | no | ≤8 presets of settings and/or token overrides. |
| `assets` | Asset[] | no | §7. |
| `previews` | Preview[] | **yes** | 1–8 images; exactly one `role: "cover"`. WebP/PNG/JPEG, ≤1 MB each, ≤2400 px on the long edge. |
| `requires.engine` | semver range | no | Minimum compiler/runtime version. |

### 3.3 Target

| Field | Type | Req | Rules |
|---|---|---|---|
| `adapter` | adapter id | **yes** | Must exist in the adapter registry (e.g. `youtube`, `reddit`, `github`). |
| `adapterRange` | semver range | **yes** | e.g. `^2.0.0`. Template is "incompatible" if the installed adapter is outside the range. |
| `routes` | string[] | no | Restricts the whole target to adapter route ids. Default: all non-sensitive routes. |
| `styles` | StyleRef[] | **yes** | `{ file, routes?, media? }`. `routes` are adapter route ids; `media` is a media query string (validated). |
| `hide` | HideRule[] | no | `{ component, when?, routes? }` → compiled to `display: none !important` on the adapter selector. `when` = boolean setting id (optionally `!id` for negation). |
| `rawSelectors` | boolean | no | Must be `true` if any style file uses selectors not derived from adapter components. Surfaces a "fragile" badge. Computed and verified by the compiler; mismatch = publish error. |

Why no free-form `urlPatterns` in v1: adapters own URL→route mapping so that templates are portable when a site changes URL structure (e.g. `/feed/subscriptions` → `/subscriptions`). An escape hatch `urlPatterns` (Chrome match-pattern syntax, constrained to the adapter's hosts) is reserved for v1.1 if creators need it.

---

## 4. Authoring dialect (CSS superset)

Creators write normal CSS plus three compile-time extensions. Everything compiles to standard CSS; nothing is interpreted at runtime.

| Syntax | Meaning | Compiles to |
|---|---|---|
| `:--video-card` | Adapter component alias | The adapter's current selector list, e.g. `:is(ytd-rich-item-renderer, ytd-video-renderer)` |
| `token(color.bg)` | Standard design token | `var(--rk-color-bg)` |
| `@setting hideShorts { … }` | Rules active when boolean setting is on | Block included in compiled CSS only when on (recompiled on change) |
| `@setting density = compact { … }` | Rules active when select setting equals value | Block included only when the value matches |
| `setting(maxWidth)` | Numeric/color/font setting value | `var(--rk-s-max-width)`, defined in a generated `:root` rule |

`rk` is the internal namespace prefix (D-012). Creators never type it, so it can change without breaking templates. Route-scoped files compile to separate sheets that the runtime enables/disables on navigation (D-021); nothing is written to the page's DOM attributes.

Example `styles/watch.css`:

```css
:--primary-column { max-width: setting(maxWidth); margin-inline: auto; }
:--video-title    { font: 600 1.4rem/1.3 token(font.body); color: token(color.text); }
:--related-sidebar { opacity: .6; transition: opacity .2s; }
:--related-sidebar:hover { opacity: 1; }

@setting density = compact {
  :--comment { padding-block: 4px; }
}
```

Implementation note: CSS parsers must accept `:--name` (it mirrors the syntax of the unimplemented CSS Extensions `@custom-selector` draft). Verify with css-tree in the M1 spike; if `:--name` can't be parsed reliably, fall back to a functional pseudo-class `:component(name)`. Decision tracked in `task-tracker.md` (M1).

### 4.1 Allowed CSS (v1 allowlist)

- **At-rules:** `@media`, `@supports`, `@container`, `@layer`, `@keyframes`, `@font-face` (only `src: asset(...)`), `@property`, `@scope`, plus dialect `@setting`.
- **Forbidden at-rules:** `@import`, `@namespace`, `@charset` (stripped), `@document`/`@-moz-document` (URL scoping belongs in the manifest), any unknown at-rule.
- **`url()` / `image-set()` / `src()`:** only `asset(<id>)` references → compiled to `data:` URIs or extension-local blob URLs. Any `http:`, `https:`, `//`, `data:` authored directly, or `javascript:` → **publish error**.
- **Forbidden properties/values:** `behavior`, `-moz-binding`, `expression()`, `-webkit-user-modify`, `filter: url(...)` (external SVG), `cursor: url(...)` external.
- **`content` property:** allowed with `none`, `normal`, `""`, counters, `attr()`, and strings ≤ 3 characters (icons, separators). Longer strings → **flagged for human review** (UI-redress risk: fake support numbers, altered prices). See security-model §3.
- **Selector limits:** ≤ 4 levels of `:has()` nesting, no `:has()` on `*` or `:root` with descendant combinators (performance), total selectors ≤ 5 000 per template.
- **Size limits:** ≤ 256 KB total CSS source; ≤ 2 MB total bundle including assets.
- **Sensitive routes:** adapters mark routes such as login, checkout, account security, and payments as `sensitive: true`. The engine never applies templates there. Not overridable by templates.

---

## 5. Settings

User-facing controls rendered by the extension popup / options page. Settings are **compiled into the CSS** (blocks included/excluded, values emitted as custom properties in a generated `:root` rule); changing a setting triggers a local recompile and a live sheet swap. No setting can inject arbitrary text into the page.

| `type` | Extra fields | Runtime effect |
|---|---|---|
| `boolean` | `default` | `@setting <id>` blocks and `hide … when` rules included/excluded |
| `select` | `options[] {value,label}`, `default` | matching `@setting <id> = <value>` blocks included (value matches `^[a-z0-9-]{1,32}$`) |
| `range` | `min`, `max`, `step`, `unit` (`px`,`rem`,`%`,`ms`, none), `default` | `--rk-s-<id>: <n><unit>` (clamped) |
| `color` | `default` (hex/oklch) | `--rk-s-<id>: <color>` (validated color syntax) |
| `font` | `options[]` from bundled `assets` or system-safe families | `--rk-s-<id>: <family>` |

Rules: `id` matches `^[a-z][a-zA-Z0-9]{0,31}$`; labels ≤ 40 chars; **no free-text type in v1**. Setting values are stored per user per template; on upgrade, values are kept by `id`, dropped if the setting disappears, and re-clamped if the range changes.

---

## 6. Design tokens and palettes

Tokens make templates and palettes interchangeable ("wear Catppuccin on any token-aware template").

- Token files follow the **W3C Design Tokens Format Module 2025.10** (first stable DTCG report, 2025-10-28: https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/, accessed 2026-11-19), restricted to the `color`, `dimension`, `fontFamily`, `number`, `duration` types.
- **Standard token contract `standard/v1`** (the only one in v1):

| Group | Tokens |
|---|---|
| color | `bg`, `surface`, `surface-2`, `text`, `text-muted`, `accent`, `accent-text`, `border`, `link`, `danger`, `success` |
| font | `body`, `heading`, `mono`, `scale` (number, default 1) |
| radius | `sm`, `md`, `lg` |
| space | `scale` (number, default 1) |
| motion | `duration` |

- Resolution order (later wins): standard defaults → template `tokens.defaults` → active `variant.tokens` → **user's palette** (if the template declares `consumes: "standard/v1"`) → user overrides.
- A **Palette** package is `{ schemaVersion, id, name, version, license, tokens: <DTCG subset>, modes?: { light, dark } }`. Palettes contain no CSS and no selectors, so they are low-risk and need lighter review.

---

## 7. Assets

- `kind`: `font` (woff2 only) or `image` (webp, png, avif, svg).
- **SVG is sanitized** server-side (strip scripts, event handlers, `<foreignObject>`, external references) and rasterized fallback is not required.
- Fonts must declare an OSI/OFL-compatible `license`; commercial fonts are rejected.
- Referenced from CSS via `asset(<id>)`. Unreferenced assets are a publish warning; total ≤ 2 MB.

---

## 8. Versioning

| Thing | Scheme | Breaking (MAJOR) when |
|---|---|---|
| Format | `schemaVersion` integer | Field semantics change. Engine ships migrations `N-1 → N`. |
| Template | semver `version` | A setting `id` is removed/retyped, or `tokens.consumes` changes. |
| Adapter | semver | A component or route id is removed or its meaning changes. Adding components = MINOR. Selector fixes = PATCH. |
| Palette | semver | A token is removed. |
| Engine (compiler/runtime) | semver | Dialect or runtime contract changes. |

Update policy: the extension checks the signed index every ~6 hours (and on browser start). PATCH/MINOR template and adapter updates apply automatically. A template MAJOR shows an "Update available — settings may reset" badge and applies on user confirmation. Published versions are immutable; "unpublish" only hides a version from new installs (revocation is separate, §9.3).

---

## 9. Distribution bundle

### 9.1 Format

The API produces one JSON document per template version:

```json
{
  "bundleVersion": 1,
  "id": "demo/minimal-youtube",
  "version": "1.2.0",
  "manifest": { "...normalized template.json..." },
  "sources": { "styles/base.css": "<sanitized authoring-dialect CSS>" },
  "assets":  { "inter": { "mime": "font/woff2", "sha256": "…", "r2Key": "assets/…" } },
  "digest":  "sha256-…",
  "signature": { "alg": "Ed25519", "keyId": "k2026-1", "sig": "…" }
}
```

- Sources are shipped **uncompiled** (sanitized dialect), because compilation depends on the adapter version installed on the device. The compiler is bundled in the extension.
- Assets are fetched once from R2 via the API, verified by SHA-256, and stored in IndexedDB.
- `digest` covers the canonical JSON (RFC 8785 JCS) of everything except `signature`.

### 9.2 Verification on install / update

1. Verify Ed25519 signature with a public key bundled in the extension (supports key rotation via `keyId`).
2. Verify `digest` and asset hashes.
3. Re-run the **client-side sanitizer** (same package as the server) — defense in depth.
4. Check `requires.engine` and `adapterRange`.
5. Compile → store compiled CSS per (site, route-set) in `chrome.storage.local`.

Locally created templates (Creator mode, never published) skip signature checks but still go through the sanitizer.

### 9.3 Revocation

A signed `revocations.json` (template ids/versions + reason code) is fetched with the index. Revoked versions are disabled immediately and the user sees why. This is the kill switch for malicious or legally contested templates.

---

## 10. Naming, branding, and content rules (validated at publish)

- `name`/`summary` must not contain "official", "by YouTube", etc. Third-party marks may be used only descriptively ("Minimal theme for YouTube"), never as the template's own brand.
- Previews may show the restyled site but must not contain site logos as the dominant element, personal data, or other people's content beyond incidental UI. Creators must blur faces/usernames (publish checklist).
- No templates whose primary purpose is to deceive (impersonation, fake UI, hiding legal/consent/security notices). Adapters mark consent/security components `protected: true`; `hide` rules and `display:none` targeting them are rejected.

---

## 11. Site Adapter format

Adapters live in the monorepo (`packages/adapters/<site>/adapter.json`), are open source, and ship inside the extension **and** as signed updates (data only).

```json
{
  "schemaVersion": 1,
  "id": "youtube",
  "version": "2.3.1",
  "name": "YouTube",
  "hosts": ["www.youtube.com"],
  "routes": {
    "home":    { "path": "/" },
    "watch":   { "path": "/watch" },
    "shorts":  { "path": "/shorts/*" },
    "search":  { "path": "/results" },
    "channel": { "path": ["/@*", "/channel/*", "/c/*"] },
    "account": { "path": ["/account*"], "sensitive": true }
  },
  "components": {
    "masthead":         { "selector": "ytd-masthead", "routes": ["*"] },
    "guide-sidebar":    { "selector": "ytd-guide-renderer, ytd-mini-guide-renderer" },
    "home-feed":        { "selector": "ytd-browse[page-subtype='home'] ytd-rich-grid-renderer", "routes": ["home"] },
    "video-card":       { "selector": "ytd-rich-item-renderer, ytd-video-renderer" },
    "shorts-shelf":     { "selector": "ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer" },
    "primary-column":   { "selector": "#primary.ytd-watch-flexy", "routes": ["watch"] },
    "related-sidebar":  { "selector": "#secondary.ytd-watch-flexy", "routes": ["watch"] },
    "consent-dialog":   { "selector": "ytd-consent-bump-v2-lightbox", "protected": true }
  },
  "shadowRoots": [],
  "navigationEvents": ["yt-navigate-finish"],
  "probes": [
    { "component": "masthead", "route": "home", "expect": "present" },
    { "component": "primary-column", "route": "watch", "expect": "present" }
  ]
}
```

*Selectors above are illustrative; real values are established and tested in M2.*

- `components.*.selector`: selector list. Prefer stable hooks in this order: custom element names → `data-testid`/`data-*` → ARIA roles/labels → ids → class names. **Hashed/atomic class names are prohibited** in adapters (they're what breaks).
- `shadowRoots`: list of `{ host: <selector>, components: [...] }` for open shadow roots that need per-root style injection (e.g. Reddit's web components). See `extension-architecture.md` §4.
- `navigationEvents`: optional site-specific DOM event names that signal in-page navigation (a hint; the runtime has generic fallbacks, see `extension-architecture.md` §4).
- `probes`: cheap `querySelector` checks the content script runs after load (and occasionally after navigation) to compute **local health**. Aggregate, anonymous probe results (opt-in) drive adapter breakage alerts. See `security-model.md` §5 for what is and isn't sent.

### 11.1 Compatibility model

- **Adapter health** per (adapter version, component): `ok` / `missing` from probes and reports.
- **Template status** (shown on marketplace and in popup):
  - `Working` — all used components healthy, no recent breakage reports, verified within 30 days.
  - `Partially working` — some used components missing, or ≥N "broken" reports since last version.
  - `Broken` — core components (cover route) missing.
  - `Unverified` — no data for 30 days.
- Templates with `rawSelectors: true` get a "may break when the site updates" label and lower ranking weight.

---

## 12. JSON Schema and validation pipeline

- Source of truth: TypeScript schema in `packages/schema` (Valibot or Zod — decide in M1, prefer the smaller runtime for the extension) → generated JSON Schema published at `$schema` URL for editor autocomplete.
- Validation stages (same code in API and extension):
  1. JSON Schema / structural validation.
  2. Semantic checks (unique ids, cover preview present, settings referenced by `when` exist and are boolean, adapter + range exist, routes exist in adapter).
  3. CSS parse (css-tree) → allowlist walk (§4.1) → dialect resolution check (every `:--x` exists in the adapter range's **minimum** version).
  4. Asset checks (MIME sniffing, size, SVG sanitizing, font license).
  5. Policy checks (names, protected components, sensitive routes, long `content` strings → review queue).
- Errors are machine-readable `{ code, path, message }` (e.g. `CSS_EXTERNAL_URL`, `UNKNOWN_COMPONENT`, `SETTING_NOT_BOOLEAN`) so the editor can show inline diagnostics.

---

## 13. Deliberately excluded from v1

| Excluded | Why | Revisit when |
|---|---|---|
| Creator JavaScript (any form) | CWS remote-code policy, security review cost | Never for marketplace templates; maybe local-only "power mode" via `chrome.userScripts` later |
| Declarative DOM operations (move/wrap/reorder nodes) | Needs a runtime engine with MutationObserver; policy and perf questions | After M5, if creators hit CSS limits (grid/`order`/`display:contents` cover most cases) |
| Template dependencies / inheritance | Version-resolution complexity | When ≥3 popular templates would share a base |
| Multiple simultaneous templates per site | Cascade conflicts, support burden | If users demand "stacking" focus + aesthetic |
| Free-text settings | Injection and UI-redress risk | Probably never |
| External fonts (Google Fonts, etc.) | Network from CSS (tracking) | Possibly via platform-hosted font mirror |
