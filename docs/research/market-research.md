# Market Research

**Status: partial.** The dedicated demand-research pass was stopped before it wrote its findings:
- Reddit threads were not systematically mined.
- Chrome Web Store reviews were not mined beyond what the competitor analysis quotes.
- Product Hunt was not scanned.

This document puts together the demand evidence already gathered in [`competitor-analysis.md`](competitor-analysis.md) and [`business-model.md`](business-model.md). The original URLs are cited there, all accessed 2026-11-19. The remaining unknowns are left to the beta's validation gates (`docs/product/mvp-scope.md` §4), not to more desk research.

## 1. Is there demand? Install-count proxies

| Segment | Product | Users | Source |
|---|---|---|---|
| Dark mode | Dark Reader | 7M Chrome; 1.36M Firefox daily users | competitor-analysis §2 |
| Userscripts (power users) | Tampermonkey | 12M Chrome; 13.9M Edge | competitor-analysis §2 |
| General CSS managers | Stylish / Stylus / Stylebot | 2M / 1M / 200K Chrome | competitor-analysis §2 |
| YouTube declutter/enhance | Enhancer for YouTube / Unhook / ImprovedTube | 1M / 1M (4.9★) / 400K | competitor-analysis §3.6 |
| X control | Control Panel for Twitter | 200K | competitor-analysis §3.6 |
| Reddit | Reddit Enhancement Suite | 1M (maintenance mode since 2022) | competitor-analysis §3.6 |
| Cross-site feed removal | News Feed Eradicator | 200K | competitor-analysis §3.6 |
| Packaged redesigns (one browser) | Opera GX Mods | 12,173 mods in the store; Opera GX has 34M MAU | competitor-analysis §3.4 |
| Cross-site palette | Catppuccin userstyles | 136 site ports; 1,151 GitHub stars | competitor-analysis §2 |
| AI site modding | Tweeks | 7K Chrome users; 4K+ public tweeks; 351-point Launch HN | competitor-analysis §3.3 |

**Fact-based conclusion.** Demand for *changing how sites look and behave* is large and proven: millions of installs.

**Assumption.** That demand clusters around specific outcomes, chiefly dark mode and removing distractions (Unhook: 1M users, 4.9★). Open-ended "redesign anything" demand is much smaller. Stylus and Stylebot together have about 1.2M Chrome users, against 7M for Dark Reader alone.

## 2. Why people install these tools (assumed motivations, ranked by proxy size)

1. Eye comfort / dark mode (Dark Reader).
2. Focus and digital wellbeing: hiding Shorts, feeds and recommendations (Unhook, News Feed Eradicator).
3. Restoring or controlling layouts after redesigns (Control Panel for Twitter, Old Reddit Redirect, the old-Twitter-layout projects).
4. Aesthetic identity and "ricing" (Catppuccin, Opera GX Mods).
5. Power-user automation (Tampermonkey). This is outside our declarative scope.
6. Accessibility. **Not researched**; needs validation.

## 3. What existing tools fail at (evidence from competitor-analysis)

- **Style rot.**
  - UserStyles.world styles are marked "[No longer works]" after YouTube's 2022 redesign.
  - Control Panel for Twitter shipped 31 releases in 12 months to keep up with X.
  - Iridium was archived at 2.9★.
  - News Feed Eradicator moved its selectors into a separately versioned list on 2026-11-13.
- **Script friction.** Chrome 138+ requires a per-extension "Allow User Scripts" toggle. The recurring complaint is that scripts "silently don't run".
- **Discovery and trust.**
  - userstyles.org is owned by Similarweb and carries a data-collection stigma.
  - UserStyles.world has 25,845 styles, but only 1,534 have any rating.
- **Over-reach.** Stylebot v4's AI pivot drew backlash ("turned it into vibecoded AI slop").

## 4. Complete redesigns vs. tweaks

- **Evidence for packaged redesigns:**
  - Opera GX Mods: 12,173 mods built from CSS-only bundles matched to URLs.
  - Arc Boosts had a gallery before Arc was sunset.
  - Catppuccin ships a one-file import for its whole palette.
- **Evidence for tweaks:** the largest single-site tools (Unhook, Enhancer) are toggle panels, not redesigns.
- **Implication.** Templates should **combine both**: a coherent look *plus* settings toggles. Curated templates lead with *Focus* and *Compact* (outcome-driven); *Calm* (aesthetic) comes third. See `mvp-scope.md` §2.

## 5. Is a creator marketplace viable?

| Signal | Reading |
|---|---|
| Creators exist | Yes: thousands of userstyles, scripts and Opera GX mods |
| Creators engage with each other | Weakly: USw is mostly unrated, and its donations come to about $75/yr |
| Anyone pays creators | Rarely: Opera pays only through contests, and Greasy Fork labels paid scripts an "antifeature" (business-model §1–2) |

**Assumption.** A *creator community* is viable. A *paid marketplace* is not, at least early. This matches D-009.

## 6. Most promising initial audiences

See `docs/product/positioning.md` §1. In short:
1. Focus and density seekers on YouTube, Reddit and X.
2. Theming enthusiasts, as early adopters and creators.
3. Existing userstyle authors.
4. Arc refugees, in a window that closes on 2026-12-22.

## 7. Opportunity sizing (bottom-up, explicit assumptions)

| Step | Assumption | Value |
|---|---|---|
| A. Users of YouTube/Reddit/X customization tools plus CSS managers (Chrome, with overlap) | Sum of §1's site-specific and CSS-manager rows, discounted 50% for overlap | ≈ 3M |
| B. Users who would consider a *template* product over toggles | 10–20% of A | 300K–600K |
| C. Users we can reach in 24 months without paid acquisition | 5–10% of B | 15K–60K installs |
| D. Long-term active | ~30% of C (business-model §8) | 5K–18K WAU |

This range matches the business-model realistic scenario of about 38.5K installs and 12.9K WAU at month 24. That is a **real but small** opportunity: enough for a sustainable open-source project and possibly a modest Pro income, not a venture-scale market. Upside would need a viral template, or an expansion beyond the first sites into areas where people pay (unproven).

## 8. Gaps to close cheaply (instead of more desk research)

| Gap | Cheap validation | When |
|---|---|---|
| Real willingness to switch from Unhook or Stylus | Landing page + waitlist + 5 user interviews | During M2–M3 |
| Which site first after YouTube | "Request this site" votes in the extension | Beta |
| Accessibility demand | One curated accessibility template; measure installs | Beta |
| Creator interest | Outreach to 20 userstyle authors (Catppuccin, USw) | Before M7 |
