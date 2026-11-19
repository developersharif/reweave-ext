# User Flows & UX Structure

Scope: MVP flows first (marked **MVP**), later flows marked with their milestone. Surfaces: **Extension** (popup, in-page panel, options page) and **Web** (marketplace site). Terminology: *template* = a community redesign; *adapter* = platform-maintained site map; *palette* = token set. See [`../architecture/template-schema.md`](../architecture/template-schema.md).

## 0. What lives where

| Capability | Extension | Web | Why |
|---|---|---|---|
| Apply / switch / disable template on current site | ✅ popup | — | Must be one click from the page |
| Quick settings (toggles, sliders, variant, palette) | ✅ popup | — | Instant feedback on the live page |
| "This looks broken" report | ✅ popup | — | Has the context (adapter version, failing probes) |
| Discover, search, preview, template detail | Small "Top 3 for this site" list | ✅ primary | SEO, screenshots, reviews need a real web page |
| Install | Receives install from web via extension messaging | ✅ "Install" button | One canonical install path |
| Library (installed templates, per-site assignment) | ✅ options page | ✅ (synced, M9) | Works offline; web mirrors when signed in |
| Creator: live editing on the real site | ✅ in-page panel (Creator mode) | — | Needs the real DOM |
| Creator: metadata, previews, publish, versions, stats | — | ✅ creator dashboard | Forms, uploads, analytics belong on the web |
| Account, billing | — | ✅ | Payments must never run inside the extension |

Rule of thumb: **the extension is for the page you're on; the web is for everything else.**

---

## 1. First run (MVP)

1. User installs from Chrome Web Store → onboarding tab opens (MVP-1: the extension's own `welcome.html`; from M7: the website's `/welcome`).
2. Welcome page: "Pick the sites you want to change" — cards for each supported site (MVP: 2–3 sites).
3. Clicking a site requests **optional host permission** for that site only (`permissions.request`). Clear copy: "Lets us restyle youtube.com. We never read your data or send your browsing history anywhere."
4. Shows 3 curated templates for that site with before/after previews → "Try it" opens the site with the template applied.
5. Success state on the site: a small, dismissible in-page toast "Minimal YouTube is on · Settings · Undo" (shown once).

Acceptance: a new user goes from install to a restyled site in ≤ 4 clicks, with a permission prompt scoped to one site.

Built in M3 (T-3.6, D-037): the welcome page preselects every supported site; one "Allow access" button asks for all selected sites in a single prompt. Then one card per bundled template, with its cover and a "Before and after" disclosure, and "Try it" opens the site with it applied. That makes three clicks plus the prompt. The in-page toast (step 5) is not built: it would add DOM to the page (security-model T8), so the popup is the place to change or undo.

## 2. Browse & install from the web (M7)

1. `/` → Discover: sections "For YouTube", "For Reddit", "Focus", "Trending this week" (trending = installs, M7).
2. Template detail `/t/:owner/:slug`: cover + before/after slider, compatibility badge (Working / Partially working / Broken / Unverified + last verified date), settings list, version history, license, creator, install count (M7), reviews (M9).
3. "Install" → if extension present (detected via `externally_connectable` ping), sends install message → extension verifies signed bundle → asks for host permission if not granted → confirms on the web page ("Installed. Open YouTube").
4. If extension absent: "Get the extension" CTA, template id carried through onboarding so it installs after first run.

## 3. Popup on a supported site (MVP)

```
┌───────────────────────────────┐
│ youtube.com          ● On  [⏻] │
│ ─────────────────────────────  │
│ Minimal YouTube  v1.2  ✓ Works │
│ [Variant: Deep focus ▾]        │
│ ☑ Hide Shorts                  │
│ ☐ Hide homepage feed           │
│ Density  ( Compact | Comfy )   │
│ Width   ──────●──── 1200px     │
│ Palette [Default ▾]            │
│ ─────────────────────────────  │
│ Switch template ▸              │
│   Original site                │
│   Compact YouTube              │
│   + Browse more for YouTube ↗  │
│ ─────────────────────────────  │
│ ⚑ Looks broken?   ✎ Creator mode│
└───────────────────────────────┘
```

- **Active-site detection:** popup matches the tab URL against the supported sites. States: *Supported & enabled*, *Supported, permission not granted* ("Enable on youtube.com"), *Not supported* ("We don't support this site yet — vote for it ↗"), *Sensitive route* ("Templates are paused on this page").
  - Without the `tabs` permission, the browser hides the URL of sites we can't access yet. Then the popup lists the supported sites that still need enabling, each with an "Enable" button (D-032).
- **Toggle** = per-site enable/disable. **Global pause** sits in the popup footer until the options page exists (M3). Changes apply live without reload (style swap).
- Built in M2 (T-2.7): detection states, toggle, template switch, variant, settings, reset. M3: health badge ("Works here" / "May be broken (n parts not found)" / "Colours may not apply"), palette picker ("Colours", shown for token-aware templates), "Looks broken?" link. Later: browse more (M7), Creator mode (M5).
- **Switch template** lists installed templates for this adapter + "Original site".
- **Looks broken?** M3: opens a new GitHub issue prefilled with template id/version, adapter id/version, parts not found, extension version and browser name; the user describes the problem and submits it on GitHub (D-036). M8: a one-screen form that shows exactly what will be sent. Never a URL, and no screenshot unless the user attaches one manually.

## 4. Popup on an unsupported site (MVP)

Shows "Not supported yet" + "Request this site" (counts a vote: hostname only, opt-in) + link to supported-site list. Optional (M5 stretch, T-5.8): "Start a local style for this site" (raw-CSS Creator mode without adapter).

## 5. Library / options page (M3; account sync M9)

- Per site: access (an "Allow access" button when missing), enabled state, template, variant, colours (palette), settings reset.
- Templates: every installed template with its authors and sites; "Import template (.zip)"; "Uninstall" for imported ones (bundled ones can't be removed). Sites using an uninstalled template go back to "Original site".
- Backup: "Export library" saves a JSON file (sites, choices, settings, imported templates; no browsing data); "Import library" asks before replacing the current library.
- Global: pause all. Later: update channel (stable only in MVP), telemetry opt-in toggles (M8), sign in (M9).
- Choices and settings also follow the user through their browser's own sync (D-035); site access is granted per browser.

## 6. Creator mode / Studio (M5)

MVP-level creator tooling is deliberately small. Creators start from a **starter template** (fork of a curated one) rather than a blank canvas.

1. Popup → "Creator mode" → in-page side panel (shadow-DOM UI) opens on the current site.
2. **Element picker:** hover highlights the nearest *adapter component* (label "video-card", "related-sidebar") — not raw DOM nodes. Click inserts `:--video-card { }` into the editor. Holding Alt picks raw elements and warns "fragile selector".
3. **Editor:** CodeMirror 6 with authoring-dialect autocomplete (component names, `token()`, settings), inline diagnostics from the shared validator (same codes as the server).
4. **Tokens panel:** edit standard tokens with color pickers; preview palettes.
5. **Settings builder (later):** add boolean/select/range settings via form → writes manifest.
6. **Live preview:** every keystroke recompiles and swaps the stylesheet (debounced 150 ms). Route switcher shows which route-scoped files apply.
7. **Responsive check (later):** buttons to resize the window to common widths (uses `chrome.windows.update`); no fake device frames.
8. **Save locally** (always), **Export** `.zip`, **Publish** → M7: export a PR-ready folder for the public templates repo (D-019); M9: upload to the web creator dashboard.

Explicitly not in early releases: drag-and-drop layout builder, AI generation, multi-site template editing in one session, collaborative editing.

## 7. Publish (M7 via GitHub PR; the web flow below arrives in M9)

1. Web `/create/new` (or arrival from Creator mode with draft) → upload or receive bundle.
2. Automatic validation report (errors block, warnings shown, review flags explained).
3. Fill metadata: name, summary, category, tags, license (default MIT), previews (cover required; guidance to blur personal data).
4. Checklist: "I made this or have the right to publish it", "No personal data in screenshots", "Name doesn't imply official affiliation".
5. Submit → status *In review* (MVP: manual review by founder; target < 48 h) → *Published* (signed, listed) or *Changes requested* with reasons.
6. New versions: upload → diff view (CSS diff + manifest diff) → review (lighter for PATCH if no flagged rules) → published; installed users auto-update.

## 8. Creator dashboard (M9)

- Templates list with status, current version, compatibility badge.
- Per template: versions, review history, installs (daily aggregate), active installs (weekly aggregate from update checks), breakage reports grouped by adapter component.
- Profile: handle, display name, avatar, links (M5: tip/sponsor link).

## 9. Web information architecture

| Route | Purpose | Milestone |
|---|---|---|
| `/` | Hero ("Your favorite sites, redesigned by the community"), supported sites, curated picks | M7 |
| `/sites/:adapter` | All templates for a site, filters (category, status), site request count | M7 |
| `/t/:owner/:slug` | Template detail | M7 |
| `/t/:owner/:slug/versions` | Changelog, diffs | M7 |
| `/search?q=` | Static client-side index (M7); D1 FTS (M9) | M7 |
| `/u/:handle` | Creator profile | M7 |
| `/collections/:slug` | Curated collections (staff-picked) | M9 |
| `/library` | Signed-in user's installed templates (synced) | M9 |
| `/create`, `/dashboard` | Creator tools | M9 |
| `/welcome`, `/privacy`, `/terms`, `/content-policy`, `/dmca` | Onboarding & legal (privacy/terms needed for M6) | M6–M7 |
| `/status` | Adapter health per site (public) | M8 |

## 10. Key UX principles

1. **Undo is always one click** ("Original site" in popup; global pause in toolbar context menu).
2. **Never surprise-break a page:** if probes fail on a route, show a subtle badge in the popup instead of leaving a half-styled page; optionally auto-disable cover-route styles when core components are missing.
3. **Honest compatibility:** badges with last-verified dates, not five-star vanity.
4. **Permission minimalism:** per-site optional permissions, explained in plain language, requested at the moment of value.
5. **No dark patterns** in upgrade prompts (relevant once Pro exists).
