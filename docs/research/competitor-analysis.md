# Competitor Analysis: Community Website-Redesign Templates (Extension + Marketplace)

- **Date of research:** 2026-11-19. All URLs below were accessed 2026-11-19 unless a different date is stated.
- **Product under evaluation (not built yet):** a browser extension plus web platform. Users apply community-made "redesign templates" to existing sites such as YouTube, Facebook, X, Reddit and LinkedIn. Templates cover:
  - layout restructuring, element hiding and typography;
  - URL rules and element selectors;
  - user settings, variations, compatibility info and versioning.

  The platform adds discovery, preview, install, ratings, creator profiles and possibly paid templates.
- **Method:**
  - Live Chrome Web Store (CWS) listing pages, the Firefox Add-ons (AMO) v5 API, Microsoft Edge Add-ons API, Apple iTunes lookup API and authenticated GitHub API (`gh api`).
  - Vendor docs, changelogs, release notes, source code and GitHub issues.
  - Store reviews (CWS and AMO ratings API).
  - Press and blog coverage.
  - Some manifests were checked by downloading the CRX package.
- **How to read the numbers:**
  - CWS rounds user counts (e.g. "1,000,000 users").
  - AMO's figure is `average_daily_users` (ADU), which is not installs.
  - GitHub "open issues" includes PRs.

**Labels used throughout**
- **Fact**: read directly in the cited source.
- **Fact (snippet)**: seen only in a search-result excerpt, not the full page. Weaker.
- **Assumption**: our inference or estimate.
- **Recommendation**: what we suggest the founder do.
- **Unverified**: we could not confirm it; the reason is given.
- **⚠ stale**: the source is more than about 2 years old (before ~Nov 2024) and may no longer hold.

---

## 0. Bottom line (read this first)

1. **The core mechanism is a free, open, commoditized standard.**
   - **Fact:** Stylus's UserCSS already provides the full core feature set ([Writing UserCSS](https://github.com/openstyles/stylus/wiki/Writing-UserCSS) (accessed 2026-11-19)):
     - URL-scoped CSS (`@-moz-document`);
     - typed user settings (`@var text|color|checkbox|select|range|number`);
     - preprocessors (Less/Stylus);
     - versioned auto-update (`@version`, `@updateURL`).
   - Stylus has 1M Chrome users and 137K Firefox ADU, and "collects nothing" ([CWS](https://chromewebstore.google.com/detail/clngdbkpkpeebahjckkjfobafhncgmne) (accessed 2026-11-19); [AMO API](https://addons.mozilla.org/api/v5/addons/addon/styl-us/) (accessed 2026-11-19)).
   - "Templates with settings and URL rules" is therefore not a differentiator on its own.
2. **Marketplaces exist, but none is good.**
   - userstyles.org (Similarweb) is big but carries a data-collection stigma.
   - UserStyles.world is donation-funded on roughly $75/yr, with messy taxonomy and inflated install counts.
   - Greasy Fork covers scripts, and is not design-oriented.
   - The Stylebot Gallery launched in October 2026 and covers 31 sites.
   - None offers real before/after previews, compatibility status, or creator payouts.
   - Evidence is in §3.1–3.2.
3. **The most dangerous direct competitor is Stylebot v4 (Oct–Nov 2026), not Stylish.**
   - **Fact:** In six weeks Stylebot shipped ([releases](https://github.com/ankit/stylebot/releases) (accessed 2026-11-19)):
     - "selectors that keep working when a site updates";
     - per-site profiles, which give multiple looks per site;
     - a Gallery with in-popup preview, install and auto-update;
     - UserCSS `@var` options;
     - a coding-agent CLI.
   - It has 200K Chrome users and a 16-year-old brand.
   - It is roughly the founder's product minus ratings, payments and compatibility tracking.
4. **AI "restyle any site" tools are the second front.** See §3.3 for products and numbers. Incumbents are also wiring in AI:
   - **Fact:** Tampermonkey 5.5.0 (2026-05-08) and Violentmonkey 2.50.0 added MCP support for AI tools ([TM changelog](https://www.tampermonkey.net/changelog.php?more=true&old=&show=dhdg) (accessed 2026-11-19); [VM v2.50.0](https://github.com/violentmonkey/violentmonkey/releases/tag/v2.50.0) (accessed 2026-11-19)).
   - Stylebot ships an agent CLI and a Claude Code plugin.
5. **The genuine gaps are operational, not format-level.** They are detailed in §6:
   - (a) compatibility and breakage tracking as a first-class product;
   - (b) a trustworthy, curated, preview-first catalog for mainstream users;
   - (c) layout restructuring delivered as declarative data, so it avoids Chrome's userScripts toggle;
   - (d) cross-site design tokens beyond Catppuccin's palette-only model;
   - (e) creator economics, which nobody has solved and which may not be solvable.

---

## 1. Market map

| Category | Players examined | What they prove |
|---|---|---|
| CSS userstyle managers | Stylus, Stylebot, Stylish, Cascadea (Safari), xStyle (dead), FireMonkey | Injection, URL rules, settings and update checking are solved and free |
| Userstyle repositories | userstyles.org, USO Archive, UserStyles.world, Stylebot Gallery, Greasy Fork (`.user.css`), Catppuccin monorepo | Distribution exists; quality, curation and moderation are weak |
| Userscript managers | Tampermonkey, Violentmonkey, Greasemonkey, FireMonkey, Userscripts (Safari), ScriptCat | Full DOM restructuring is possible but sits behind Chrome's "Allow User Scripts" friction |
| Userscript repositories | Greasy Fork, OpenUserJS, scriptcat.org | By-site search, install stats, ratings, webhooks, monetization disclosure (`@antifeature`) |
| Per-site fix databases | Dark Reader `dynamic-theme-fixes.config`, News Feed Eradicator lists, SponsorBlock | Crowdsourced per-site maintenance works when it is centralized and versioned |
| AI site modifiers | see §3.3 | Natural-language restyling; threatens "templates" as a concept |
| Browser-native | Arc Boosts → Dia, Opera GX, Vivaldi, Edge, Chrome, Zen | Browsers try this and then abandon it or limit it to browser chrome (see §3.4) |
| Visual editors | VisBug (archived), CSS Scan, Magic CSS, Stylebot | Point-and-click editing exists; persistence and sharing are weak |
| Site-specific redesigners | Enhancer for YouTube, Unhook, ImprovedTube, BlockTube, Control Panel for Twitter, Old Twitter Layout, Minimal Twitter, RES, Social Fixer, F.B. Purity, News Feed Eradicator | Demand is real (millions of users) but concentrated on YouTube, X and Reddit; breakage and legal risk are constant |
| Analogous theme ecosystems | BetterDiscord, Vencord, Spicetify, Obsidian themes, VS Code, Firefox Color, Notion templates | How theme marketplaces handle host updates, malware and monetization |

---

## 2. Snapshot numbers (all accessed 2026-11-19)

**Fact** unless marked. CWS figures are from the listing pages and AMO figures from the v5 API. GitHub figures are stars, open issues (including PRs) and last push.

| Product | CWS users / rating (n) | AMO ADU / rating (n) | GitHub | Last update |
|---|---|---|---|---|
| Stylus | 1,000,000 / 4.5 (1.3K) | 137,214 / 4.67 (1,225) | openstyles/stylus 7,019★, 93 open, GPL-3.0 | AMO 2026-11-15 |
| Stylebot | 200,000 / 4.2 (1.7K) | 12,567 / 4.68 (119) | ankit/stylebot 1,717★, MIT | 2026-11-10 |
| Stylish (Similarweb) | 2,000,000 / 4.5 (22.3K) | 20,582 / **2.73** (980) | closed | CWS 2026-11-17; AMO frozen 2024-04-25 |
| Dark Reader | 7,000,000 / 4.3 (13.3K) | 1,363,136 / 4.48 (6,996) | 22,602★, 1,464 open, MIT | 2026-11-06 |
| Tampermonkey | 12,000,000 / 4.8 (73.1K); Edge 13.9M | 836,938 / 4.70 (5,335) | closed since v2.9 (old repo 5,899★) | CWS 2026-10-04 |
| Violentmonkey | 900,000 / 4.6 (753) | 209,801 / 4.73 (813) | 9,211★, MIT | 2026-10-27 |
| ScriptCat | 100K / 4.5 (76); Edge 2.28M | 12,964 / 4.70 (113) | 5,926★, GPL-3.0 | 2026-11-16 |
| Greasemonkey | n/a (Firefox only) | 155,989 / 4.19 (1,295) | 2,615★ | 2026-06-08 |
| FireMonkey | n/a | 1,822 / 4.5 (90) | 196★ | 2026-11-15 |
| Userscripts (Safari) | App Store 4.32 (192 US) | n/a | quoid/userscripts 4,931★, Swift | 2026-01-11 |
| Greasy Fork (site) | n/a | n/a | greasyfork-org/greasyfork 2,162★, Rails | 2026-11-19 |
| OpenUserJS (site) | n/a | n/a | 1,014★ | 2026-09-19 |
| UserStyles.world (site) | n/a | n/a | 458★, 101 open, Go, AGPL | 2026-09-09 (feature work stalled since 2025-04) |
| Catppuccin userstyles | n/a | n/a | 1,151★, 136 ports | 2026-11-19 |
| Firefox Color | n/a | 117,413 / 4.39 (1,451) | 511★ | **2020-09-24** ⚠ |
| VisBug | 200,000 / 4.6 (282) | 2,272 / 5.0 (35) | 5,764★, **archived** | CWS 2024-11-20 |
| CSS Scan | 10,000 / 3.3 (101) | n/a | closed | 2026-04-16 |
| Magic CSS | 60,000 / 4.6 (280) | n/a | — | 2024-07-24 ⚠ |

Sources:
- CWS: [Stylus](https://chromewebstore.google.com/detail/clngdbkpkpeebahjckkjfobafhncgmne), [Stylebot](https://chromewebstore.google.com/detail/oiaejidbmkiecgbjeifoejpgmdaleoha), [Stylish](https://chromewebstore.google.com/detail/fjnbnpbmkenffdnngjfgmeleoegfcffe), [Dark Reader](https://chromewebstore.google.com/detail/eimadpbcbfnmbkopoojfekhnkhdbieeh), [Tampermonkey](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo), [Violentmonkey](https://chromewebstore.google.com/detail/jinjaccalgkegednnccohejagnlnfdag), [ScriptCat](https://chromewebstore.google.com/detail/ndcooeababalnlpkfedmmbbbgkljhpjf), [VisBug](https://chromewebstore.google.com/detail/cdockenadnadldjbbgcallicgledbeoc), [CSS Scan](https://chromewebstore.google.com/detail/gieabiemggnpnminflinemaickipbebg), [Magic CSS](https://chromewebstore.google.com/detail/ifhikkcafabcgolfjegfcgloomalapol) (all accessed 2026-11-19).
- AMO: `https://addons.mozilla.org/api/v5/addons/addon/<slug>/` for slugs styl-us, stylebot-web, stylish, darkreader, tampermonkey, violentmonkey, scriptcat, greasemonkey, firemonkey, firefox-color, visbug (accessed 2026-11-19).
- Edge: [TM](https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/iikmkjmpaadaobahmlepeloendndfphd), [ScriptCat](https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/liilgpjgabokdklappibcjfablkpcekh) (accessed 2026-11-19).
- Apple: [Userscripts](https://itunes.apple.com/lookup?id=1463298887&country=us) (accessed 2026-11-19).
- GitHub: `gh api repos/<owner>/<repo>` (accessed 2026-11-19).

**Assumption:** CWS counts for extensions that were hit by MV3 migrations (Violentmonkey, ScriptCat) are distorted by delisting and reinstall churn. Do not read the ScriptCat Chrome versus Edge gap (100K vs 2.28M) as market share.

---

## 3. Competitor profiles

Each profile follows the 10 requested dimensions:
1. Function
2. Audience
3. Distribution
4. Customization
5. Creator experience
6. Marketplace
7. Monetization
8. Complaints
9. Architecture
10. Strengths and weaknesses

Minor players are compressed.

### 3.1 CSS userstyle ecosystem

#### Stylus (openstyles/stylus): the de-facto standard engine

1. **Function (Fact).** A userstyle manager and editor, forked from Stylish to remove analytics ([README](https://github.com/openstyles/stylus) (accessed 2026-11-19)).
2. **Audience.**
   - **Assumption:** power users and the privacy-conscious.
   - **Fact:** it is the only manager Catppuccin supports (usage docs, §3.1), and USw's publishing flow is built around it (USw FAQ).
3. **Distribution (Fact).** Stylus has no store of its own. Its popup "Find styles" downloads two third-party indexes ([search.js](https://github.com/openstyles/stylus/blob/master/src/popup/search.js) (accessed 2026-11-19)):
   - the USO-archive `search-index.json`, via jsDelivr then GitHub raw;
   - `userstyles.world/api/index/uso-format`.

   It also links out to userstyles.org, uso.kkx.one, USw and Greasy Fork.
   - **Fact (observed 2026-11-19):** jsDelivr refused the USO index ("Package size exceeded… 50 MB") and the request fell back to GitHub raw. Discovery depends on free CDNs.
4. **Customization (Fact).** UserCSS `==UserStyle==` metadata:
   - `@name`, `@namespace` and `@version` are required;
   - `@var` types: `text`, `color`, `checkbox`, `select`, `range`, `number`;
   - `@preprocessor`: `default`, `uso`, `less`, `stylus`;
   - `@updateURL`;
   - URL scoping with `@-moz-document`, using `domain()` and `url-prefix()`, which appear in USw examples.

   Auto-update checks run every 24h by default ([wiki](https://github.com/openstyles/stylus/wiki/Writing-UserCSS); [prefs.js](https://github.com/openstyles/stylus/blob/master/src/js/prefs.js) (accessed 2026-11-19)).
   - **Unverified:** the exact list of `@-moz-document` functions (`url()`, `regexp()`) is not on the wiki page we read. The wider ecosystem widely assumes it.
5. **Creator experience (Fact).**
   - The editor has CSSLint/Stylelint and live reload from an external IDE.
   - Creators can publish to USw directly from Stylus ([USw FAQ](https://userstyles.world/docs/faq) (accessed 2026-11-19)).
   - The workflow is code-first. There is no visual editor.
6. **Marketplace.** None of its own. Inline search shows a screenshot grid from third-party indexes.
7. **Monetization (Fact).** None. The privacy policy reads "Stylus collects nothing. Period." ([CWS](https://chromewebstore.google.com/detail/clngdbkpkpeebahjckkjfobafhncgmne) (accessed 2026-11-19)).
8. **Complaints (Fact).**
   - In January 2025 a maintainer accidentally unpublished Stylus from CWS ([#1878](https://github.com/openstyles/stylus/issues/1878) (accessed 2026-11-19)).
   - Firefox Android was broken for about a week in February 2025 ([#1912](https://github.com/openstyles/stylus/issues/1912) (accessed 2026-11-19); [AMO review](https://addons.mozilla.org/api/v5/ratings/rating/2175633/) (accessed 2026-11-19)).
   - Sync fails with Google Drive and OneDrive 403 errors ([#1999](https://github.com/openstyles/stylus/issues/1999), [#1853](https://github.com/openstyles/stylus/issues/1853) (accessed 2026-11-19)).
   - In v2.3.3, the MV3 performance cache caused "no styles" bugs and had to be rolled back ([releases](https://github.com/openstyles/stylus/releases) (accessed 2026-11-19)).
9. **Architecture (Fact).**
   - GPL-3.0 JavaScript. The CWS build is MV3, needs Chrome 128+ and runs a service worker; the Firefox build is MV2 ([manifest-mv3.json](https://github.com/openstyles/stylus/blob/master/src/manifest-mv3.json) (accessed 2026-11-19)).
   - Injection: a content script (`apply.js`) runs at `document_start` in all frames. It inserts `<style>` elements, or uses `adoptedStyleSheets` on pages with a strict CSP ([style-injector.js](https://github.com/openstyles/stylus/blob/master/src/content/style-injector.js) (accessed 2026-11-19)).
   - Sync targets: Dropbox, Google Drive, OneDrive, WebDAV, and since v2.4.15 GitHub/Gitea/Forgejo ([sync-util.js](https://github.com/openstyles/stylus/blob/master/src/js/sync-util.js) (accessed 2026-11-19)).
   - **Assumption:** because styles are CSS (data), Stylus does not need the Chrome userScripts toggle. This is the key architectural advantage the founder should copy.
10. **Strengths and weaknesses.**
    - Strengths: trust, an open format, editor quality, sync options.
    - Weaknesses: no discovery of its own, power-user UX, a tiny maintainer team, no compatibility signal.

#### Stylebot (ankit/stylebot): closest feature competitor as of Nov 2026

1. **Function (Fact).** A point-and-click CSS editor (also Monaco code), with Readability and Grayscale presets and Google Drive sync ([README](https://github.com/ankit/stylebot) (accessed 2026-11-19)).
   - **v4.0.0 (2026-10-11):**
     - "selectors that keep working when a site updates, with alternatives to choose from";
     - **profiles** (several looks per site);
     - a side-panel editor;
     - BYO-key AI chat. Chat was removed in v4.0.2 in favour of a `stylebot` CLI for coding agents ([PR #1190](https://github.com/ankit/stylebot/pull/1190) (accessed 2026-11-19)).
   - **v4.1.0 (2026-10-28):** a **Gallery**: "find, preview and install styles for the site you're on from the popup, and publish your own to gallery.stylebot.dev. Styles installed from the Gallery stay up to date until you edit them."
   - **v4.2.0:** CLI mode, in which "mark areas of the page and write notes" hands the task to a coding agent, and every change can be undone.
   - **v4.3.0:** UserCSS `@var select`/`@var checkbox` options.
   - **v4.4.0:** preview every Gallery style for a site in popup cards.
   - Source: [releases](https://github.com/ankit/stylebot/releases) (accessed 2026-11-19).
2. **Audience (Assumption).** Non-coders who want to tweak a site. This is the mainstream segment the founder is targeting.
3. **Distribution (Fact).** CWS, AMO, Edge and Safari (App Store). Gallery at gallery.stylebot.dev.
4. **Customization (Fact).** Visual controls (font weight, colors, hide), raw CSS, `@var` options, light/dark switch, profiles.
5. **Creator experience (Fact).** In-extension visual editor, then publish to the Gallery. Creator profile pages exist ([gallery](https://gallery.stylebot.dev/) (accessed 2026-11-19)).
6. **Marketplace (Fact).**
   - The Gallery lists **31 sites**: youtube.com, google.com, chatgpt.com, x.com, reddit.com, github.com and others.
   - It shows **no ratings, install counts, prices, compatibility or version info** ([gallery sites](https://gallery.stylebot.dev/sites) (accessed 2026-11-19)).
   - Many YouTube styles are by the developer, "ankit".
7. **Monetization (Fact).** Ko-fi donations only (README).
8. **Complaints (Fact).** The v4 overhaul drew a backlash:
   - "turned it into vibecoded AI slop" (AMO 1★, 2026-10-11) ([rating](https://addons.mozilla.org/api/v5/ratings/rating/2766739/) (accessed 2026-11-19));
   - issue #1183, which asks for the previous version: "zero interest in using a bloated extension built around a chatbot." It also reports Arc and Vivaldi breakage ([#1183](https://github.com/ankit/stylebot/issues/1183) (accessed 2026-11-19)).
9. **Architecture (Fact).** MIT TypeScript, MV3 (manifest checked in the CRX). Created 2010. Host permission for drive.google.com (sync).
10. **Strengths and weaknesses.**
    - Strengths: a visual editor plus a Gallery plus options plus AI-agent tooling, all already shipped. Brand. Cross-browser including Safari.
    - Weaknesses: a single maintainer, a tiny gallery with no social proof, and a user-trust dent from the AI pivot.
    - Precedent: "Stylebot Social" (stylebot.me), a sharing site from around 2013, no longer exists (v2 release notes, ⚠ stale). Stylebot has tried this before and let it die.

#### Stylish + userstyles.org: largest install base, poisoned brand

- **History (Fact).**
  - Jason Barnabe released Stylish in 2005.
  - In September 2016 he handed it to Justin Hindman. Wikipedia characterizes this as a straw purchase for SimilarWeb.
  - A SimilarWeb "partnership" was announced in January 2017.
  - In July 2018 Robert Heaton showed that Stylish "sends our complete browsing activity back to its servers, together with a unique identifier".
  - Google and Mozilla then pulled it and remotely uninstalled it.
  - It returned to AMO on 2018-08-16 and to CWS in November 2018, with an opt-in screen.
  - Sources: [Wikipedia](https://en.wikipedia.org/wiki/Stylish_(software)) (accessed 2026-11-19); [Heaton, 2018-07-02](https://robertheaton.com/2018/07/02/stylish-browser-extension-steals-your-internet-history/) (accessed 2026-11-19) ⚠ stale, but foundational; [ghacks 2018](https://www.ghacks.net/2018/07/03/it-is-time-to-get-rid-of-stylish/) (accessed 2026-11-19) ⚠ stale.
- **Current status (Fact).**
  - CWS: 2,000,000 users, 4.5★ (22.3K), v3.7.2 updated 2026-11-17. Developer "Similarweb LTD", Givatayim, Israel; self-declared EU trader.
  - The listing still says: "To enable this service, we collect anonymous browsing data… including: All Host, tabs, webNavigation, webRequest… you can always turn this automatic data collection off" ([CWS](https://chromewebstore.google.com/detail/fjnbnpbmkenffdnngjfgmeleoegfcffe) (accessed 2026-11-19)).
  - AMO: 20,582 ADU, **2.73★**. The last update (2024-04-25) was only a re-sign ([AMO API](https://addons.mozilla.org/api/v5/addons/addon/stylish/) (accessed 2026-11-19)).
- **Privacy policy (Fact, last modified 2026-08-26).** "We are Similarweb." It collects browsing and clickstream data plus search terms, and "may 'sell' or 'share'" internet-activity data "to business customers" ([privacy policy](https://userstyles.org/privacy-policy) (accessed 2026-11-19)).
- **Marketplace (Fact).** userstyles.org is a live Next.js site with:
  - categories, screenshots and ratings;
  - `weeklyInstallsCount`, an `isPremium` flag, and a creator `paypalEmail` field.

  We parsed the homepage payload ([userstyles.org](https://userstyles.org/) (accessed 2026-11-19)):
  - 102 of 486 embedded styles had a PayPal donation email;
  - 6 had `isPremium:true`, all by "Stylish Team" and labelled "PRO STYLE";
  - the median weekly install count among those 486 was 8, and the maximum 1,427.
  - **Unverified:** what "Pro" costs or unlocks. No price or paywall was visible.
  - The content skews young and casual: Roblox, Hello Kitty and anime YouTube skins.
- **Newer features (Fact).**
  - "Shopping Selectors": Stylish adds stable semantic classes (`.stylish__viewed`, `.stylish__purchased`) to product cards on shopping sites, based on the user's browsing and purchase history ([help](https://userstyles.org/help/shopping-selectors) (accessed 2026-11-19)).
  - The site navigation shows "Build with AI Agent NEW". **Unverified:** `/help/build-with-ai` returned 404.
- **Open allegation (Unverified).** A June 2026 Chromium-extensions group post claims Stylish v3.4.15 can exfiltrate AI-chat content via remote config. We found no independent analysis or Google response ([thread](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/kq8vUDQ5Znc) (accessed 2026-11-19)). AMO reviews repeat it, e.g. "Israeli spyware distributed by Similarweb Ltd." (2026-06-03) ([rating](https://addons.mozilla.org/api/v5/ratings/rating/2717470/) (accessed 2026-11-19)).
- **Strengths and weaknesses.**
  - Strengths: reach (2M on Chrome), a large legacy catalog (about 127K styles per the USO archive index), SEO.
  - Weaknesses: the business model is data brokerage, which is incompatible with trust. Firefox is abandoned. Catalog quality is low.
- **Assumption:** Stylish proves mainstream demand for "skins for websites" and also shows how the category's reputation was damaged. A newcomer can win the trust argument against it, but must state its no-data-sale position explicitly.

#### USO Archive (uso-archive/data)

**Fact.**
- Daily auto-mirror of userstyles.org converted to UserCSS; 162★. The latest commit is 2026-11-19.
- The search index lists **126,676 styles**. The largest categories are tumblr (18.7K), global (15.8K), roblox (7.5K) and youtube (3.9K).
- It serves as the backend for Stylus inline search ([repo](https://github.com/uso-archive/data) (accessed 2026-11-19); [uso.kkx.one](https://uso.kkx.one) (accessed 2026-11-19)).

**Assumption:** most of these styles target old site DOMs and are broken. Volume is not quality.

#### UserStyles.world (USw): the open replacement, under-resourced

1. **Function (Fact).** An open-source userstyles.org replacement, Go/AGPL-3.0, 458★ ([repo](https://github.com/userstyles-world/userstyles.world) (accessed 2026-11-19)).
2. **Audience.** Stylus users and the FOSS community.
3. **Distribution (Fact).**
   - Login via GitHub, GitLab or Codeberg OAuth.
   - Import from the USO archive, GitHub, GitLab and Codeberg, with optional **source mirroring** that triggers when `@version` changes.
   - It rewrites `@updateURL` "to avoid… tracking".
   - It accepts UserCSS only ([FAQ](https://userstyles.world/docs/faq) (accessed 2026-11-19)).
4. **Customization.** Whatever UserCSS supports.
5. **Creator experience (Fact).** Publish or push updates straight from Stylus; mirror from git.
6. **Marketplace (Fact).**
   - Screenshots, views, weekly and total installs, 1–5 ratings.
   - The catalog has **25,845 styles by 12,290 authors**; only 1,534 have any rating, and 7,067 were updated in 2026 ([index API](https://userstyles.world/api/index/uso-format) (accessed 2026-11-19)).
   - The taxonomy is messy: "youtube" (678) and "youtube.com" (623) are separate categories.
   - The top install counts (about 2.8M each) appear to include update traffic. **Assumption** based on the FAQ's description of derived counts.
7. **Monetization (Fact).**
   - Donations only. The FAQ cites $6/month for the server ⚠ (April 2022 figure).
   - Open Collective shows 7 backers and `yearlyIncome` 7500, which is **Assumption: about $75/yr** if the unit is cents ([Open Collective](https://opencollective.com/userstyles.json) (accessed 2026-11-19)).
8. **Complaints (Fact).** Style rot is visible in the catalog itself:
   - "[DISCONTINUED] YouTube — Revert Watch Page Redesign… Because of the YouTube October '22 redesign, this style branch is now abandoned" ([style 5096](https://userstyles.world/style/5096) (accessed 2026-11-19));
   - "Youtube Watch Page Fix [No longer works]" ([style 4623](https://userstyles.world/style/4623) (accessed 2026-11-19)).
9. **Architecture (Fact).** Go with the Fiber framework. The last feature commit on `main` was 2025-04-11; since then only dependabot merges, while issues keep arriving (#405 on 2026-11-19).
10. **Strengths and weaknesses.**
    - Strengths: open, privacy-respecting, git-native.
    - Weaknesses: stalled development, no curation, inflated stats, no compatibility data, almost no money.

#### Catppuccin userstyles: the best model for cross-site design tokens

- **Fact.**
  - 1,151★ monorepo with **136 site ports**, each a `catppuccin.user.less`.
  - Each port exposes `@var select` options for light flavor, dark flavor and accent (15 accents), plus site-specific checkboxes.
  - Ports `@import` a shared library from `https://userstyles.catppuccin.com/lib/std/v1.less`.
  - Versions are dates, and `@updateURL` points at GitHub raw.
  - `@supportURL` goes to the issue tracker filtered by the port's label ([repo](https://github.com/catppuccin/userstyles) (accessed 2026-11-19); [YouTube port](https://github.com/catppuccin/userstyles/blob/main/styles/youtube/catppuccin.user.less) (accessed 2026-11-19)).
- **Distribution (Fact).**
  - A single `import.json` in Stylus backup format installs every port plus recommended Stylus settings.
  - Only Stylus is supported, and users are told to disable Dark Reader ([usage docs](https://github.com/catppuccin/userstyles/blob/main/docs/src/content/docs/getting-started/usage.mdx) (accessed 2026-11-19)).
- **Maintenance model (Fact).**
  - Each port has named maintainers in `userstyles.yml`, synced to CODEOWNERS by CI. 12 of 136 ports list no current maintainer.
  - New ports must "fully theme" the site because "maintainers come and go… If a userstyle isn't initially complete, it is unlikely that more of it will be completed later" ([reviewing guide](https://github.com/catppuccin/userstyles/blob/main/docs/src/content/docs/contributing/maintainers/reviewing.md) (accessed 2026-11-19)).
  - Breakage is reported by hand, e.g. #2364 (2026-11-08): "userstyle no longer matches after lingva.ml moved to Bootstrap 5".
  - We found **no automated selector-health checks** (absence not proven).
- **Monetization.** None (community project).
- **Strengths and weaknesses.**
  - It proves that a *design system applied across 136 sites with shared tokens* works and is wanted.
  - But it is one palette family, recolor-only (no layout), and has no settings UI outside Stylus.

#### Dark Reader: a per-site fix database with working monetization

1. **Function and audience (Fact).** An algorithmic dark mode for every site. 7M CWS users and 1.36M AMO ADU (see §2). Mass market.
2. **Per-site fix model (Fact).**
   - `src/config/dynamic-theme-fixes.config` is 843 KB, with about 2,948 URL blocks.
   - Each block uses the sections `INVERT`, `CSS`, `IGNORE INLINE STYLE` and `IGNORE IMAGE ANALYSIS`.
   - Contributors test in the built-in "Per Site Editor" dev tools and then open a GitHub PR.
   - Fixes ship **bundled** with releases. Live fetch from GitHub raw is opt-in (`syncSitesFixes: false`).
   - Community fix commits land almost daily (5 between Nov 16 and 19, 2026).
   - Sources: [CONTRIBUTING.md](https://github.com/darkreader/darkreader/blob/main/CONTRIBUTING.md), [defaults.ts](https://github.com/darkreader/darkreader/blob/main/src/defaults.ts) (accessed 2026-11-19).
3. **Monetization (Fact).**
   - Payment nags on the support page: one-time $9.99 for individuals (discounted to $4.99) and $19.99 per user for organizations ([support-us](https://darkreader.org/support-us/) (accessed 2026-11-19)).
   - "Dark Reader Plus" ("Premium themes & custom colors") costs $9.99 one-time and is built from a private module. The page says Plus is available for Microsoft Edge on Windows, macOS and Android, so the open-source code is open-core ([plus](https://darkreader.org/plus/) (accessed 2026-11-19)).
   - Open Collective lists 5,676 backers ([OC JSON](https://opencollective.com/darkreader.json) (accessed 2026-11-19)).
4. **Complaints (Fact).**
   - Performance: "will lag your browser to death" (AMO, 2026-10-01) ([rating](https://addons.mozilla.org/api/v5/ratings/rating/2754279/) (accessed 2026-11-19)).
   - Crashes: "Constant tab crashes and memory leaks" (2026-08-09) ([rating](https://addons.mozilla.org/api/v5/ratings/rating/2735538/) (accessed 2026-11-19)).
   - Phoning home: "it tries to phone home constantly" (2026-11-08) ([rating](https://addons.mozilla.org/api/v5/ratings/rating/2782787/) (accessed 2026-11-19)).
   - The repo has 1,464 open issues.
5. **Architecture (Fact).** MIT TypeScript, MV3 on Chrome. Permissions: `alarms`, `fontSettings`, `scripting`, `storage`, host access `*://*/*`.
6. **Lesson (Assumption).**
   - A *centralized, versioned, community-PR'd per-site fix file* is the only proven way to keep thousands of sites working.
   - It also shows that one-time payments of about $5–20 plus Plus themes can fund a mass-market cosmetic extension.

#### Minor CSS managers

- **Cascadea (Safari, Mac) (Fact).**
  - $2.99 one-time; supports UserCSS, per-site rules, iCloud sync and auto-update on launch.
  - The last version is 2.1.3 (2021-11-03), and there are too few ratings to display ([App Store](https://apps.apple.com/app/cascadea/id1432182561) (accessed 2026-11-19)) ⚠ stale; looks abandoned.
  - **Assumption:** a paid style manager is a tiny niche.
- **xStyle (Fact).** A Stylish fork with 176 AMO ADU, only re-signed since 2024. Dead ([AMO API](https://addons.mozilla.org/api/v5/addons/addon/xstyle/) (accessed 2026-11-19)).
- **Firefox Color (Fact).**
  - Mozilla's browser-chrome theme builder, not a web-page tool. 117,413 ADU.
  - The last release was 2020-09-24 and the last code commit 2022-03 ([AMO API](https://addons.mozilla.org/api/v5/addons/addon/firefox-color/); [repo](https://github.com/mozilla/FirefoxColor) (accessed 2026-11-19)).
  - Complaints: "most presets are obv broken… without previews" (2025-05-31) ([rating](https://addons.mozilla.org/api/v5/ratings/rating/2235576/) (accessed 2026-11-19)).
  - **Assumption:** Mozilla let a 117K-user theming tool rot. Vendor-run theming is not a priority for vendors.
- **Hyperweb (iOS Safari) (Fact).**
  - Free with an in-app subscription; site enhancements, dark mode, user scripts, shared auto-click rules; 4.6★ (about 1.5K).
  - The last update was v1.1.31 on 2023-03-21 ([App Store](https://apps.apple.com/us/app/id1581824571?l=en-us) (accessed 2026-11-19)) ⚠ stale.

### 3.2 Userscript ecosystem

#### Platform constraint first: Chrome's userScripts API

This governs any template that runs JS.
- **Fact (Chrome).**
  - Under MV3, user-supplied JS must run through `chrome.userScripts` (Chrome 120+).
  - From Chrome 138 users must flip a per-extension **"Allow User Scripts"** toggle; before 138 they needed Developer Mode. Without it, "`userScripts` is undefined".
  - New installs default to **off**.
  - Registered user scripts are cleared on extension update and must be re-registered.
  - Sources: [API docs](https://developer.chrome.com/docs/extensions/reference/api/userScripts) (accessed 2026-11-19); [Chrome blog, 2025-05-29](https://developer.chrome.com/blog/chrome-userscript) (accessed 2026-11-19).
- **Fact (CWS policy).**
  - Remotely hosted code is banned.
  - That ban "does not include data or things like JSON or CSS" ([RHC doc](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code) (accessed 2026-11-19)).
  - But the MV3 requirements also prohibit "building an interpreter to run complex commands fetched from a remote source, even if those commands are fetched as data" ([MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements) (accessed 2026-11-19)).
- **Fact (MV2 end-of-life).** "All remaining Manifest V2 extensions have been removed from the Chrome Web Store" as of 2026-08-31 ([timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline) (accessed 2026-11-19)).
- **Fact (Firefox).** Firefox 136 (2025-03-04) added an MV3 userScripts API. It is an *optional* permission requested at runtime, with no buried toggle ([MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts) (accessed 2026-11-19)).
- **Assumption (critical).** Templates expressed as CSS plus declarative rules (hide, reorder, restyle) can ship as data with zero onboarding friction.
  - Templates that need JS land in the Tampermonkey funnel, whose number-one support issue is "scripts silently don't run" (see the complaints below).
  - A declarative "layout DSL" must stay simple enough not to count as an "interpreter… of complex commands". This is a policy-interpretation risk.

#### Tampermonkey: the largest player, proprietary

1. **Function and audience (Fact).** A userscript manager. 12M CWS users, 4.8★ (73.1K); 13.9M on Edge; 837K Firefox ADU (§2).
2. **Distribution (Fact).** No first-party marketplace. Discovery is outsourced to its own search engine, userscript.zone, and to Greasy Fork.
3. **Customization (Fact).**
   - Full GM API, `@match`/`@include`, `@require`, `@resource`.
   - Sync through Chrome Sync, Google Drive, Dropbox, OneDrive, Yandex.Disk and WebDAV ([CWS listing](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo) (accessed 2026-11-19)).
4. **Creator experience (Fact).** The built-in editor plus the "Tampermonkey Editors" companion (10K users). From 5.5.0 (2026-05-08) there is **MCP support** for AI tools ([changelog](https://www.tampermonkey.net/changelog.php?more=true&old=&show=dhdg) (accessed 2026-11-19)).
5. **Monetization (Fact).**
   - A donation prompt after two weeks of use (developer reply on [AMO](https://addons.mozilla.org/api/v5/ratings/rating/2661833/) (accessed 2026-11-19)).
   - Paid Apple builds: iOS/Mac $2.99, only 3.10★ from 61 US ratings ([iTunes](https://itunes.apple.com/lookup?id=6738342400&country=us) (accessed 2026-11-19)).
6. **Complaints (Fact).**
   - "hidden Google Analytics and is close-source… begs for donations" (AMO 1★, 2026-04-13). The developer says the analytics are self-hosted Matomo and off by default ([rating](https://addons.mozilla.org/api/v5/ratings/rating/2661833/) (accessed 2026-11-19)).
   - "non stop banners" (2026-05-04).
   - The toggle confusion reaches creators too. A Greasy Fork author asked how to tell users that Developer Mode is required; Barnabe answered that it "seems more of Tampermonkey's responsibility" ([thread](https://greasyfork.org/discussions/greasyfork/273335-need-to-find-someway-to-alert-the-users-that-developer-mode-is-required-for-tm-mv3) (accessed 2026-11-19)).
7. **Architecture (Fact).**
   - Proprietary since after v2.9; Wikipedia dates the switch to January 2013 ([README](https://github.com/Tampermonkey/tampermonkey) (accessed 2026-11-19)).
   - MV3 since 5.2.0 (2024-06-02).
   - 5.5.1 (2026-10-01) fixed a "vulnerability in the userscript parser allowing unsafe key injection".
   - In 2019 Opera blocked it after adware abused it ([Wikipedia](https://en.wikipedia.org/wiki/Tampermonkey) (accessed 2026-11-19)) ⚠ stale.
8. **Strengths and weaknesses.**
   - Strengths: the install base, which **Assumption:** makes it the de-facto runtime for site-redesign scripts.
   - Weaknesses: closed source, nags and telemetry perception, toggle friction, no curation.

#### Violentmonkey: open source, survived a near-death MV3 transition

- **Fact.** MIT; 9,211★; 900K CWS users and 210K AMO ADU.
- **Fact (the MV3 transition).**
  - Chrome disabled its MV2 build in 2025. Users opened "#2340 VIOLENTMONKEY IS NOT UPDATED TO MANIFEST V3 YET, THE EXTENSION IS DEAD" and "#2341 Forking Violentmonkey" ([#2340](https://github.com/violentmonkey/violentmonkey/issues/2340), [#2341](https://github.com/violentmonkey/violentmonkey/issues/2341) (accessed 2026-11-19)).
  - There was no stable release between v2.31.0 (2025-03-15) and v2.32.0 (2026-01-19).
  - The current CWS build, v2.50.0, is MV3 with `userScripts` and adds MCP and a cron-style update schedule ([releases](https://github.com/violentmonkey/violentmonkey/releases) (accessed 2026-11-19)).
- **Fact (complaints).** Sync data loss: scripts "started to be deleted when syncing" (AMO 1★, 2026-02-23) ([reviews](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/reviews/) (accessed 2026-11-19)).
- **Lesson (Assumption).** One platform change can take a 1M-user open-source extension offline for most of a year when there is no funded maintainer.

#### Greasemonkey and FireMonkey (Firefox only)

**Fact.**
- Greasemonkey: 156K ADU, 4.19★, still MV2, slow but alive.
- FireMonkey: a combined script and style manager on Firefox's userScripts API; 1.8K ADU.
- Source: AMO API (accessed 2026-11-19).

#### Greasy Fork: the reference repository design

1. **Function (Fact).** The dominant userscript repository, run by Jason Barnabe, the original Stylish author. Open source: Rails 8.1, MySQL, Elasticsearch, Sidekiq ([Gemfile](https://github.com/greasyfork-org/greasyfork/blob/master/Gemfile) (accessed 2026-11-19)).
2. **Scale (Fact).**
   - `by-site.json` covers 47,194 site keys.
   - Scripts per site: youtube.com 4,949; twitter.com 1,405; reddit.com 1,269; x.com 1,145; **linkedin.com 154** ([by-site API](https://api.greasyfork.org/scripts/by-site.json) (accessed 2026-11-19)).
   - Total live scripts: **unverified**, because script IDs (newest about 606K) include deleted scripts.
3. **Marketplace features (Fact).**
   - Search by site; daily and total installs; good/ok/bad ratings; version history; a JSON API.
   - GitHub, GitLab and Bitbucket **webhooks** for auto-sync.
   - `@compatible`/`@incompatible` *browser* flags, localized names, and `@contributionURL` for donations.
   - Greasy Fork strips `@updateURL`, so updates flow only through Greasy Fork.
   - It hosts UserCSS (installable with Stylus).
   - Sources: [API help](https://greasyfork.org/en/help/api), [meta keys](https://greasyfork.org/en/help/meta-keys) (accessed 2026-11-19).
4. **Monetization rules (Fact).** Highly relevant to paid templates:
   - Ads, tracking and payments are allowed but must be disclosed with `@antifeature`.
   - `payment` applies when "the script requires the user pay… to be fully functional".
   - Obfuscated or minified code is banned.
   - The primary functionality must be hosted on Greasy Fork, not loaded remotely.
   - Sources: [antifeatures](https://greasyfork.org/en/help/antifeatures), [code rules](https://greasyfork.org/en/help/code-rules) (accessed 2026-11-19).
   - **Assumption:** in this culture paid scripts are labelled an "antifeature". A paid-template marketplace will be viewed with suspicion by the same power users who create most content.
5. **Funding (Fact).** Hosting sponsors on the [credits](https://greasyfork.org/en/help/credits) page, plus ads (AdSense and EthicalAds tags seen in page HTML) (accessed 2026-11-19).
6. **Security (Fact).**
   - In February 2025 an inactive author's account was hijacked and malicious code was pushed to two Waze scripts. It scraped "cvv"/"billing" data and was rolled back Feb 3–4 ([Waze forum, 2025-02-07](https://www.waze.com/discuss/t/urgent-two-scripts-were-compromised-on-feb-1-please-read-if-you-use-scripts/365499) (accessed 2026-11-19)).
   - 2FA became optional on 2024-11-21 and was required for some authors from 2025-02-16 ([thread](https://greasyfork.org/discussions/greasyfork/268441-new-feature-optional-2fa-logins) (accessed 2026-11-19)).
7. **Weaknesses (Fact and Assumption).**
   - The homepage trending list is dominated by downloaders and game/chess cheats ([home](https://greasyfork.org/en) (accessed 2026-11-19)). This is not a design-oriented audience.
   - No screenshots-first browsing; no compatibility-by-site-version.

#### OpenUserJS

- **Fact.** Active (last commit 2026-09-19), 1,014★, Node/Express/MongoDB, OAuth via several providers.
- **Assumption:** about 12K scripts, estimated from about 509 pages × about 24 rows ([openuserjs.org](https://openuserjs.org/) (accessed 2026-11-19)).
- The site was very slow during the fetch. A second-tier repository.

#### Userscripts for Safari (quoid)

- **Fact.**
  - Free, 4.32★ (192 US ratings), v1.8.6 (2026-01-11); 4,931★, Swift, GPL-3.0.
  - JS and CSS files are stored in a user-chosen folder, with iCloud sync between macOS and iOS that the README calls flaky.
  - Supports `@match`, `@include`/`@exclude`, `@inject-into`, `@run-at`; updates need `@version` plus `@updateURL`.
  - No iOS editor and no marketplace ([README](https://github.com/quoid/userscripts) (accessed 2026-11-19)).
- **Assumption:** iOS Safari is the one platform where mobile site redesign is possible at all. It is under-served.

#### ScriptCat: the most advanced settings and bundle model

1. **Fact.**
   - 100K CWS users, 4.5★ (76); 2.28M on Edge; 13K AMO ADU; 5,926★. Developed in China.
2. **Fact (features that map directly to the founder's spec).**
   - A declarative YAML **`==UserConfig==`** block (text, checkbox, select, multi-select, number, textarea, groups), rendered as a settings UI ([UserConfig docs](https://docs.scriptcat.org/en/docs/dev/config/) (accessed 2026-11-19)).
   - **`==UserSubscribe==`** bundles: one confirmation, then silent install, update and removal of member scripts ([subscribe docs](https://docs.scriptcat.org/en/docs/dev/subscribe/) (accessed 2026-11-19)). This is a "redesign package" primitive.
   - Background and cron scripts; cloud sync.
3. **Marketplace (Fact).**
   - scriptcat.org has **4,416 scripts** (API `total`), with today and total installs, scores and developer badges.
   - The top script, an online-course automation tool, has 8.89M installs ([API](https://scriptcat.org/api/v2/scripts?page=1&count=1) (accessed 2026-11-19)).
   - Chinese-dominant audience.
4. **Complaints (Fact).**
   - "developer mode must be enabled… already enabled… it doesn't work" (CWS review, 2025-12-21) ([reviews](https://chromewebstore.google.com/detail/ndcooeababalnlpkfedmmbbbgkljhpjf/reviews) (accessed 2026-11-19)).
   - A user saw ad-domain connections. The developer explained these were favicon fetches.

### 3.3 AI "modify any website" tools (2024–2026)

#### Tweeks (NextByte, YC W25): the most relevant new entrant

1. **Function (Fact).**
   - You describe a change in plain English. A hosted LLM agent reads the page structure and returns a "tweek": a persistent userscript (JS and CSS) scoped by Greasemonkey-style match patterns.
   - Tweeks run locally afterwards, and it also runs existing GM/TM scripts.
   - Sources: [Launch HN, 2025-11-13](https://news.ycombinator.com/item?id=45916525), [llms.txt](https://www.tweeks.io/llms.txt) (accessed 2026-11-19).
2. **Audience (Assumption).** Mainstream users who would never write CSS, which is the founder's target.
3. **Distribution and marketplace (Fact).**
   - A public library. The homepage claims "25k+ people tweeking sites, 4k+ public tweeks, 4M+ pages modified" ([tweeks.io](https://www.tweeks.io/) (accessed 2026-11-19)).
   - Per-site counts: YouTube 82, X 35, Reddit 16, LinkedIn 6. The top tweek ("YouTube Remove Shorts") has about 10.5K installs.
   - Each tweek page shows the creator handle, install count, age, target site, **full source**, permissions and a report button ([example](https://www.tweeks.io/t/0cf68ee6301e457b90bbbfa4) (accessed 2026-11-19)).
   - **No ratings, version history, user-configurable settings, variations, or compatibility status were found.**
4. **Numbers (Fact).**
   - CWS: **7,000 users**, 4.9★ (45), v0.0.7.20, updated 2026-07-09 ([CWS](https://chromewebstore.google.com/detail/fmkancpjcacjodknfjcpmgkccbhedkhc) (accessed 2026-11-19)).
   - AMO: 610 ADU, 3.8★ (5), listed 2026-02-09 ([AMO API](https://addons.mozilla.org/api/v5/addons/addon/tweeks/) (accessed 2026-11-19)).
   - Launch HN: **351 points and 213 comments**.
   - **Assumption:** the "25k+ people" claim is about 3.4× the store-visible install base. Treat it as vendor marketing.
5. **Monetization (Fact).**
   - Free to browse, install and create (creating needs an account).
   - Paid plans raise create, update and inference limits and add "Tweeks MCP" and "use Tweeks with your ChatGPT subscription" (tweeks.io FAQ).
   - **Unverified:** prices; no public pricing page.
   - The founder on HN: "we're not sure about monetization either."
6. **Complaints (Fact).**
   - HN commenters:
     - forced sign-up called a "dark pattern";
     - "requires access to all the data?? And it's not even open source";
     - scripts "break… every time a website updates";
     - 180+ second generation times;
     - shared scripts could hide malware.
   - AMO reviews: "doesn't work without creating an account" (1★, 2026-07-27); "fails on too long prompts" (4★, 2026-10-24) ([AMO ratings](https://addons.mozilla.org/api/v5/ratings/rating/?addon=tweeks) (accessed 2026-11-19)).
7. **Architecture (Fact).**
   - MV3 `userScripts` API with GM-style grants.
   - Users must enable Developer Mode or "Allow User Scripts" ([Gigazine](https://gigazine.net/gsc_news/en/20251114-web-tweeks-ai/) (accessed 2026-11-19)).
   - Closed source.
8. **Strengths and weaknesses.**
   - Strengths: YC funding, an AI-first creation flow, a live creator flywheel with install counts, Firefox support.
   - Weaknesses:
     - generated **raw JS**, which is a trust and security liability and brittle;
     - no structured template model (settings, variants, versions, compatibility);
     - no ratings;
     - an onboarding toggle;
     - undecided business model.

#### Other AI modifiers (Fact: CWS, accessed 2026-11-19, unless noted)

| Product | CWS users / ★ | What it does | Monetization |
|---|---|---|---|
| [Robomonkey](https://chromewebstore.google.com/detail/jcecflpagdbnadafgpbofkcodldfmdni) | ~3K / 4.8 (42) | Chat-to-build extensions, userscripts and scrapers; Tampermonkey-compatible; share links; directory by site ([robomonkey.io](https://robomonkey.io) (accessed 2026-11-19)) | Trial plus paid (prices unverified); **"up to $5 per referral"**, the only creator incentive found among AI tools |
| [Shaper](https://chromewebstore.google.com/detail/cfchhckkobkelfckakndahnlnnjmjngn) | 377 / 4.2 (5) | AI mods; can **export a mod as a standalone extension**; pre-built mod library | 10 free daily credits or bring your own key |
| [ScriptGenie AI](https://chromewebstore.google.com/detail/hogmlmglhijddadgjjcbhehfiejpbeac) | 374 / 5.0 | TM-compatible script generator | — |
| [Customaise](https://chromewebstore.google.com/detail/anmpijcpaobaabcdncjjmnhdeibipmko) | 109 / 5.0 | 21 MCP tools plus WebMCP; on-device Gemini Nano via Chrome's Prompt API; "Publish & share" with updates for subscribers | Subscription (details unverified) |
| [Cuttlefox](https://www.cuttlefox.com/) | 22 | AI site modifier; no gallery | $2.50/mo after a 7-day trial |
| [Robin](https://thisisrobin.ai) | 7 | Saved per-site "Actions" | $3.99/mo bring-your-own-key, $19.99/mo Pro |
| Show HN "Cursor for Userscripts" | n/a | Bring your own Anthropic key; build from source | 56 HN points ([HN](https://news.ycombinator.com/item?id=46800484) (accessed 2026-11-19)) |

- **Unverified:** "Websight", "Bananas" and "Userscript GPT" as products; searches returned nothing.
- **Fact:** Coframe is B2B optimization for site owners, so not a competitor ([ContentGrip](https://www.contentgrip.com/coframe-ai-websites-funding/) (accessed 2026-11-19)).

#### Incumbents adding AI hooks (Fact)

- Tampermonkey 5.5.0: MCP via its Editors extension.
- Violentmonkey 2.50.0: MCP.
- Stylebot 4.2: agent CLI plus a skill for Claude Code, Codex, Cursor and Copilot.
- ScriptCat: an Agent API that lets scripts call AI, but it does not generate scripts ([docs](https://docs.scriptcat.org/en/docs/dev/agent/) (accessed 2026-11-19)).
- Sources: changelogs cited in §0.

#### Platform AI (browsers)

**Fact.** None of the following persistently restyles third-party pages:
- **Gemini in Chrome "Skills"** (2026-04-14): saved prompts that run on the current page ([9to5Google](https://9to5google.com/2026/04/14/gemini-in-chrome-skills/) (accessed 2026-11-19)).
- **Chrome DevTools AI assistance:** can edit CSS, but only in inspector stylesheets or a local workspace ([docs](https://developer.chrome.com/docs/devtools/ai-assistance/styling) (accessed 2026-11-19)).
- **Dia "Skills":** prompt shortcuts ([PiunikaWeb, 2026-10-16](https://piunikaweb.com/2026/10/16/dia-update-github-live-groups-custom-skills/) (accessed 2026-11-19)).
- **ChatGPT Atlas:** launched 2025-10-21; its discontinuation was announced 2026-07-09 ([9to5Mac](https://9to5mac.com/2026/07/09/openai-is-discontinuing-chatgpt-atlas-its-standalone-desktop-browser/) (accessed 2026-11-19)).
- **Opera Neon "Make":** builds new apps in the cloud for about $20/mo ([TechCrunch, 2025-12-11](https://techcrunch.com/2025/12/11/opera-wants-you-to-pay-20-a-month-to-use-its-ai-powered-browser-neon) (accessed 2026-11-19)).
- **Firefox Smart Window:** monitoring and autofill ([9to5Mac, 2026-10-27](https://9to5mac.com/2026/10/27/firefoxs-ai-powered-smart-window-gets-form-autofill-and-website-monitoring/) (accessed 2026-11-19)).
- **Perplexity Comet:** no restyle feature found. This is an absence of evidence, not proof.

**Assumption (latent threat).** Chrome already exposes on-device Gemini Nano to extensions through the Prompt API, which Customaise uses. A native "always restyle this site" feature from Google would be a small product step. Probability unknown; impact high.

**Research lineage (Fact).** Wildcard (Geoffrey Litt, MIT, 2020 ⚠) customized sites through per-site "adapters" that expose a page as a spreadsheet ([geoffreylitt.com/wildcard](https://geoffreylitt.com/wildcard) (accessed 2026-11-19)). It is the conceptual precedent for maintained site adapters.

### 3.4 Browser-native customization

#### Arc Boosts (The Browser Company): proven demand, killed by its host

- **Fact.**
  - Boosts 2.0 (May 2023) added color, font, brightness, contrast and saturation controls and **"Zap" to remove elements**, plus a Gallery with one-click "Get Boost".
  - **JS Boosts "won't be sharable… because of security concerns"** ([TechCrunch, 2023-05-25](https://techcrunch.com/?p=2549048) (accessed 2026-11-19)) ⚠ stale.
  - The Browser Company prototyped AI-generated Boosts ([TechCrunch, 2023-10-03](https://techcrunch.com/2023/10/03/arc-browsers-new-ai-powered-features-combine-openai-and-anthropics-models) (accessed 2026-11-19)) ⚠. **Unverified** whether they shipped.
- **Fact (decline).**
  - Josh Miller's letter of 2025-05-26: "we are not actively developing the core product experience like we used to" ([letter](https://browsercompany.substack.com/p/letter-to-arc-members-2025) (accessed 2026-11-19)).
  - Atlassian agreed to acquire The Browser Company for about $610M on 2025-09-04 ([Engadget](https://www.engadget.com/big-tech/atlassian-is-buying-arc-maker-the-browser-company-for-610-million-145236236.html) (accessed 2026-11-19)). The deal closed 2025-10-21 ([BusinessWire](https://www.businesswire.com/news/home/20251021473486/en/Atlassian-Completes-Acquisition-of-The-Browser-Company-of-New-York) (accessed 2026-11-19)).
  - **arc.net now reads "Arc is sunsetting on December 22, 2026"**, and `arc.net/boosts` returns a 301 redirect to that farewell page (our curl, 2026-11-19) ([arc.net](https://arc.net/) (accessed 2026-11-19); [TidBITS, 2026-10-26](https://tidbits.com/2026/10/26/the-browser-company-kicks-arc-to-the-curb-on-22-december-2026/) (accessed 2026-11-19)).
  - Dia's feature list has no Boosts; Dia "Skills" are prompt shortcuts.
- **Assumption.** Arc Boost users are orphaned in about 5 weeks. This is a short, concrete acquisition window. Arc's Boost export format is **unverified**.

#### Opera GX Mods: the largest live web-modding store

- **Fact.**
  - Launched 2023-03-31. "All Mods are free" ([Opera press](https://press.opera.com/?p=2999) (accessed 2026-11-19)) ⚠.
  - The mod manifest has a **`page_styles` array of CSS files with `matches` URL patterns**: "CSS styles that can be applied to web pages… Multiple pages can be modified with a single mod". The template has no JS field ([gxmods docs](https://github.com/opera-gaming/gxmods) (accessed 2026-11-19)).
  - The store lists **12,173 mods**, with a "Web Modding" filter and "Most downloaded" sort ([store.gx.me/mods](https://store.gx.me/mods/) (accessed 2026-11-19)).
  - Opera GX had 34M MAU in Q4 2025 ([earnings call](https://www.fool.com/earnings/call-transcripts/2026/04/21/opera-opra-q4-2025-earnings-call-transcript/) (accessed 2026-11-19)).
  - Creators are paid only through contests, e.g. the 2023 Mod Jam with $5,000 prizes ([Opera blog](https://blogs.opera.com/news/2023/05/gx-gamemaker-browser-mod-jam/) (accessed 2026-11-19)) ⚠.
  - Complaint: users can't tell what a mod's web modding does ([forum](https://forums.opera.com/topic/61370/) (accessed 2026-11-19)).
- **Assumption.** GX proves that a **CSS-only, URL-matched, packaged "redesign" bundle with a store** works at scale for a young, gaming-oriented audience. It is locked to one browser and has no settings, compatibility data or payments.

#### Other browsers (Fact)

- **Vivaldi:** 16 built-in CSS "Page Actions" filters, plus browser-UI themes at themes.vivaldi.net with no ratings or download counts ([page actions](https://help.vivaldi.com/desktop/tools/page-actions/) (accessed 2026-11-19); [themes](https://themes.vivaldi.net/) (accessed 2026-11-19)).
- **Chrome "Customize Chrome":** themes, accent colors and new-tab page only ([9to5Google, 2023](https://9to5google.com/2023/05/23/customize-chrome-side-panel/) (accessed 2026-11-19)) ⚠.
- **Edge:** no per-site restyling found. Unverified; not researched in depth.
- **Firefox:** `userContent.css` behind a pref, manual, no store ([firefox-csshacks](https://github.com/MrOtherGuy/firefox-csshacks/blob/master/README.md) (accessed 2026-11-19)).
- **Zen browser mods:** 77 mods for the browser UI only. **37 of 77 ship a `preferences.json` with typed settings.** Submission is by GitHub issue, then a bot opens a PR ([themes.json](https://raw.githubusercontent.com/zen-browser/theme-store/main/themes.json); [guidelines](https://docs.zen-browser.app/themes-store/themes-marketplace-submission-guidelines) (accessed 2026-11-19)).
- **Brave:** local "Block elements" cosmetic filters and custom scriptlets behind developer mode since v1.75; nothing is shareable ([Brave](https://brave.com/privacy-updates/32-custom-scriptlets/) (accessed 2026-11-19)).

### 3.5 Visual CSS editors

| Tool | CWS users / ★ / last update | Persists across visits? | Shareable? | Price | Notes |
|---|---|---|---|---|---|
| VisBug (Google Chrome Labs) | 200,000 / 4.6 (282) / 2024-11-20 | **No.** "save state / versioning" issue open since 2018 ([#141](https://github.com/GoogleChromeLabs/ProjectVisBug/issues/141) (accessed 2026-11-19)) | No | Free, Apache-2.0 | Repo **archived** (after 2026-09-01, inferred); community fork VisBug2 has 130 users ([#693](https://github.com/GoogleChromeLabs/ProjectVisBug/issues/693) (accessed 2026-11-19)) |
| Magic CSS | 60,000 / 4.6 (280) / 2024-07-24 ⚠ | Yes, per-site auto-save and reapply | No | Free, open source ([repo](https://github.com/webextensions/live-css-editor) (accessed 2026-11-19)) | Dev-oriented (Less/Sass) |
| Amino | 20,000 / 3.9 (462) / 2026-05-16 | Yes, cloud per-site CSS | Collections (Pro) | Free with ads; Pro removes ads, adds AI (beta) ([CWS](https://chromewebstore.google.com/detail/pbcpfbcibpcbfbmddogfhcijfpboeaaf) (accessed 2026-11-19)) | Complaints: paywall confusion, "why is an account needed" ([reviews](https://chromewebstore.google.com/detail/pbcpfbcibpcbfbmddogfhcijfpboeaaf/reviews) (accessed 2026-11-19)) |
| CSS Scan | 10,000 / 3.3 (101) / 2026-04-16 | Not described | No | $69–$120 lifetime ([getcssscan.com](https://getcssscan.com/) (accessed 2026-11-19)) | "no mention this is a paid product" ([reviews](https://chromewebstore.google.com/detail/gieabiemggnpnminflinemaickipbebg/reviews) (accessed 2026-11-19)) |
| Stylebot | see §3.1 | Yes | **Yes (Gallery)** | Free | The only visual editor with publishing |

**Assumption.** Visual editing is solved for *recoloring and hiding*. A visual editor whose output survives site changes is what is still missing; Stylebot 4 claims to be working on it. The same goes for a visual editor that *restructures layout* (move, reorder, regrid).

### 3.6 Site-specific redesign and declutter extensions

**Fact** for all numbers (CWS listing pages and the AMO API, accessed 2026-11-19). Links: [Enhancer](https://chromewebstore.google.com/detail/ponfpcnoihfmfllpaingbgckeeldkhle), [ImprovedTube](https://chromewebstore.google.com/detail/bnomihfieiccainjcjblhegjgglakjdd), [Unhook](https://chromewebstore.google.com/detail/khncfooichmfjbepaaaebmommgaepoid), [BlockTube](https://chromewebstore.google.com/detail/bbeaicapbccfllodepmimpkgecanonai), [Iridium](https://chromewebstore.google.com/detail/gbjmgndncjkjfcnpfhgidhbgokofegbl), [DeArrow](https://chromewebstore.google.com/detail/enamippconapkdmgfgjchkhakpfinmaj), [SponsorBlock](https://chromewebstore.google.com/detail/mnjggcdmjocbbbhaepdhchncahnbgone), [Control Panel for Twitter](https://chromewebstore.google.com/detail/kpmjjdhbcfebfjgdnpjagcndoelnidfj), [Old Twitter Layout](https://chromewebstore.google.com/detail/jgejdcdoeeabklepnkdbglgccjpdgpmf), [Minimal Theme for Twitter](https://chromewebstore.google.com/detail/pobhoodpcipjmedfenaigbeloiidbflp), [RES](https://chromewebstore.google.com/detail/kbmfpngjjgdllneeigpgjifpgocmfgmb), [Old Reddit Redirect](https://chromewebstore.google.com/detail/dneaehbmnbhcippjikoajpoabadpodje), [News Feed Eradicator](https://chromewebstore.google.com/detail/fjcldmjmjhkklehbacihaiopjklihlgg), [LinkedIn Feed Hider](https://chromewebstore.google.com/detail/cnlacdcphogkgibckgbkfkpghldbklhk) (accessed 2026-11-19).

| Extension | Site | CWS users / ★ (n) | AMO ADU / ★ | Model and monetization | Breakage and maintenance signal |
|---|---|---|---|---|---|
| Enhancer for YouTube | YouTube | 1M / 4.5 (17.6K) | 613,810 / 4.66 | Closed source; monetization unverified | Developer: a fix sat "pending for review since Jan. 30, 2026… extremely slow on AMO" ([rating](https://addons.mozilla.org/api/v5/ratings/rating/2582051/) (accessed 2026-11-19)) |
| Unhook | YouTube | 1M / **4.9** (4.6K) | 171,970 / 4.63 | Hide-elements toggles; PayPal tip | — |
| ImprovedTube | YouTube | 400K / 4.3 (7.2K) | 100,687 / 4.29 | Open source; **1,495 open issues** | Massive issue backlog |
| BlockTube | YouTube | 100K / 3.9 (827) | 33,850 / 3.87 | Open source | 506 open issues; last push 2026-02 |
| Iridium | YouTube | 10K / **2.9** (513) | 1,067 | Patreon | **Archived**; "no longer being actively maintained" ([repo](https://github.com/ParticleCore/Iridium) (accessed 2026-11-19)) |
| SponsorBlock | YouTube | 2M / 4.5 | 826,362 / 4.81 | Crowdsourced segment database with open data export; GitHub Sponsors | Database model is independent of the DOM |
| DeArrow | YouTube | 80K / 4.3 | 34,571 / 3.97 | Crowdsourced titles and thumbnails; **$1 license with an honor-system "can't pay" button** ([site](https://dearrow.ajay.app/) (accessed 2026-11-19)) | — |
| Control Panel for Twitter | X | 200K / 4.4 (965) | 55,751 / 4.70 | Free on Chrome and Firefox; **Safari app $4.99, 57 ratings** ([iTunes](https://itunes.apple.com/lookup?id=1668516167&country=us) (accessed 2026-11-19)) | **31 releases in 12 months**; v4.99 adds "initial support for the new X UI" ([soitis.dev](https://soitis.dev/control-panel-for-twitter) (accessed 2026-11-19)) |
| Old Twitter Layout (dimden) | X | 60K / 4.1 (666) | **Removed from AMO** (README) | Full replacement client on X's private APIs; donations | Release notes: "Fixed solver again le sigh" (May 2026), "Fixed challenge solver for new client" (Nov 2026) ([releases](https://github.com/dimdenGD/OldTwitter/releases) (accessed 2026-11-19)). Users report X suspensions linked to it ([#1222](https://github.com/dimdenGD/OldTwitter/issues/1222) (accessed 2026-11-19)); user reports only |
| Minimal Theme for Twitter (Typefully) | X | 30K / 4.6 (265) | 6,296 / 4.53 | Free; **Assumption:** marketing for Typefully | — |
| Better TweetDeck | X | dead | — | — | "Old TweetDeck has been unplugged… This project is thus over" (July 2023) ([repo](https://github.com/eramdam/BetterTweetDeck) (accessed 2026-11-19)) ⚠ |
| Reddit Enhancement Suite | Reddit | 1M / 4.1 (4.2K) | 297,314 / 4.74 | Open source; Patreon paused (snippet) | "Life support/maintenance mode" since 2022-01-31 ([AlternativeTo](https://alternativeto.net/news/2022/2/reddit-enhancement-suite-will-go-on-life-support-maintenance-mode--no-new-features-implemented) (accessed 2026-11-19)) ⚠ |
| Old Reddit Redirect | Reddit | 80K / 4.4 | 54,133 / 4.62 | — | Host risk: old Reddit now requires login ([mjtsai, 2026-07-03](https://mjtsai.com/blog/2026/07/03/old-reddit-now-requires-logging-in/) (accessed 2026-11-19)) and is being further restricted ([AlternativeTo, Oct 2026](https://alternativeto.net/news/2026/10/reddit-is-killing-rss-feeds-and-restricting-access-to-old-reddit-blames-ai-scrapping-bots/) (accessed 2026-11-19)) |
| News Feed Eradicator | FB, X, LinkedIn, Reddit and 8 more | 200K / 4.5 (2.4K) | 9,176 / 4.63 | Open source | **Moved selectors to a separate versioned `sitelist.json`** (created 2026-11-13); "in future… dynamically fetch them for faster updates when a site breaks" ([lists repo](https://github.com/jordwest/news-feed-eradicator-lists) (accessed 2026-11-19)) |
| Social Fixer | Facebook | Unverified (CWS fetch empty) | 8,834 / 4.39 | Donations | **Last release 2023-09** ([socialfixer.com](https://socialfixer.com/) (accessed 2026-11-19)) ⚠ |
| LinkedIn Feed Hider | LinkedIn | **202** / 3.6 (7) | — | — | — |

Key observations:
- **Assumption, from the numbers above.** Demand is concentrated on YouTube, then X, then Reddit. LinkedIn demand is weak:
  - 154 Greasy Fork scripts versus 4,949 for YouTube;
  - LinkedIn's best-known hider has 202 users;
  - USw has 17 LinkedIn styles.
- **Fact.** Facebook, Instagram and Threads selectors in News Feed Eradicator use obfuscated atomic classes such as `div.x1hc1fzr.x1unhpq9.x6o7n8i` ([sitelist.json](https://jordwest.github.io/news-feed-eradicator-lists/sitelist.json) (accessed 2026-11-19)). Meta properties are the most fragile targets.
- **Fact.** LinkedIn probes for 6,236 Chrome extension IDs and "does not dispute" doing so ([BleepingComputer, 2026-04-03](https://www.bleepingcomputer.com/news/security/linkedin-secretely-scans-for-6-000-plus-chrome-extensions-collects-data/) (accessed 2026-11-19)).

### 3.7 Analogous theme ecosystems

**BetterDiscord, Vencord and Discord's own themes**
- **Fact.**
  - The BetterDiscord themes page lists 112 themes, with downloads, likes, tags, author profiles and thumbnails. ClearVision has 2,903,182 downloads ([betterdiscord.app/themes](https://betterdiscord.app/themes) (accessed 2026-11-19)). Whether the page shows the full catalog is unverified.
  - Vencord's README: "Client modifications are against Discord's Terms of Service. However, Discord is pretty indifferent… no known cases of users getting banned" ([Vencord](https://github.com/Vendicated/Vencord) (accessed 2026-11-19)).
- **Fact (host counter-move).**
  - Discord shipped custom themes in Nitro (September 2025).
  - By February 2026 it listed 4 free themes, 28 Nitro color themes and custom 5-color blends ([Discord blog, 2026-02-19](https://discord.com/blog/bring-your-vibe-to-discord-with-new-themes-in-nitro) (accessed 2026-11-19)).
  - **Assumption:** platforms monetize the most popular theming use case themselves once it is proven.

**Spicetify (Spotify)**
- **Fact.**
  - 25,566★ and **56 releases in 12 months** to keep up with Spotify client updates. The FAQ says "After any Spotify update, always run `spicetify backup apply`" ([FAQ](https://spicetify.app/docs/faq) (accessed 2026-11-19)).
  - The Marketplace has no backend. It searches GitHub topics (`spicetify-themes`, 221 repos) and requires a `manifest.json` with a preview image ([publishing wiki](https://github.com/spicetify/marketplace/wiki/Publishing-to-Marketplace) (accessed 2026-11-19)).
  - It **ranks by GitHub stars** ([FetchRemotes.ts](https://github.com/spicetify/marketplace/blob/main/src/logic/FetchRemotes.ts) (accessed 2026-11-19)).
  - Moderation is a 37-entry blacklist file.
- **Assumption:** a cheap model, easily gamed, with no compatibility data.

**Obsidian community themes (strongest analog)**
- **Fact.**
  - 1,044 themes are listed in `community-css-themes.json`. 26 have been removed, **16 for "Developer policies violation: Remote resources"** ([obsidian-releases](https://github.com/obsidianmd/obsidian-releases) (accessed 2026-11-19)).
  - Submission requires a semver release tag matching the manifest and a 512×288 screenshot, and is now automated ([submit docs](https://docs.obsidian.md/Themes/App+themes/Submit+your+theme) (accessed 2026-11-19)).
  - The guidelines reduce breakage ([theme guidelines](https://docs.obsidian.md/Themes/App+themes/Theme+guidelines) (accessed 2026-11-19)):
    - override CSS variables;
    - "Avoid overly complex selectors targeting specific classes";
    - no `!important`;
    - no remote assets.
- **Fact (Style Settings plugin).**
  - Themes declare user settings in YAML inside `/* @settings */` CSS comments: class toggles and color, number and text variables.
  - 2,861,632 downloads; last release August 2024. It is now kept alive by the "Obsidian Community Archive" org ([plugin stats](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugin-stats.json); [repo](https://github.com/community-archive/obsidian-style-settings) (accessed 2026-11-19)).
- **Assumption:** Obsidian works because the *host* exposes stable design tokens (CSS variables). Websites like YouTube do not. The founder must build that token layer per site.

**VS Code Marketplace**
- **Fact (snippet).**
  - In February 2025 Microsoft removed the Material Theme (13.2M installs) for "heavily obfuscated code" and banned its publisher, then reinstated it: "we moved fast and we messed up" ([SC World](https://scworld.com/news/microsoft-restores-vs-code-theme-flagged-as-malicious-we-messed-up) (accessed 2026-11-19)).
  - In 2024 researchers' fake "Darcula" theme obtained a verified badge ([BleepingComputer](https://www.bleepingcomputer.com/news/security/malicious-vscode-extensions-with-229m-installs-found-on-microsoft-marketplace/) (accessed 2026-11-19)).
  - Paid themes are rare. Monokai Pro uses nagware with a one-time license (snippet).

**Paid consumer-template precedents**
- **Fact.**
  - Notion's marketplace takes "8% fee plus 40 cents per transaction" and acts as merchant of record, with 14-day refunds ([Notion help](https://www.notion.com/help/selling-on-marketplace) (accessed 2026-11-19)).
  - Valve's paid Skyrim mods were pulled after about 3 days in April 2015 with full refunds: "we didn't understand exactly what we were doing" ([Engadget, 2015-04-27](https://www.engadget.com/2015/04/27/valve-reverses-skyrim-mod-payments/) (accessed 2026-11-19)) ⚠ stale but canonical.
  - CWS payments were deprecated in 2021, so extensions have no native payment rail ([CWS payments deprecation](https://developer.chrome.com/webstore/cws-payments-deprecation) (accessed 2026-11-19)) (snippet).
- **Assumption.**
  - Notion templates sell because they produce *productivity outcomes* and don't break.
  - Cosmetic skins for third-party sites break on someone else's schedule, which makes buyers' refund expectations a liability.

---

## 4. Comparison matrix

Legend:
- ✅ = present (Fact, per the sources in §2–3)
- ◐ = partial or limited
- ❌ = absent (none found)
- ? = unverified

"Layout beyond CSS" means DOM restructuring with JS. Pure CSS can still do a lot of layout (`display`, `grid`, `order`, `:has()`).

| Product | Scale (Nov 2026) | URL rules | Layout beyond CSS | Typed user settings | Variations / profiles | Versioned auto-update | Compatibility status | Visual editor | AI authoring | Discovery: previews / ratings / install stats | Creator profiles | Creator monetization | Open source | Needs Chrome "Allow User Scripts" |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Stylus | 1M CWS | ✅ | ❌ | ✅ `@var` | ◐ (`@var select`) | ✅ 24h | ❌ | ❌ | ❌ | ◐ (third-party indexes) | ❌ | ❌ | ✅ | No |
| Stylebot v4 | 200K CWS | ✅ | ❌ | ✅ (since 4.3) | ✅ profiles | ✅ (Gallery) | ◐ ("resilient selectors", no status shown) | ✅ | ◐ agent CLI | ◐ preview only, no ratings or stats | ✅ | ❌ | ✅ | No |
| Stylish / userstyles.org | 2M CWS | ✅ | ❌ | ? | ? | ? | ❌ | ? | ? ("Build with AI Agent" link 404) | ✅ screenshots, ratings, weekly installs | ✅ | ◐ PayPal field; "Pro" unclear | ❌ | No |
| UserStyles.world | 25,845 styles | ✅ | ❌ | ✅ | ◐ | ✅ git mirroring | ❌ | ❌ | ❌ | ◐ screenshots, ratings (sparse), inflated installs | ✅ | ❌ | ✅ | No |
| Catppuccin userstyles | 136 sites | ✅ | ❌ | ✅ | ✅ flavor and accent | ✅ date versions | ◐ named maintainers, manual issues | ❌ | ❌ | ◐ docs list | ◐ maintainers | ❌ | ✅ | No |
| Dark Reader | 7M CWS | ✅ per-site fixes | ❌ | ✅ global sliders | ◐ | ✅ bundled fixes | ◐ fix DB, daily PRs | ◐ dev-tools editor | ❌ | n/a | n/a | ✅ app-level (one-time $, Plus) | ✅ open-core | No |
| Tampermonkey | 12M CWS | ✅ | ✅ | ◐ per-script | ❌ | ✅ | ❌ | ❌ | ◐ MCP | ◐ userscript.zone | n/a | ❌ | ❌ | **Yes** |
| Violentmonkey | 900K CWS | ✅ | ✅ | ◐ | ❌ | ✅ | ❌ | ❌ | ◐ MCP | ❌ | n/a | ❌ | ✅ | **Yes** |
| ScriptCat | 100K CWS / 2.28M Edge | ✅ | ✅ | ✅ `UserConfig` | ◐ `UserSubscribe` bundles | ✅ | ❌ | ❌ | ◐ Agent API | ✅ scriptcat.org installs and scores | ✅ | ◐ badges and exposure only | ✅ | **Yes** |
| Greasy Fork | 47K site keys | ✅ | ✅ | n/a | n/a | ✅ version history | ◐ browser-only `@compatible` | ❌ | ❌ | ◐ no screenshot-first view; ratings and installs ✅ | ✅ | ◐ `@contributionURL`; paid = `@antifeature` | ✅ | (via managers) |
| Tweeks | 7K CWS (claims 25K+) | ✅ | ✅ JS | ❌ | ❌ | ? | ❌ | ❌ | ✅ | ◐ installs, no ratings | ✅ | ❌ | ❌ | **Yes** |
| Robomonkey | ~3K CWS | ✅ | ✅ | ? | ? | ? | ❌ | ❌ | ✅ | ◐ directory | ? | ◐ referral $5 | ❌ | ? |
| Arc Boosts | Dies 2026-12-22 | ✅ | ◐ Zap; JS not shareable | ◐ sliders | ❌ | ? | ❌ | ✅ | ? prototype | ◐ curated Gallery (gone) | ? | ❌ | ❌ | n/a (browser) |
| Opera GX Mods | 12,173 mods; 34M MAU browser | ✅ `page_styles.matches` | ❌ | ? | ❌ | ? | ❌ | ? | ❌ | ✅ store, most-downloaded sort | ? | ❌ contests only | ❌ | n/a (GX only) |
| Spicetify | 25.6K★ | n/a (one app) | ✅ | ◐ | ◐ color schemes | ◐ | ❌ (re-apply after each update) | ❌ | ❌ | ◐ ranked by GitHub stars | ◐ GitHub | ❌ | ✅ | n/a |
| Obsidian themes | 1,044 themes | n/a | ❌ | ✅ Style Settings | ◐ | ✅ semver releases | ◐ `legacy` flag; host CSS variables | ❌ | ❌ | ✅ screenshots | ◐ | ❌ | ✅ | n/a |
| BetterDiscord themes | 112 listed | n/a | ❌ | ◐ | ◐ | ✅ | ❌ | ❌ | ❌ | ✅ thumbnails, downloads, likes | ✅ | ❌ | ✅ | n/a |
| **Proposed product** | — | ✅ | ◐ declarative first | ✅ | ✅ | ✅ | **✅ target** | ✅ | ◐ assistive | **✅ before/after previews, honest stats, version-scoped ratings** | ✅ | ? | Recommended | **Avoid by design** |

---

## 5. Gap analysis: proposed differentiators vs. what already exists

Verdicts are **Assumptions** drawn from the Facts in §3.

| Proposed differentiator | Verdict | Who already does it (evidence) | What is still missing |
|---|---|---|---|
| **Complete redesign packages** | **Mostly solved technically; packaging and UX unsolved** | Opera GX mods bundle multi-page CSS (`page_styles`) into one installable mod. Catppuccin ships 136 ports in one `import.json`. ScriptCat `UserSubscribe` installs and updates script bundles silently. Stylebot profiles give multiple looks per site (§3.1–3.4). | A package spanning *several pages of one site* (home, watch, search, settings) with a single settings panel, tested together, with one compatibility status. Nobody markets "a full YouTube redesign" as a coherent product with QA. |
| **URL-specific templates** | **Solved** | Stylus `@-moz-document domain()/url-prefix()`; userscript `@match`/`@include`; Opera GX `matches`; Arc per-domain Boosts. | Nothing material. Path-level page *types* ("watch page", "profile page") are not abstracted; creators hand-write URL regexes. |
| **Curated galleries** | **Partially solved** | Arc Boosts Gallery (curated, now redirected away). Catppuccin (review-gated monorepo). Stylebot Gallery (31 sites, seeded by the developer). userstyles.org categories (uncurated, low quality). | Editorial curation for mainstream users, with real before/after previews and quality gates (must be complete, must not break core functions). USw and userstyles.org are uncurated and full of rot. |
| **Community layouts** | **Exists, but rots** | userstyles.org and USw host layout styles ("Revert Watch Page Redesign", now "[DISCONTINUED]"). Greasy Fork has 4,949 YouTube scripts. Old Twitter Layout is a full replacement client. | Layouts that survive host redesigns. Every source shows layout styles dying at the next redesign. |
| **Visual editor** | **Solved for recolor and hide; open for layout** | Stylebot (point-and-click, now with resilient selectors and alternatives), Amino, Magic CSS, Arc Boosts (Zap, sliders). VisBug has no persistence and is archived. | A visual *layout* editor (drag to reorder, regrid, collapse sidebars) whose output is declarative and survives DOM changes. |
| **Reusable design systems / tokens across sites** | **Partially solved (palette only)** | Catppuccin: shared `lib/std/v1.less` plus flavor and accent `@var`s across 136 sites. Dark Reader: one global algorithmic transform for any site. | User-defined token sets (type scale, font family, density/spacing, radius, palette) applied to many sites through per-site mappings. Catppuccin is one fixed palette family and recolor-only. |
| **Compatibility tracking when sites change** | **Not solved by anyone** | Closest: Dark Reader's daily community fix PRs; Catppuccin's per-port maintainers with manual breakage issues (e.g. #2364); Greasy Fork's browser-only `@compatible`; Stylebot's "selectors that keep working" claim; News Feed Eradicator moving selectors into a versioned remote list (Nov 2026). | Automated detection (scheduled headless runs on live sites, selector resolution checks, screenshot diffs), a visible "last verified working" date per template, and per-version breakage reports. No competitor surfaces any of these. |
| **Creator monetization** | **Not solved; weak evidence of demand** | Donations only: the userstyles.org `paypalEmail` field, Greasy Fork `@contributionURL`, Ko-fi. Robomonkey pays referrals. Opera GX runs contests. App-level payment works for Dark Reader (one-time $4.99–$19.99) and Control Panel's $4.99 Safari app (only 57 ratings). | Any working per-template sale. Counter-evidence: Greasy Fork labels paid scripts an "antifeature"; Valve's paid mods were reversed in about 3 days (2015 ⚠); Chrome has no payment rail. |
| **Version management** | **Solved at a basic level** | UserCSS `@version` plus `@updateURL`; Greasy Fork version history; Obsidian semver release tags; USw mirroring on version bump; Catppuccin date versions. Tweeks shows no version history. | User-side pinning and rollback, changelogs shown at update time, and compatibility tied to versions ("v3.2 works with YouTube as of 2026-11-18"). |
| **Site-specific component libraries** | **Not solved as a public, maintained layer** | Fragments exist: Stylish "Shopping Selectors" adds stable semantic classes to product cards; News Feed Eradicator's `sitelist.json` defines hostable regions per site; Dark Reader's per-site fix file; Catppuccin's std lib; Wildcard's per-site adapters (research, 2020 ⚠). | A maintained, versioned, semantic map of each target site's components (`yt.watch.sidebar`, `x.timeline.post`) that templates target instead of raw selectors. It would be updated centrally when the site changes, so it fixes many templates at once. **This is the enabling layer for compatibility tracking.** |

---

## 6. Genuine gaps (ranked by evidence strength)

### Gap 1: Maintenance as the product (a semantic site-adapter layer plus compatibility tracking)

**Evidence (Fact).**
- Style rot is visible in every open catalog. USw styles are marked "[DISCONTINUED]" and "[No longer works]" after YouTube's October 2022 redesign. Catppuccin says "maintainers come and go".
- Site-specific tools ship constantly to keep up:
  - Control Panel for Twitter: 31 releases in 12 months;
  - Spicetify: 56 releases in 12 months;
  - Enhancer for YouTube: a fix stuck in AMO review for weeks.
- Abandonment is punished: Iridium fell to 2.9★ and was archived; Social Fixer has had no release since 2023.
- News Feed Eradicator split its selectors into a separately versioned list on 2026-11-13, specifically to update faster "when a site breaks".
- Obsidian's guidelines show the cure is targeting stable tokens, not "overly complex selectors".
- Nobody shows users whether a template works *today*.

**Assumption.** A central, versioned, per-site component map (data, not code), maintained by the platform plus trusted maintainers and fetched outside store review (allowed: CSS/JSON is not remote code), can fix many templates with one update. Automated canaries can then publish a compatibility badge. This is the only proposed feature that is both unsolved and hard to copy quickly.

### Gap 2: Layout restructuring without the userScripts toggle

**Evidence (Fact).**
- On Chrome 138+, any JS template needs a per-extension "Allow User Scripts" toggle, off by default. Without it, `userScripts` is undefined.
- Tampermonkey, ScriptCat and Tweeks all inherit this. Complaints show users and creators confused by silent failures (Greasy Fork thread, ScriptCat review).
- CSS-only systems (Stylus, Stylebot, Opera GX, Catppuccin) avoid the problem entirely.

**Assumption.**
- A declarative layout vocabulary (hide, collapse, reorder, regrid, resize, sticky, restyle) compiled to CSS covers most "redesign" demand. Modern CSS makes this feasible: `:has()`, `order`, grid, container queries.
- JS should be an explicit, opt-in tier.
- **Risk:** the CWS clause against interpreting "complex commands fetched… as data" means the DSL must stay declarative and CSS-like. A policy read or legal review is needed before building.

### Gap 3: A trustworthy, mainstream-grade catalog

**Evidence (Fact).**
- USw: only 1,534 of 25,845 styles have any rating; duplicate categories; install counts that appear to include update traffic.
- Stylebot Gallery: no ratings or stats.
- Tweeks: no ratings; closed source with "access to all the data" criticism.
- userstyles.org: median weekly installs of 8 on the homepage sample, and run by a company whose privacy policy permits "sell" or "share" of internet-activity data.
- Firefox Color: "presets… broken… without previews".
- AMO: complaints about no moderation for NSFW content.
- Obsidian removed 16 themes for remote resources; VS Code had both missed malware and false-positive bans.

**Assumption.** No catalog combines all of:
- before/after previews;
- active-user counts;
- ratings tied to template versions;
- compatibility badges;
- moderation (no remote resources, no JS in shared templates by default);
- a credible privacy stance (open-source extension, no browsing-data collection).

### Gap 4: Personal design tokens across sites ("my look everywhere")

**Evidence (Fact).**
- Catppuccin proves demand for one design system across 136 sites: 1,151★, daily commits.
- Dark Reader proves mass demand (7M) for one global transformation.
- Both are limited: palette-only, or algorithmic.

**Assumption.** Letting a user set fonts, type scale, density, radius and palette once, and having every supported site's adapter apply them, is unoccupied. It also compounds with Gap 1, because tokens need the semantic site layer to target.

### Gap 5 (weakest): Creator economics

**Evidence (Fact).** No ecosystem pays creators per template. Donations, referrals and contests are the ceiling. Paid apps in this category stay small: Control Panel Safari has 57 ratings, Cascadea is abandoned, and Tampermonkey iOS sits at 3.10★ on 61 ratings.

**Assumption.** This is a real gap but may not be a real market. Cosmetic templates for third-party sites break on someone else's schedule, which collides with paid-product expectations (refunds, support).

---

## 7. Lessons from failures, shutdowns and controversies

1. **Monetizing users' data destroys the category's trust for years.**
   - **Fact:** Stylish's sale and its history collection led to removal from both stores in 2018.
   - In 2026 it still lists "Web history" collection, its AMO rating sits at 2.73★, and new exfiltration allegations circulate (unverified) (§3.1).
   - **Recommendation:** make "no browsing data collected, open-source client" a headline commitment, with a verifiable build.
2. **Customization tied to a browser dies with the browser.**
   - **Fact:** Arc Boosts' Gallery now redirects to "A farewell to Arc". Arc stops working on 2026-12-22 (§3.4).
   - **Recommendation:** be a cross-browser extension, and keep templates exportable in a UserCSS-compatible form so users never feel locked in.
3. **Big-company and side-project tools get abandoned.**
   - **Fact:** VisBug (Google) is archived. Firefox Color (Mozilla) has had no release since 2020. Stylebot Social died. USw feature work has stalled since April 2025.
   - **Assumption:** the platform needs revenue that funds maintenance, not just hosting.
4. **Platform changes can take you offline overnight.**
   - **Fact:** Violentmonkey spent most of 2025 broken on Chrome after MV2 was disabled. Stylus was accidentally unpublished (January 2025). Tampermonkey users must flip a toggle.
   - **Recommendation:** design for MV3 plus CSS-first from day one; keep update channels independent of store review (templates as data).
5. **Host sites can kill whole product lines.**
   - **Fact:** Better TweetDeck ended when TweetDeck was paywalled. RES went into maintenance mode, and old Reddit now requires login. Discord now sells Nitro themes.
   - **Recommendation:** don't depend on one site; prioritize value the host won't build, such as cross-site consistency and decluttering against engagement-maximizing UIs.
6. **Meta's ToS explicitly forbids impairing Facebook's "appearance".**
   - **Fact:**
     - 2012: F.B. Purity's creator was banned under §3.11.
     - 2013: Social Fixer was forced to remove features.
     - 2021: Unfollow Everything got a C&D and its developer a lifetime ban.
     - 2024: Zuckerman v. Meta was dismissed on ripeness, without prejudice, so the §230(c)(2)(B) "user empowerment" defense remains untested.
     - Sources: [TNW 2012](https://thenextweb.com/news/facebook-bans-creator-of-fb-purity-a-browser-add-on-that-lets-users-customize-the-site) ⚠, [Social Fixer 2013](https://socialfixer.com/blog/2013/10/05/facebook-requires-social-fixer-browser-extension-to-remove-key-features/) ⚠, [Knight Institute](https://knightcolumbia.org/content/federal-judge-says-challenge-in-zuckerman-v-meta-cannot-go-forward-yet) (accessed 2026-11-19).
   - **Recommendation:** exclude Facebook and Instagram at launch. Avoid automation and platform trademarks in template names, since both were cited in Barclay's C&D. Get legal review before monetizing templates for named sites.
7. **Replacing a client, rather than restyling it, invites account bans.**
   - **Fact (user reports only):** Old Twitter Layout users report X suspensions (#1222), and the extension is on its Nth "challenge solver" fix.
   - **Recommendation:** stay cosmetic; never call private APIs.
8. **Shared code is an attack surface.**
   - **Fact:**
     - Greasy Fork had an account hijack that pushed card-skimming code (February 2025).
     - VS Code had fake verified themes, plus a false-positive ban of Material Theme.
     - Obsidian removed 16 themes for remote resources.
     - Arc disallowed sharing JS Boosts.
   - **Recommendation:** shared templates are CSS/data-only by default with no remote resources; require 2FA and signed releases for creators; publish a transparent takedown and appeals process.
9. **Paid community content triggers backlash when quality isn't guaranteed.**
   - **Fact:** Valve reversed paid mods in about 3 days (2015 ⚠). Greasy Fork's "antifeature" taxonomy treats payment as a negative.
   - **Recommendation:** pilot monetization on the *user* side first (Dark Reader-style one-time fee or Plus), with tips or a revenue pool for creators, before any per-template paywall.
10. **AI bolted onto a beloved tool alienates core users.**
    - **Fact:** Stylebot v4's chat drew "vibecoded AI slop" reviews and was removed within two days (v4.0.2).
    - **Recommendation:** AI as an optional authoring assistant that outputs reviewable declarative templates, not a chatbot-centric UX.
11. **Store review latency multiplies breakage.**
    - **Fact:** Enhancer's fix waited from 2026-01-30 for AMO review.
    - **Recommendation:** ship template and adapter updates as data outside the extension binary. The CWS RHC policy allows remote CSS and JSON.
12. **Community infrastructure starves.**
    - **Fact:** USw runs on donations (Open Collective about $75/yr, if cents). Catppuccin has 12 unmaintained ports.
    - **Assumption:** a curated marketplace needs a funded core team; volunteer-only models produce rot.

---

## 8. Platform and legal constraints that shape the product

All **Fact** unless marked. Sources are in §3.2 and §3.6.

- **Chrome MV3:**
  - Remote CSS and JSON are allowed; remote JS is not.
  - Interpreters for remotely fetched "complex commands" are prohibited.
  - User JS needs `chrome.userScripts` plus the per-extension toggle (off by default).
  - User scripts are cleared on extension update.
  - MV2 has been fully removed from CWS since 2026-08-31.
- **Firefox:** MV3 userScripts (Fx 136+) as an optional runtime permission, with a less hostile UX.
- **Safari:** extensions ship inside App Store apps (Userscripts, Cascadea, Control Panel); a paid upfront app is possible.
- **Payments:** CWS has no payment rail (deprecated 2021); you need your own merchant of record. Notion's 8% plus $0.40 model is the reference.
- **Detection:**
  - LinkedIn probes for 6,236 extension IDs.
  - **Assumption:** Chrome's fixed extension IDs make the product detectable by hostile sites; Firefox randomizes internal UUIDs.
- **Legal:** Meta's ToS "appearance" clause; trademark use in template names; X's anti-automation measures. **Assumption:** YouTube, X and Reddit have shown no history of legal action against purely cosmetic extensions in the sources we read. Not proof of safety.

---

## 9. Competitor threat ranking

Each entry is an **Assumption** based on the Facts above.

1. **Stylebot v4: highest overlap, underestimated.**
   - Already shipped: a visual editor, Gallery with preview and install, auto-update, `@var` options, profiles, a "survives site updates" selector strategy, an AI-agent CLI, and Safari support.
   - It has 200K users and could add ratings and install counts in a weekend.
   - Weaknesses: one maintainer, a tiny gallery, the AI backlash.
2. **Tweeks: the AI-native challenger with capital.**
   - YC-backed, with 4K+ public tweeks, creator install counts, MCP, Firefox support and a 351-point HN launch.
   - Its gaps (no settings, versions, compatibility or ratings; raw-JS trust problem; toggle friction) are exactly the founder's proposed differentiators. Expect it to close some of them.
3. **Opera GX Mods: an existing at-scale store for CSS web-modding packages.**
   - 12,173 mods on a 34M-MAU browser.
   - Not a cross-browser threat, but proof that the packaged-redesign concept is already mainstream for one audience.
4. **Google, Gemini in Chrome: latent.**
   - No persistent restyling today.
   - If it ships "always apply this change to this site", the AI-authoring half of the market commoditizes overnight.
   - Marketplaces with maintained, compatibility-checked templates would still have value. That is Gap 1 again.
5. **Stylish: big numbers, weak threat.**
   - 2M Chrome users, but a data-broker owner, a frozen Firefox build and a young, casual catalog.
   - Its "Shopping Selectors" semantic layer shows Similarweb understands the adapter idea.
6. **Tampermonkey/Violentmonkey plus Greasy Fork: the incumbent runtime for power users.**
   - Not design-oriented, but they own the JS tier, and MCP makes AI-written scripts easy for technical users.

---

## 10. Recommendations

All **Recommendation**, derived from §5–8.

1. **Don't compete on format; interoperate.** Import and export UserCSS (`@var`, `@-moz-document`, `@version`, `@updateURL`) so the Stylus, USw and Catppuccin supply can be onboarded. Add the metadata nobody has:
   - target adapter version;
   - verified-working date;
   - preview assets;
   - variant definitions.
2. **Make the moat the site-adapter layer plus compatibility CI.** For each launch site:
   - publish a semantic component map;
   - run scheduled headless checks (do selectors resolve? screenshot diff of key templates);
   - show per-template status: "Working / Degraded / Broken, last checked <date>".
   - Fix the adapter once and it repairs many templates.
3. **Engine: CSS and declarative first; JS opt-in.** This covers most redesigns with zero Chrome toggle friction. JS templates go in a separate, clearly labelled tier with onboarding for the toggle, and are not shareable by default (Arc precedent).
4. **Launch scope: YouTube, X, Reddit.** These have the largest demand: Greasy Fork by-site counts, 1M-user YouTube declutterers, a 200K-user X panel. Defer Facebook and Instagram (legal history, obfuscated atomic classes) and LinkedIn (weak demand, extension probing).
5. **Catalog quality over size:**
   - before/after previews rendered by the compatibility CI;
   - active-user counts, not update hits;
   - ratings scoped to version;
   - editorial collections;
   - takedown and appeals;
   - creator 2FA.
6. **AI as an authoring assistant that outputs declarative templates against the adapter layer.** This beats Tweeks on robustness and reviewability. It should not be the core UX (Stylebot lesson).
7. **Monetization sequencing:**
   - (a) user-side Pro: sync, personal tokens, early access; Dark Reader's one-time model is proven;
   - (b) creator tips plus a usage-weighted revenue pool;
   - (c) paid templates only after compatibility guarantees exist, with your own merchant of record and refund rules tied to compatibility status.
8. **Time-boxed opportunity: Arc refugees.** Arc stops working on 2026-12-22. Ship a "bring your Boosts" landing page and, if feasible, an importer. Arc's export format is unverified; investigate before promising.
9. **Trust positioning:** an open-source client, zero browsing-data collection, a published security model, and no remote resources in shared templates. This is explicit counter-positioning against Stylish (data broker) and Tweeks (closed source with all-site access).

---

## 11. Open questions / unverified items

- What "PRO STYLE" / `isPremium` on userstyles.org costs or unlocks.
- Tweeks pricing, real active users versus the "25k+" claim, and whether it has versioning.
- Whether Arc Boosts can be exported (format, file location).
- Opera GX per-mod download counts and whether mods support settings.
- Greasy Fork's total live script count.
- Discord's and Spotify's current official ToS statements on client mods.
- The exact `@-moz-document` function support in Stylus docs (`regexp()`, `url()`).
- Whether Zuckerman v. Meta was refiled after 2024.
- Reddit-sourced complaints. Reddit blocked automated fetches, so the complaints here come from store reviews, GitHub, HN and forums.

---

## 12. Sources

All accessed 2026-11-19. ⚠ marks sources more than about 2 years old.

**Chrome and Firefox platform**
- https://developer.chrome.com/docs/extensions/reference/api/userScripts
- https://developer.chrome.com/blog/chrome-userscript (2025-05-29)
- https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline
- https://developer.chrome.com/webstore/cws-payments-deprecation
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts
- https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/136

**Stylus**
- https://chromewebstore.google.com/detail/clngdbkpkpeebahjckkjfobafhncgmne
- https://addons.mozilla.org/api/v5/addons/addon/styl-us/
- https://github.com/openstyles/stylus
- https://github.com/openstyles/stylus/wiki/Writing-UserCSS
- https://github.com/openstyles/stylus/releases
- https://github.com/openstyles/stylus/blob/master/src/manifest-mv3.json
- https://github.com/openstyles/stylus/blob/master/src/popup/search.js
- https://github.com/openstyles/stylus/blob/master/src/content/style-injector.js
- https://github.com/openstyles/stylus/blob/master/src/js/prefs.js
- https://github.com/openstyles/stylus/blob/master/src/js/sync-util.js
- Issues: https://github.com/openstyles/stylus/issues/1878 · /1912 · /1999 · /1853
- https://addons.mozilla.org/api/v5/ratings/rating/2175633/

**Stylebot**
- https://chromewebstore.google.com/detail/oiaejidbmkiecgbjeifoejpgmdaleoha
- https://addons.mozilla.org/api/v5/addons/addon/stylebot-web/
- https://github.com/ankit/stylebot
- https://github.com/ankit/stylebot/releases
- https://github.com/ankit/stylebot/pull/1190
- https://github.com/ankit/stylebot/issues/1183
- https://gallery.stylebot.dev/
- https://gallery.stylebot.dev/sites
- https://addons.mozilla.org/api/v5/ratings/rating/2766739/
- https://news.ycombinator.com/item?id=50105251

**Stylish and userstyles.org**
- https://chromewebstore.google.com/detail/fjnbnpbmkenffdnngjfgmeleoegfcffe
- https://addons.mozilla.org/api/v5/addons/addon/stylish/
- https://userstyles.org/
- https://userstyles.org/privacy-policy
- https://userstyles.org/help/shopping-selectors
- https://userstyles.org/styles/253057/youtube-flowers
- https://en.wikipedia.org/wiki/Stylish_(software)
- https://robertheaton.com/2018/07/02/stylish-browser-extension-steals-your-internet-history/ ⚠
- https://www.ghacks.net/2018/07/03/it-is-time-to-get-rid-of-stylish/ ⚠
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/kq8vUDQ5Znc
- https://addons.mozilla.org/api/v5/ratings/rating/2717470/ · /2717143/

**USO Archive, UserStyles.world, Catppuccin**
- https://github.com/uso-archive/data
- https://uso.kkx.one
- https://github.com/userstyles-world/userstyles.world
- https://userstyles.world/docs/faq
- https://userstyles.world/api/index/uso-format
- https://opencollective.com/userstyles.json
- https://userstyles.world/style/5096
- https://userstyles.world/style/4623
- https://github.com/catppuccin/userstyles
- https://github.com/catppuccin/userstyles/blob/main/styles/youtube/catppuccin.user.less
- https://github.com/catppuccin/userstyles/blob/main/docs/src/content/docs/getting-started/usage.mdx
- https://github.com/catppuccin/userstyles/blob/main/docs/src/content/docs/contributing/maintainers/reviewing.md

**Dark Reader, Firefox Color, minor CSS managers**
- https://chromewebstore.google.com/detail/eimadpbcbfnmbkopoojfekhnkhdbieeh
- https://addons.mozilla.org/api/v5/addons/addon/darkreader/
- https://github.com/darkreader/darkreader/blob/main/CONTRIBUTING.md
- https://github.com/darkreader/darkreader/blob/main/src/defaults.ts
- https://darkreader.org/support-us/
- https://darkreader.org/plus/
- https://opencollective.com/darkreader.json
- Dark Reader reviews: https://addons.mozilla.org/api/v5/ratings/rating/2754279/ · /2735538/ · /2782787/
- https://addons.mozilla.org/api/v5/addons/addon/firefox-color/
- https://github.com/mozilla/FirefoxColor
- Firefox Color reviews: https://addons.mozilla.org/api/v5/ratings/rating/2235576/ · /2178009/
- https://addons.mozilla.org/api/v5/addons/addon/xstyle/
- https://apps.apple.com/app/cascadea/id1432182561
- https://apps.apple.com/us/app/id1581824571?l=en-us

**Userscript managers**
- Tampermonkey: https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo · https://addons.mozilla.org/api/v5/addons/addon/tampermonkey/ · https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/iikmkjmpaadaobahmlepeloendndfphd · https://www.tampermonkey.net/changelog.php?more=true&old=&show=dhdg · https://www.tampermonkey.net/faq.php?q=Q209 · https://github.com/Tampermonkey/tampermonkey · https://en.wikipedia.org/wiki/Tampermonkey · https://itunes.apple.com/lookup?id=6738342400&country=us · https://addons.mozilla.org/api/v5/ratings/rating/2661833/
- Violentmonkey: https://chromewebstore.google.com/detail/jinjaccalgkegednnccohejagnlnfdag · https://addons.mozilla.org/api/v5/addons/addon/violentmonkey/ · https://github.com/violentmonkey/violentmonkey/releases · https://github.com/violentmonkey/violentmonkey/releases/tag/v2.50.0 · https://github.com/violentmonkey/violentmonkey/issues/2340 · https://github.com/violentmonkey/violentmonkey/issues/2341 · https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/reviews/
- ScriptCat: https://chromewebstore.google.com/detail/ndcooeababalnlpkfedmmbbbgkljhpjf (and /reviews) · https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/liilgpjgabokdklappibcjfablkpcekh · https://addons.mozilla.org/api/v5/addons/addon/scriptcat/ · https://scriptcat.org/api/v2/scripts?page=1&count=1 · https://docs.scriptcat.org/en/docs/dev/config/ · https://docs.scriptcat.org/en/docs/dev/subscribe/ · https://docs.scriptcat.org/en/docs/dev/agent/
- Others: https://addons.mozilla.org/api/v5/addons/addon/greasemonkey/ · https://addons.mozilla.org/api/v5/addons/addon/firemonkey/ · https://github.com/quoid/userscripts · https://itunes.apple.com/lookup?id=1463298887&country=us

**Userscript repositories**
- Greasy Fork: https://greasyfork.org/en · https://greasyfork.org/en/help/code-rules · https://greasyfork.org/en/help/antifeatures · https://greasyfork.org/en/help/meta-keys · https://greasyfork.org/en/help/api · https://greasyfork.org/en/help/credits · https://api.greasyfork.org/scripts/by-site.json · https://github.com/greasyfork-org/greasyfork/blob/master/Gemfile
- Greasy Fork discussions: https://greasyfork.org/discussions/greasyfork/273335-need-to-find-someway-to-alert-the-users-that-developer-mode-is-required-for-tm-mv3 · https://greasyfork.org/discussions/greasyfork/268441-new-feature-optional-2fa-logins
- https://www.waze.com/discuss/t/urgent-two-scripts-were-compromised-on-feb-1-please-read-if-you-use-scripts/365499
- OpenUserJS: https://openuserjs.org/ · https://github.com/OpenUserJS/OpenUserJS.org

**AI modifiers**
- Tweeks: https://www.tweeks.io/ · https://www.tweeks.io/llms.txt · https://www.tweeks.io/t/0cf68ee6301e457b90bbbfa4 · https://news.ycombinator.com/item?id=45916525 · https://gigazine.net/gsc_news/en/20251114-web-tweeks-ai/ · https://chromewebstore.google.com/detail/fmkancpjcacjodknfjcpmgkccbhedkhc · https://addons.mozilla.org/api/v5/addons/addon/tweeks/ · https://addons.mozilla.org/api/v5/ratings/rating/?addon=tweeks
- Robomonkey: https://robomonkey.io · https://chromewebstore.google.com/detail/jcecflpagdbnadafgpbofkcodldfmdni
- Smaller tools: https://chromewebstore.google.com/detail/cfchhckkobkelfckakndahnlnnjmjngn · https://chromewebstore.google.com/detail/hogmlmglhijddadgjjcbhehfiejpbeac · https://chromewebstore.google.com/detail/anmpijcpaobaabcdncjjmnhdeibipmko · https://www.cuttlefox.com/ · https://thisisrobin.ai · https://news.ycombinator.com/item?id=46800484 · https://www.contentgrip.com/coframe-ai-websites-funding/
- Browser AI: https://9to5google.com/2026/04/14/gemini-in-chrome-skills/ · https://developer.chrome.com/docs/devtools/ai-assistance/styling · https://piunikaweb.com/2026/10/16/dia-update-github-live-groups-custom-skills/ · https://9to5mac.com/2026/07/09/openai-is-discontinuing-chatgpt-atlas-its-standalone-desktop-browser/ · https://techcrunch.com/2025/12/11/opera-wants-you-to-pay-20-a-month-to-use-its-ai-powered-browser-neon · https://9to5mac.com/2026/10/27/firefoxs-ai-powered-smart-window-gets-form-autofill-and-website-monitoring/
- Research: https://geoffreylitt.com/wildcard ⚠

**Arc and browsers**
- Arc: https://arc.net/ · https://tidbits.com/2026/10/26/the-browser-company-kicks-arc-to-the-curb-on-22-december-2026/ · https://browsercompany.substack.com/p/letter-to-arc-members-2025 · https://www.engadget.com/big-tech/atlassian-is-buying-arc-maker-the-browser-company-for-610-million-145236236.html · https://www.businesswire.com/news/home/20251021473486/en/Atlassian-Completes-Acquisition-of-The-Browser-Company-of-New-York · https://techcrunch.com/?p=2549048 ⚠ · https://techcrunch.com/2023/10/03/arc-browsers-new-ai-powered-features-combine-openai-and-anthropics-models ⚠
- Opera GX: https://press.opera.com/?p=2999 ⚠ · https://github.com/opera-gaming/gxmods · https://store.gx.me/mods/ · https://blogs.opera.com/news/2023/05/gx-gamemaker-browser-mod-jam/ ⚠ · https://forums.opera.com/topic/61370/ · https://www.fool.com/earnings/call-transcripts/2026/04/21/opera-opra-q4-2025-earnings-call-transcript/
- Vivaldi: https://help.vivaldi.com/desktop/tools/page-actions/ · https://themes.vivaldi.net/
- Chrome, Firefox: https://9to5google.com/2023/05/23/customize-chrome-side-panel/ ⚠ · https://github.com/MrOtherGuy/firefox-csshacks/blob/master/README.md
- Zen, Brave: https://raw.githubusercontent.com/zen-browser/theme-store/main/themes.json · https://docs.zen-browser.app/themes-store/themes-marketplace-submission-guidelines · https://brave.com/privacy-updates/32-custom-scriptlets/

**Visual editors**
- VisBug: https://chromewebstore.google.com/detail/cdockenadnadldjbbgcallicgledbeoc · https://addons.mozilla.org/api/v5/addons/addon/visbug/ · https://github.com/GoogleChromeLabs/ProjectVisBug/issues/141 · https://github.com/GoogleChromeLabs/ProjectVisBug/issues/693
- Magic CSS: https://chromewebstore.google.com/detail/ifhikkcafabcgolfjegfcgloomalapol · https://github.com/webextensions/live-css-editor
- Amino: https://chromewebstore.google.com/detail/pbcpfbcibpcbfbmddogfhcijfpboeaaf (and /reviews)
- CSS Scan: https://chromewebstore.google.com/detail/gieabiemggnpnminflinemaickipbebg (and /reviews) · https://getcssscan.com/

**Site-specific extensions**
- YouTube: https://chromewebstore.google.com/detail/ponfpcnoihfmfllpaingbgckeeldkhle · https://chromewebstore.google.com/detail/bnomihfieiccainjcjblhegjgglakjdd · https://chromewebstore.google.com/detail/khncfooichmfjbepaaaebmommgaepoid · https://chromewebstore.google.com/detail/bbeaicapbccfllodepmimpkgecanonai · https://chromewebstore.google.com/detail/gbjmgndncjkjfcnpfhgidhbgokofegbl · https://chromewebstore.google.com/detail/enamippconapkdmgfgjchkhakpfinmaj · https://chromewebstore.google.com/detail/mnjggcdmjocbbbhaepdhchncahnbgone · https://github.com/ParticleCore/Iridium · https://dearrow.ajay.app/ · https://unhook.app/
- Enhancer reviews: https://addons.mozilla.org/api/v5/ratings/rating/2582051/ · /2281117/
- X: https://chromewebstore.google.com/detail/kpmjjdhbcfebfjgdnpjagcndoelnidfj · https://soitis.dev/control-panel-for-twitter · https://itunes.apple.com/lookup?id=1668516167&country=us · https://chromewebstore.google.com/detail/jgejdcdoeeabklepnkdbglgccjpdgpmf · https://github.com/dimdenGD/OldTwitter · https://github.com/dimdenGD/OldTwitter/releases · https://github.com/dimdenGD/OldTwitter/issues/1222 · https://github.com/dimdenGD/OldTweetDeck/issues/459 · https://chromewebstore.google.com/detail/pobhoodpcipjmedfenaigbeloiidbflp · https://github.com/eramdam/BetterTweetDeck ⚠
- Reddit: https://chromewebstore.google.com/detail/kbmfpngjjgdllneeigpgjifpgocmfgmb · https://chromewebstore.google.com/detail/dneaehbmnbhcippjikoajpoabadpodje · https://alternativeto.net/news/2022/2/reddit-enhancement-suite-will-go-on-life-support-maintenance-mode--no-new-features-implemented ⚠ · https://mjtsai.com/blog/2026/07/03/old-reddit-now-requires-logging-in/ · https://alternativeto.net/news/2026/10/reddit-is-killing-rss-feeds-and-restricting-access-to-old-reddit-blames-ai-scrapping-bots/
- Multi-site and LinkedIn: https://chromewebstore.google.com/detail/fjcldmjmjhkklehbacihaiopjklihlgg · https://github.com/jordwest/news-feed-eradicator-lists · https://jordwest.github.io/news-feed-eradicator-lists/sitelist.json · https://chromewebstore.google.com/detail/cnlacdcphogkgibckgbkfkpghldbklhk · https://www.bleepingcomputer.com/news/security/linkedin-secretely-scans-for-6-000-plus-chrome-extensions-collects-data/
- Facebook: https://socialfixer.com/

**Legal**
- https://thenextweb.com/news/facebook-bans-creator-of-fb-purity-a-browser-add-on-that-lets-users-customize-the-site ⚠
- https://socialfixer.com/blog/2013/10/05/facebook-requires-social-fixer-browser-extension-to-remove-key-features/ ⚠
- https://knightcolumbia.org/content/federal-judge-says-challenge-in-zuckerman-v-meta-cannot-go-forward-yet
- https://blog.ericgoldman.org/?p=27056

**Analogous ecosystems**
- Discord: https://betterdiscord.app/themes · https://github.com/Vendicated/Vencord · https://discord.com/blog/bring-your-vibe-to-discord-with-new-themes-in-nitro · https://alternativeto.net/news/2025/9/discord-introduces-custom-theme-support
- Spicetify: https://spicetify.app/docs/faq · https://github.com/spicetify/marketplace/wiki/Publishing-to-Marketplace · https://github.com/spicetify/marketplace/blob/main/src/logic/FetchRemotes.ts
- Obsidian: https://github.com/obsidianmd/obsidian-releases · https://docs.obsidian.md/Themes/App+themes/Submit+your+theme · https://docs.obsidian.md/Themes/App+themes/Theme+guidelines · https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugin-stats.json · https://github.com/community-archive/obsidian-style-settings
- VS Code: https://scworld.com/news/microsoft-restores-vs-code-theme-flagged-as-malicious-we-messed-up · https://www.bleepingcomputer.com/news/security/malicious-vscode-extensions-with-229m-installs-found-on-microsoft-marketplace/
- Paid marketplaces: https://www.notion.com/help/selling-on-marketplace · https://www.engadget.com/2015/04/27/valve-reverses-skyrim-mod-payments/ ⚠
