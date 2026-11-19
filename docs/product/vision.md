# Vision & Opportunity Assessment

> Working brand: **Reweave** (pending clearance, see `docs/research/naming-research.md`). Code name: `reskin`.

## 1. One sentence

**The sites you live on, redesigned by the community — and kept working when those sites change.**

## 2. Honest opportunity assessment

**Verdict: the original idea is weak as stated; a narrower version is worth building as a lean, open-source-first product with a modest business ceiling.**

What's weak about the original framing ("a marketplace where anyone redesigns any site, monetized by premium templates"):

| Assumption in the original idea | What the research shows | Source |
|---|---|---|
| Templates with URL rules + settings are new | Stylus UserCSS already does URL rules, typed `@var` settings, versioned auto-update; 1M CWS users, free | competitor-analysis §0 |
| A community gallery is the differentiator | Stylebot v4 shipped a Gallery, previews, profiles, `@var` options, "selectors that keep working" (Oct–Nov 2026); 200K users | competitor-analysis §3.1 |
| Creators will sell premium templates | CSS is plaintext and copyable; Greasy Fork labels paid scripts an "antifeature"; Valve reversed paid mods in 3 days; Figma stopped approving new paid-file sellers | business-model §2, competitor-analysis §6 Gap 5 |
| Users pay for customization | Category is free/donation-funded; Social Fixer: ~1.5% ever donated; Dark Reader uses a voluntary $9.99 | business-model §1 |
| Facebook is a good first target | Meta's ToS bans changing Facebook's "appearance"; enforcement in 2012, 2013, 2021; obfuscated class names | competitor-analysis §8 |

What's genuinely open (ranked by evidence):

1. **Maintenance as the product.** Style rot is everywhere ("[No longer works]" after YouTube's 2022 redesign; Control Panel for Twitter needed 31 releases in 12 months). Nobody tells users whether a template works *today*. A versioned adapter layer + compatibility checks is unsolved and hard to copy quickly.
2. **Layout restructuring without JavaScript.** Script-based tools need Chrome's "Allow User Scripts" toggle (off by default since Chrome 138). Modern CSS (`:has()`, grid, `order`, container queries) covers most redesign needs with zero friction.
3. **A trustworthy, mainstream-grade catalog.** UserStyles.world: 25,845 styles, only 1,534 rated, ~$75/yr donations; userstyles.org is owned by Similarweb and carries a data-collection stigma.
4. **"My look everywhere."** Catppuccin proves demand for one palette across many sites (136 ports) but is palette-only. Standard design tokens make any token-aware template wear any palette.
5. **Time-boxed: Arc refugees.** Arc stops working on 2026-12-22 and Boosts go with it.

## 3. Why this could fail (read before investing months)

1. **Stylebot closes the gap first.** It's one maintainer away from ratings + install counts. Our edge must be compatibility tracking and catalog quality, shipped fast.
2. **AI makes templates disposable.** If Gemini in Chrome (or Tweeks) ships "always apply this change to this site", casual users generate instead of browsing. Mitigation: maintained templates still beat brittle one-offs; offer AI-assisted authoring *against adapters* later.
3. **Users don't keep redesigns installed.** Novelty installs, then uninstall. The beta must measure 30-day retention before any backend work.
4. **Maintenance cost exceeds revenue.** Adapter upkeep for 3 fast-moving sites is a permanent job. Business-model realistic scenario: ~$534 MRR at month 24. This is side-project money unless something goes viral.
5. **Platform risk.** Sites can obfuscate DOMs, detect the extension, or change ToS; CWS policy interpretation can change.
6. **Creator cold start.** Creators go where users are; users go where templates are. Mitigation: we seed templates ourselves, import UserCSS, recruit existing userstyle authors.

## 4. What we will build (strategy)

1. **Phase 1 — Useful alone (M0–M6):** Chrome extension, local-first, YouTube → Reddit → X, curated templates we build ourselves, settings + palettes, compatibility badges from on-device probes, local creator mode, UserCSS import. Free, open source.
2. **Phase 2 — Community (M7–M8):** GitHub-PR-based publishing, signed catalog on R2, static marketplace site with before/after previews, compatibility CI on logged-out pages, public status page.
3. **Phase 3 — Sustainability (M9+, only if Phase 2 metrics pass):** accounts, sync, supporter payment, Pro ($3.99/mo or $29/yr), creator tips; Firefox, then more sites by vote.

## 5. Long-term vision (if it works)

A maintained visual layer for the web's biggest sites: a library of community designs, each with an honest "works today" badge; a standard token system so your palette follows you; adapters maintained as an open commons; creators recognized (and eventually rewarded via tips and a usage-weighted Pro revenue pool). Possible later wedge: teams standardizing internal-tool UIs, but there's **no evidence yet** of a paid market there (business-model §5), so it stays a hypothesis.

## 6. Success criteria for the first 6 months

See `mvp-scope.md` §4 for the validation gates and their thresholds.
