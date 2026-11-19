# Technical Research

**Status: partial; §3 and §4 completed in M0, the rest is completed by spike tasks.** The broad technical pass was stopped before it wrote results.
- §2 records what *was* verified, mostly by the competitor analysis, which cites primary sources.
- §3–§6 are **to be filled in by spike tasks** (T-0.2, T-0.3, T-2.1, T-2.2, T-4.1) with source URLs, measurements and dates.
- Code must not depend on an item in §3–§6 until it is filled in.

## 1. Scope

The research questions behind `docs/architecture/extension-architecture.md` (items marked 🔬 there):
1. Style injection without a flash of the original page.
2. Navigation inside single-page apps.
3. Shadow DOM.
4. Permissions and updates.
5. Storage quotas.
6. Cross-browser support.
7. WXT maturity.
8. Backend limits.

## 2. Verified facts (as of 2026-11-19)

| # | Fact | Source |
|---|---|---|
| F1 | The remotely-hosted-code ban "does not include data or things like JSON or CSS" | https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code (via competitor-analysis §3.2) |
| F2 | MV3 requirements prohibit "building an interpreter to run complex commands fetched from a remote source, even if those commands are fetched as data" | https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements (via competitor-analysis §3.2) |
| F3 | User-supplied JS needs `chrome.userScripts` (Chrome 120+). From Chrome 138 it needs a per-extension "Allow User Scripts" toggle, off by default. Registered user scripts are cleared on extension update | https://developer.chrome.com/docs/extensions/reference/api/userScripts ; https://developer.chrome.com/blog/chrome-userscript (via competitor-analysis §3.2) |
| F4 | All remaining MV2 extensions were removed from the CWS by 2026-08-31 | https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline (via competitor-analysis §3.2) |
| F5 | Firefox 136 (2025-03-04) added an MV3 userScripts API as an optional runtime permission | https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts (via competitor-analysis §3.2) |
| F6 | Meta's selectors in News Feed Eradicator are obfuscated atomic classes (e.g. `div.x1hc1fzr.x1unhpq9.x6o7n8i`) | https://jordwest.github.io/news-feed-eradicator-lists/sitelist.json (via competitor-analysis §3.6) |
| F7 | LinkedIn probes for 6,236 Chrome extension IDs | BleepingComputer 2026-04-03 (via competitor-analysis §3.6) |
| F8 | The W3C Design Tokens Format Module 2025.10 is the first stable DTCG release (2025-10-28) | https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/ |
| F9 | Cloudflare cache-first cost estimate: about $5/mo up to about 100K WAU, about $49/mo at 1M WAU | business-model.md §7 |

**Local experiment (research scratchpad, 2026-11-19).** An unpacked MV3 test extension against a local page logged external `url()` beacon requests from all of these:
- CSS declared in the manifest (attribute-selector, background and font-face variants);
- a `<style>` tag inserted by a content script;
- an inline style;
- an `@import`;
- an adopted stylesheet.

Two conclusions:
1. Extension-injected CSS can make network requests.
2. `document.adoptedStyleSheets` works from a content script.

The run *with* a page CSP was not analyzed to a conclusion. D-014 (no network from template CSS) makes the CSP question moot for our design.

**Site maintenance proxy.** The Catppuccin userstyles repo had these commit counts per site port between late 2024 and 2026-10:

| Site port | Commits |
|---|---|
| YouTube | 83 |
| GitHub | 55 |
| Reddit | 30 |
| WhatsApp Web | 30 |
| Instagram | 23 |
| Twitter/X | 19 |
| LinkedIn | 18 |
| Gmail | 18 |

These counts include bot formatting commits and track popularity as well as breakage, so they are a weak signal. YouTube needs the most ongoing upkeep, consistent with R-03.

## 3. Chrome platform facts (T-0.3, done 2026-11-19)

Source for all rows: Chrome extension docs via Context7. URLs are https://developer.chrome.com/docs/extensions/reference/api/storage, …/api/scripting, …/api/permissions, and …/develop/security-privacy/user-privacy (accessed 2026-11-19).

| Question | Answer |
|---|---|
| `storage.local` quota | **10 MB** (5 MB in Chrome ≤ 113), measured as JSON-stringified values plus key lengths. `unlimitedStorage` removes the limit. Exposed to content scripts by default (`setAccessLevel` can restrict it) |
| `storage.sync` quotas | **100 KB total (102,400 B), 8 KB per item (8,192 B), 512 items, 120 writes/min, 1,800 writes/hour.** Writes over the limit fail immediately. ⇒ **Settings sync must be debounced and batched (T-3.5)**; never write on every slider move |
| `storage.session` | 10 MB, in memory only |
| Adding `optional_host_permissions` in an update | "Optional permissions can also be implemented in an extension update… without disabling the extension." Adding a new site in an update is safe |
| `permissions.request` | Must be called **inside a user gesture** (e.g. a button click handler). Chrome prompts only if the warnings differ from those already accepted |
| `registerContentScripts` | `persistAcrossSessions` defaults to **true**. Registration is all-or-nothing: if any id exists or any file is invalid, nothing registers. `updateContentScripts` exists for changes |
| Do runtime-registered scripts survive an extension update? | **Not stated** in the docs. (User scripts are explicitly cleared on update.) ⇒ Re-sync registrations against granted permissions on `runtime.onInstalled` (all reasons) and `onStartup`. Already in extension-architecture §10; verify empirically in T-2.5 |
| `browser.*` namespace | Chrome now exposes `browser.*` (docs mark "browser.* since Chrome 148"). WXT's `browser` works either way |
| `URLPattern`, Navigation API from the isolated world, `chrome.dom.openOrClosedShadowRoot` | Deferred to empirical tests in T-2.2 and T-4.1 |
| CWS registration fee and review times | Not checked (needed only at M6) |

## 4. WXT findings (T-0.2, done 2026-11-19)

- **Version:** `wxt` 0.21.5 (published 2026-10-26), `@wxt-dev/module-react` 1.2.2, Vite 8.3.8 (pulled in by WXT), React 19.3.1.
- **Runtime content scripts:** `defineContentScript({ registration: 'runtime', … })` builds the script without adding it to the manifest. Registration is ours to do via `browser.scripting.registerContentScripts` (WXT docs, entrypoints guide). Whether WXT adds `matches` to `host_permissions` is checked by `scripts/check-manifest.mjs`, which fails the build if it does.
- **Dev builds** add `tabs` and `scripting` for hot reload (WXT manifest docs). Production builds are guarded by `pnpm check:manifest`.
- **Entrypoints directory:** every file in `src/entrypoints/` is treated as an entrypoint, so a `*.test.ts` there breaks `wxt prepare`. Tests live in `src/**` outside `entrypoints/`.
- **Testing:** `WxtVitest()` from `wxt/testing/vitest-plugin` plus `fakeBrowser` from `wxt/testing/fake-browser`. The `wxt/testing` barrel was removed in 0.21. In-memory `browser.storage` works (smoke test passes).
- **Firefox:** `manifestVersion: 3` builds `firefox-mv3`. WXT warns that new Firefox add-ons need `data_collection_permissions`; we declare `{ required: ['none'] }` (D-017). `wxt zip -b firefox` also emits a sources zip for AMO, but it currently contains only `apps/extension`. The AMO source submission must include the workspace packages (follow-up T-10.1).
- **Toolbar title:** the popup's `<title>` overrides `action.default_title`. It is set from `@reskin/brand` in a `build:manifestGenerated` hook.
- **E2E:** Playwright 1.65.1 with its bundled Chromium (159) loads the unpacked build via `--load-extension`. Branded Google Chrome is not used for this.
- **TypeScript:** `typescript@7.0.2` (npm `latest`) exports only a version stub plus `unstable/*` APIs, with no classic compiler API. The workspace pins **TypeScript 6.0.3** (D-022).
- Plasmo/CRXJS comparison: not needed. WXT works as documented.

## 5. Injection and navigation spikes (T-2.1, T-2.2, done 2026-11-19)

**Setup.** Live `www.youtube.com`, logged out, en-US, 1440×900. Playwright 1.65.1 drove its bundled Chromium 159.0.8154.6 (headless) with a throwaway unpacked extension. The extension had a `document_start` content script that reads CSS from `chrome.storage.local` and applies it, like the real runtime will. The CSS was about 60 KB: one visible rule plus 1,800 filler rules.

Pages tested: `/` (home) and `/watch?v=jNQXAC9IVRw` (watch). Each cell is 10 cold loads with a fresh tab. CPU throttling used CDP `Emulation.setCPUThrottlingRate`. The machine was an Intel i5-1135G7 laptop.

Scripts live in `apps/extension/spikes/live-youtube/` (`injection.mjs`, `navigation.mjs`, `ext/`). They run manually and never in CI.

### 5.1 Injection (T-2.1)

Times are in ms from content-script start: median / p95 of 10 loads.

| Metric | adoptedStyleSheets | `<style>` fallback |
|---|---|---|
| Styles applied, home, 1× CPU | 9.5 / 12.7 | 9.4 / 19.3 |
| Styles applied, watch, 1× CPU | 22.4 / 36.6 | 10.6 / 20.9 |
| Styles applied, home, 4× CPU | 48.5 / 169.8 | 145.7 / 282.7 |
| Styles applied, watch, 4× CPU | 159.5 / 349.8 | 153.7 / 541.3 |
| ...of which `storage.local.get` | 70–96% of each figure | 79–95% |
| First contentful paint before our styles (any cell) | **0 / 40 loads** | **0 / 40 loads** |
| `<body>` already existed when styles applied | 0 / 40 | 1 / 40 |
| Style present on `ytd-masthead` after load | 40 / 40 | 40 / 40 |
| Page removed or replaced our sheet (checked every 500 ms during load, and across 6 SPA navigations) | never | never |
| Back/forward cache | YouTube is **not** restored from bfcache: after leaving to another site and going back, `pageshow.persisted` was false and the content script ran again. Styles applied as on a normal load | same |

First paint came 680–2,500 ms after start, so styles always won by a wide margin, even with 4× throttling.

**Conclusion.** Keep `adoptedStyleSheets` as the primary path (D-021 confirmed). Nearly all the latency is the storage read, not CSS parsing, and the `<style>` fallback is not faster. Keep the fallback only for sites where adopted sheets prove unreliable.

Our own main-thread time is the `replaceSync` of about 60 KB, roughly 2–7 ms at 1×. That is near the 5 ms budget (extension-architecture §14), so T-2.6 measures it on the real content script.

**Finding: the page can see adopted sheets.** From the page's own (main-world) scripts:
- `document.adoptedStyleSheets` lists the sheet the content script adopted;
- its `cssRules` are readable.

A `<style>` element would be visible too. Computed styles reveal any injected CSS in any case. So "no DOM markers" (security-model T8) means no *nodes, attributes or globals*; it can't mean the styling is undetectable. Consequences:
- compiled CSS carries no template ids, names or comments;
- the `--rk-*` custom properties are a known, accepted marker (D-012);
- risk R-18 records this.

### 5.2 Navigation (T-2.2)

The test walked through: `/results` → click a result → `/watch` → click the logo → `/` → search → `/results` → back → forward → another site and back.

Latency is measured from the page's own `navigate` event in the main world. That is the moment the URL changes.

| Signal (observed in the content script's isolated world) | Fires on | Latency after the URL change |
|---|---|---|
| Navigation API `currententrychange` (available in the isolated world, Chrome 159) | push, replace, back/forward | **1–2 ms** |
| `yt-navigate-start` (DOM event on `document`) | push (link clicks, search) | 1 ms |
| `popstate` | back/forward only | 2 ms |
| `yt-navigate-finish` | every navigation, plus the initial load | 520–1,120 ms for push (after YouTube fetches and renders the new page); 10–30 ms for back/forward |
| `location.href` poll, 250 ms interval | all | 80–215 ms |

`URLPattern` is also available in the isolated world. We don't need it: adapter route patterns only use `*`, and `matchRoute` in `@reskin/schema` handles that in about 40 lines that also work in Firefox.

**Chosen strategy** (extension-architecture §4):
1. Route changes are detected with `currententrychange`, with `popstate` + `pageshow` as fallbacks for browsers without the Navigation API.
2. Adapter `navigationEvents` mark "navigation finished". Probes run then.
3. A visible-only `location.href` poll every 750 ms is the last resort.

**YouTube keeps the old page on screen for 0.5–1 s** after the URL changes, until `yt-navigate-finish`. If the old route's sheets turned off at the URL change, the old page would briefly show unstyled. So:
- the new route's sheets are enabled immediately;
- the previous route's sheets stay on until a `navigationEvents` event fires, or 1.5 s pass.

Adapter selectors are scoped to each page element (`ytd-browse[page-subtype=…]`, `ytd-watch-flexy`, `ytd-search`), so the short overlap is harmless.

### 5.3 YouTube DOM in November 2026 (input to T-2.3)

- **Light DOM:** YouTube's page DOM is light DOM, with no shadow roots to pierce.
- **Old pages stay alive:** `ytd-page-manager` keeps previously visited page elements alive, hidden. Every page-specific selector must be scoped to its page element.
- **Cards:** video cards are now mostly `yt-lockup-view-model` (watch sidebar, channel, playlist). Search results are still `ytd-video-renderer`, and Shorts are `ytm-shorts-lockup-view-model-v2`.
- **Logged-out home:** a prompt (`ytd-feed-nudge-renderer`), not a feed. The logged-in grid (`ytd-rich-item-renderer`) could not be captured without an account.
- **Video description:** moved into an engagement panel, so it is not an adapter component in v1.
- **Fixture parsing:** live DOM built by scripts nests `<button>` in `<button>` and `<a>` in `<a>`, which the HTML parser re-parents. The fixture capture script rewrites the inner ones to `<span>` and verifies that each saved file parses back to the same element tree (packages/test-fixtures/README.md).
- **happy-dom 21.0.4 disagrees with Chromium:** on the same fixture it gave different element counts and wrong results for `:not()` with a complex selector. Adapter tests therefore run selectors in headless Chromium (Playwright), and CI installs Chromium before `pnpm check`.

### 5.4 YouTube colour variables (input to D-033, 2026-11-19)

**Setup:** live `www.youtube.com`, logged out, en-US, Playwright 1.65.1 with its bundled Chromium 159 (headless). The watch, search, home and channel pages were read with `getComputedStyle(document.documentElement)` in light mode, then again with the `dark` attribute set on `<html>`. The script is `apps/extension/scripts/map-youtube-theme.mjs`.

- **Generated variables do the painting.** YouTube's stylesheets use 165 build-generated custom properties named `--t<16 hex>` in 3,489 declarations. They are defined with literal colours on `:root`, `[dark]` and `[light]`.
  - The readable names `--yt-sys-color-baseline--*` appear directly in only 120 declarations. They are defined on `[light], html` and `[dark], html[dark]`.
  - Overriding only the readable names on `<html>` left almost every surface unchanged.
- **Same names on every page:** the generated names were identical across the page bundles we loaded (they come from the shared `kevlar_base` styles). Whether they survive a YouTube deploy is unknown; T-3.8 tracks it.
- **Matching:** a generated variable takes a standard role when its (light, dark) colour pair equals the pair of exactly one readable name listed for that role.
  - Last run: of 165 generated variables, 21 were bound (6 of them only after dropping alpha), 0 were ambiguous, and 144 matched no standard role (greys, overlays and brand colours). The map also binds 12 readable names and 9 inline variables (below): 42 in all.
  - The masthead uses a translucent base background (`rgba(255,255,255,0.9)` in light, `rgba(15,15,15,0.8)` in dark). Matching it with alpha dropped is what keeps a palette's masthead from staying white.
- **Inline colours:** the chapter bars in search results get `--yt-lightsource-*` variables inline on `ytd-expandable-metadata-renderer`, picked from the thumbnail. They can't be read from `<html>`, so the map lists them by hand, and the theme scope includes `[style*="--yt-lightsource"]`.
  - When a test flips `dark` after load, those inline colours stay light. That is YouTube's own behaviour, not the template's.
- **Grid:** `ytd-rich-grid-renderer` sets `--ytd-rich-grid-items-per-row`, `--ytd-rich-grid-posts-per-row`, `--ytd-rich-grid-item-min-width` and margins inline. A template overrides them with `!important` on the component (Compact YouTube).
- **Result:** with a test palette bound this way, the whole page recoloured (masthead, guide, chips, cards, chapter bars). With nothing bound, the readable names alone kept YouTube's own light and dark colours. That is the fallback D-033 relies on.

## 6. Shadow DOM findings (T-4.1, to fill)

- Reddit components in open roots:
- Components in closed roots:
- Per-root sheet injection cost (n roots, ms):

## 7. Stack evaluation summary (current position)

| Layer | Choice | Confidence | Notes |
|---|---|---|---|
| Extension framework | WXT 0.21.5 | High | Verified in T-0.2: builds Chrome and Firefox MV3, Vitest and Playwright work |
| UI | React + TS | High | D-007 Accepted (M0) |
| Content script | Vanilla TS | High | Size and perf budget |
| CSS parser | css-tree 3.2.1 (subpath imports) | High | T-1.2: parses the dialect; ~23.5 KB gzip in the SW; no CSS nesting (§9) |
| Schema validation | Valibot 1.5.0 | High | T-1.1: 2.5 KB gzip for the manifest schema vs Zod 92.7 KB (§9) |
| Backend | Workers + R2, later D1 | High for Phase A | Phase B auth library is re-verified at M9 |
| Alternatives considered | Supabase, Firebase, PocketBase on a VPS | — | Not needed: Phase A is static files plus one Worker |

## 8. Open technical questions

1. ~~Can adapter `navigationEvents` (site-specific DOM events like `yt-navigate-finish`) be listened to from the isolated world?~~ Yes, confirmed in T-2.2 (§5.2).
2. A cheap logged-out canary for X (most pages need login). Answer by M8.
3. ~~Whether the compiler (css-tree) fits comfortably in the service worker bundle (T-1.2).~~ Yes: ~23.5 KB gzip with subpath imports (§9).
4. When css-tree supports CSS nesting, should v1.1 allow nested rules? Watch css-tree releases (T-5.9).

## 9. Engine spike results (T-1.1, T-1.2, done 2026-11-19)

Measured locally on 2026-11-19 (Node 24.2.0, esbuild minify, `gzip -9`).

**Validation library (T-1.1, D-025).** Same template-manifest schema written three ways and bundled for the browser:

| Library | Minified | Gzip |
|---|---|---|
| Valibot 1.5.0 | 7.1 KB | 2.5 KB |
| Zod 4 Mini (`zod/mini` 4.6.7) | 23.0 KB | 7.6 KB |
| Zod 4 (`zod` 4.6.7) | 454.8 KB | 92.7 KB |

Valibot also has `@valibot/to-json-schema` 1.8.0 for the editor schema. `check()` rules are skipped in the JSON Schema (`errorMode: 'ignore'`); `toJsonSchema` doesn't emit `$schema`, so the generator adds it.

**css-tree 3.2.1 (T-1.2, D-026).** Docs via Context7 (`/csstree/csstree`), behaviour checked with spike scripts:

- Bundle: the package root is 200.6 KB min / 56.2 KB gzip (it pulls in the lexer and syntax data). Importing only `css-tree/parser`, `/walker`, `/generator`, `/tokenizer`, `/utils` is 81.0 KB min / 23.5 KB gzip. `@types/css-tree` 3.2.0 only types the root, so `packages/compiler/src/css/css-tree-subpaths.d.ts` re-declares the subpaths.
- `:--name` parses as `PseudoClassSelector { name: "--name" }` everywhere, including inside `:not()`/`:has()`; splicing in `:is(<list>)` and regenerating works.
- `token(color.bg)` is a parse error (the value falls back to an opaque `Raw` node); `token(color-bg)` parses as a function with one identifier.
- With `parseAtrulePrelude: false`, unknown at-rules (`@setting density = compact`, `@setting !x`) keep a `Raw` prelude and a parsed block, with no errors. With the default (`true`), those preludes are parse errors.
- Escapes are **not decoded** in names: `@\69mport` is an at-rule named `\69mport`, `b\61ckground` a property with a backslash. `u\72l(…)` and `\75rl(…)` are parse errors (value becomes `Raw`). `URL(…)` is a normal `Url` node.
- Error recovery wraps unparseable input in `Raw` nodes (e.g. `--x: {a:b}`), which a tree walk can't inspect, so the sanitizer fails any file with parse errors.
- **No CSS nesting:** `.a { color: red; .b { … } }` is a parse error ("Identifier is expected").
- `image-set("…")` takes URLs as plain `String` nodes, so blocking `Url` nodes alone isn't enough; the sanitizer allowlists value functions.

**Compile performance (T-1.6).** 256 KB of generated dialect CSS (~2 400 rules, one component and `token()` each): ~60–75 ms warm per compile on the dev machine. The first version took ~200 ms; the culprit was a quadratic backslash scan (`indexOf` from every token start), fixed by tracking the next backslash. CI allows 250 ms to absorb slower runners.

**Node type stripping.** Node 24.2 runs the `.ts` sources directly (CLI, JSON Schema script) with an `ExperimentalWarning`, silenced with `--disable-warning=ExperimentalWarning`. Relative imports therefore use `.ts` extensions in `packages/` (D-027).

**Vitest gotcha.** `import x from './file.css?raw'` returns an empty string under Vitest (CSS isn't processed by default), so compiler tests read fixtures with `node:fs` from `test/`, which has its own Node-typed tsconfig.

