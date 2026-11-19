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

## 5. Injection spike results (T-2.1, to fill)

| Metric | adoptedStyleSheets | `<style>` fallback |
|---|---|---|
| `document_start` → styles applied (median / p95) | | |
| Visible flash of the original layout, normal CPU (n loads) | | |
| Visible flash, 4× CPU throttle (n loads) | | |
| Page overwrote our sheets? | | |
| Behavior after back/forward cache restore | | |

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

1. Can adapter `navigationEvents` (site-specific DOM events like `yt-navigate-finish`) be listened to from the isolated world? They are DOM events, so they should be. Confirm in T-2.2.
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

