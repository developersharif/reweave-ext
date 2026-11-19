# Technical Research

**Status: partial, and designed to be completed by spike tasks.** The broad technical pass was stopped before it wrote results.
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

## 3. Chrome platform facts (T-0.3, to fill)

| Question | Answer | Source / date |
|---|---|---|
| `storage.local` quota; effect of `unlimitedStorage` | | |
| `storage.sync` total and per-item quotas; write rate limits | | |
| Does adding entries to `optional_host_permissions` in an update prompt or disable the extension? | | |
| `permissions.request` user-gesture requirements (popup, options, extension tab) | | |
| `scripting.registerContentScripts`: `persistAcrossSessions`, `runAt: document_start`, `matchOriginAsFallback`, `world`, limits | | |
| Do runtime-registered scripts survive extension update and browser restart? | | |
| `URLPattern` support (Chrome/Firefox versions) | | |
| Navigation API (`navigation.currententrychange`) from a content script's isolated world | | |
| `chrome.dom.openOrClosedShadowRoot` availability | | |
| CWS developer registration fee and current review times | | |

## 4. WXT findings (T-0.2, to fill)

- Version used and release date:
- Runtime content-script registration API:
- Shadow-root UI helper:
- i18n setup:
- Testing utilities (fake browser):
- Firefox build notes:
- Comparison with Plasmo / CRXJS maintenance status (brief, only if WXT shows problems):

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
| Extension framework | WXT | Medium. Not re-verified in this session | T-0.2 confirms; switching later is costly, so verify first |
| UI | React + TS | Medium | D-007 is Proposed; Vue is equally viable |
| Content script | Vanilla TS | High | Size and perf budget |
| CSS parser | css-tree | Medium | T-1.2 checks parse support for the authoring syntax and bundle size |
| Backend | Workers + R2, later D1 | High for Phase A | Phase B auth library is re-verified at M9 |
| Alternatives considered | Supabase, Firebase, PocketBase on a VPS | — | Not needed: Phase A is static files plus one Worker |

## 8. Open technical questions

1. Can adapter `navigationEvents` (site-specific DOM events like `yt-navigate-finish`) be listened to from the isolated world? They are DOM events, so they should be. Confirm in T-2.2.
2. A cheap logged-out canary for X (most pages need login). Answer by M8.
3. Whether the compiler (css-tree) fits comfortably in the service worker bundle (T-1.2).
