# Business Model Research: Community Redesign Templates for Existing Websites

Status: research draft, written 2026-11-19. Scope: monetization evidence, pricing, payment costs, infrastructure costs, and 24-month scenarios for a browser extension + web platform that applies community-made CSS + JSON "redesign templates" to sites such as YouTube, Facebook, X, Reddit and LinkedIn. Backend: Cloudflare Workers / D1 / R2.

**Labels used throughout**
- **Fact**: verified against the cited source on 2026-11-19.
- **Assumption**: my modelling input. It is not market data. Each one has a stated rationale.
- **Recommendation**: what I would do, given the facts and assumptions.
- "unverified": I could not confirm it from a primary source.

---

## 0. Verdict (read this first)

1. **This category mostly runs on free tools and donations.** The leading userstyle and userscript managers are free and open source (Stylus, Stylebot, Violentmonkey, Greasy Fork), or ask for voluntary payment (Tampermonkey, Dark Reader, Social Fixer). The paid products that work sell *one utility to individuals* (Night Eye, $9/yr) or a *branded bundle backed by a large free audience* (Dracula PRO, $79). Nobody I found runs a profitable *marketplace* of paid CSS themes for third-party websites.
2. **Paid per-template sales are a weak primary model.** CSS is plaintext. Several ecosystems ban obfuscation. Every merchant-of-record provider I checked (Paddle, Polar, Stripe Managed Payments) excludes marketplaces. Fixed card fees take 15–27% of a $3 sale.
3. **Infrastructure is not the risk.** With a cache-first design, Cloudflare costs stay at the $5/mo Workers Paid minimum up to about 100k weekly active users (WAU), and reach about $50/mo at 1M WAU. The real costs are labor: moderation, fixing templates when target sites change their markup, and support.
4. **Realistic 24-month outcome (Assumption-driven):** about 38k cumulative installs, about 13k WAU, about 190 paying users, about **$530 MRR at month 24**, and about **$3.8k cumulative net over 24 months** before the founder's time. That is a side project, not a salary. Netting $5k/mo needs about 140k WAU at 1.5% conversion.
5. **Recommended model:** keep the core free (apply, create, share and use all community templates) and sell a small **Pro subscription** ($3.99/mo or $29/yr, plus an optional lifetime tier). Pro sells convenience and power: cloud sync, private and unlisted templates, advanced editor, per-site schedules and profiles, and early access. Delay any creator marketplace until there is demand evidence. When it comes, start with tips and "bring-your-own-storefront" licensing (Gumroad or Ko-fi), not an in-house payout system.

---

## 1. Comparable monetization evidence

### 1.1 Browser customization, theming and userscript tools

| Product | How it makes money (verified) | Notes / relevance |
|---|---|---|
| **Stylus** (userstyles manager) | **Fact:** No monetization stated. GPL-3.0. "No analytics/tracking - this is our foundational principle." It was created because "the original Stylish extension was sold to a Web analytics company." [GitHub](https://github.com/openstyles/stylus) (accessed 2026-11-19). 7.0k stars. | The direct free substitute for this product. Any paid feature competes with "free + open source + no tracking." |
| **Stylish** (cautionary tale) | **Fact:** After SimilarWeb acquired it (Chrome version Jan 2017, Firefox version Mar 2018), Stylish sent users' full browsing data to its servers. Google and Mozilla pulled it in July 2018. [gHacks](https://www.ghacks.net/2018/07/03/it-is-time-to-get-rid-of-stylish/), [SC World](https://www.scworld.com/news/google-mozilla-boot-stylish-from-add-on-stores-after-it-collects-data-on-browsing-histories) (accessed 2026-11-19). | Data monetization is the "easy" business model for an extension with all-sites permissions, and it destroys trust. Rule it out explicitly. |
| **Stylebot** | **Fact:** MIT-licensed, open source, 1.7k stars, no paid tier found. [GitHub](https://github.com/ankit/stylebot) (accessed 2026-11-19). | Free point-and-click CSS editor, the substitute for an "advanced editor." |
| **Tampermonkey** | **Fact:** It asks users to "make a small contribution" ([FAQ Q501](https://www.tampermonkey.net/faq.php?q=Q501)). Its contribute page says "Thank you for your willingness to pay something for Tampermonkey" ([contrib](https://www.tampermonkey.net/contrib.php)) (accessed 2026-11-19). Amounts not shown (unverified). | Donation / pay-what-you-want. The public GitHub repo (GPL-3.0) was last pushed 2025-03 ([GitHub API](https://github.com/Tampermonkey/tampermonkey)). Whether current builds are open source is unverified. |
| **Violentmonkey** | **Fact:** MIT, open source, 9.2k stars, no paid tier found. [GitHub](https://github.com/violentmonkey/violentmonkey) (accessed 2026-11-19). | Free substitute. |
| **Greasy Fork** (userscript host) | **Fact:** "Script authors may not place advertising on pages on Greasy Fork." Code "must not be obfuscated or minified." [Code rules](https://greasyfork.org/en/help/code-rules). Scripts that require payment must carry the `payment` antifeature label: "The script requires the user pay the script author for the script to be fully functional." [Antifeatures](https://greasyfork.org/en/help/antifeatures) (accessed 2026-11-19). | The community norm is to label paid content as an *antifeature*. Greasy Fork itself grew by absorbing userscripts.org refugees in 2014 (secondary: [Wikipedia: Userscript](https://en.wikipedia.org/wiki/Userscript), accessed 2026-11-19). |
| **Dark Reader** | **Fact:** MIT, open source ([GitHub](https://github.com/darkreader/darkreader)). "Trusted by 10,000,000 users" ([site](https://darkreader.org/)). Its payment page asks "we kindly ask you to complete the payment to keep Dark Reader going." The page lists a **one-time** price per user: **$9.99** regular, **$4.99** discount and **$19.99** corporate, with GBP/EUR/JPY/CAD/CNY/AUD variants, via Stripe/PayPal/Paddle ([pay-tiers.js](https://darkreader.org/elements/pay-tiers.js)) (accessed 2026-11-19). The Safari version is a paid App Store app, listed at USD 5.99 in some storefronts (secondary, via search; [App Store](https://apps.apple.com/us/app/-/id1438243180), accessed 2026-11-19). | The strongest evidence for this category: an honor-system one-time payment, an organizational price that is 2× individual, and regional pricing. The software stays fully usable without paying. Revenue is not disclosed (unverified). |
| **Night Eye** (dark mode) | **Fact:** Lite is free (limited to "5 websites of your choice", "1 browser"). Pro is **$9/yr**, Pro Max $14/yr, Ultimate **$40 one-time**. 3-month free trial, no card. [Pricing](https://nighteye.app/pricing/) (accessed 2026-11-19). Revenue is self-reported as "$3.1k per month," undated ([ExtensionPay article](https://extensionpay.com/articles/browser-extensions-make-money), accessed 2026-11-19; unverified). | A rare *paid* comparable in visual customization. Note the price level: under $1/mo equivalent. |
| **Enhancer for YouTube** | Monetization: unverified. The developer page states no pricing ([mrfdev](https://www.mrfdev.com/enhancer-for-youtube), accessed 2026-11-19). It was removed from Firefox AMO in Aug 2025 ([Mozilla Discourse](https://discourse.mozilla.org/t/enhancer-for-youtube-is-gone/123749), accessed 2026-11-19). | YouTube customization is a crowded, free niche with store-policy and platform risk. |
| **Unhook** (YouTube declutter) | **Fact:** The site claims "1,000,000+ active users." No pricing or paid tier is shown ([unhook.app](https://unhook.app/), accessed 2026-11-19). | Shows demand for *hiding elements on YouTube*, and that it is served for free. |
| **Social Fixer** (Facebook) | **Fact:** Donation-funded. Suggested $10. "only a small percentage (~ 1.5%) of users actually donate." [Donate page](https://socialfixer.com/donate.html) (accessed 2026-11-19). | The best category-specific willingness-to-pay data point: about 1.5% ever donate. That is a lifetime figure, not a monthly conversion rate. |
| **BetterDiscord / Vencord** | **Fact:** BetterDiscord: Apache-2.0, 9.3k stars. Vencord: GPL-3.0, 14.5k stars ([GitHub API](https://github.com/BetterDiscord/BetterDiscord), [Vencord](https://github.com/Vendicated/Vencord), accessed 2026-11-19). BetterDiscord plugin guidelines: "Plugins must not be obfuscated, minified, include source maps, or be otherwise deceitful" ([guidelines](https://docs.betterdiscord.app/plugins/publishing/guidelines)). The theme guidelines limit remote imports to "trusted services" ([theme guidelines](https://docs.betterdiscord.app/themes/publishing/guidelines)) (accessed 2026-11-19). I found **no explicit rule banning paid themes** (unverified either way). | The norm is free themes plus Ko-fi tips and paid *custom commissions*, e.g. one CSS commission page lists a $70 base price ([World Anvil](https://www.worldanvil.com/w/spleen-s-meta-world-notahumanhand/a/custom-css-commissions-article)); Gumroad themes from €4 ([Gumroad](https://skythehusky.gumroad.com/l/FurryThemes)); pay-what-you-want packs ([itch.io](https://driftware.itch.io/discord-css-themes)) (accessed 2026-11-19). |
| **Discord (the platform itself)** | **Fact:** Discord sells app themes as a **Nitro** perk. Light/Dark remain free ([Discord blog](https://discord.com/blog/bring-your-vibe-to-discord-with-new-themes-in-nitro); [Engadget](https://www.engadget.com/discord-themes-nitro-subscription-100135630.html), accessed 2026-11-19). | People pay for theming **when the platform sells it inside its own subscription**. That is not a third-party opportunity. It is also a risk: platforms can ship your feature natively. |
| **Spicetify** (Spotify) | **Fact:** Open source (LGPL-2.1, 25.6k stars). Funded through Open Collective / GitHub Sponsors. "200+ items in the Marketplace", "18M+ Downloads" ([spicetify.app](https://spicetify.app/), [GitHub](https://github.com/spicetify/cli), accessed 2026-11-19). | A large free theme marketplace with no paid items. Proves users will adopt a theme *marketplace*, not that they will pay for one. |
| **Obsidian** | **Fact:** Free for personal use. Sync **$4/user/mo annual or $5 monthly**. Publish $8–10/site/mo. Catalyst **$25 one-time** (early access, badges). Commercial license $50/user/yr, optional ([pricing](https://obsidian.md/pricing)). Developer policy: paid themes and plugins are allowed if disclosed ("Payment is required for full access"). "Themes may not load assets from the network." Obfuscation prohibited ([policies](https://docs.obsidian.md/Community+directory/Developer+policies)). The 2026 community site "is not a store, and does not offer any built-in payment solutions" ([blog, May 12 2026](https://obsidian.md/blog/future-of-plugins/)) (accessed 2026-11-19). | **The template to copy:** themes are free, and the company charges for a *service* (sync, publish) plus a supporter tier. Even with millions of users, Obsidian chose not to run payments for community themes. |
| **Raycast** | **Fact:** Free tier includes "Thousands of extensions" (all public Store extensions free). Pro is **$10/mo or $96/yr**. **Custom Themes are a Pro feature**, as are Cloud Sync and AI ([pricing](https://www.raycast.com/pricing), accessed 2026-11-19). | The Store is free and Pro sells power-user features, with theming among them. Raycast's Pro is mostly AI-driven, so the price level does not transfer. |
| **Arc** (browser with "Boosts" site restyling) | **Fact:** "Arc is sunsetting on December 22, 2026." New account creation ended October 22, 2026 ([arc.net](https://arc.net/)). Atlassian agreed to buy The Browser Company for about $610M (announced Sept 4, 2025), and Arc's active development had ended ([Engadget](https://www.engadget.com/big-tech/atlassian-is-buying-arc-maker-the-browser-company-for-610-million-145236236.html)) (accessed 2026-11-19). I found no Arc user pricing. | A well-funded product with built-in per-site restyling never charged for it, and is shutting down. Restyling worked as a *feature*, not as a business. |

**Takeaways**
- **Fact:** Every dominant tool in this category is free. Monetization is donations, honor-system one-time payments, or a narrow paid utility.
- **Fact:** The only category-specific donation rate found is about 1.5% of users ever donating (Social Fixer).
- **Assumption:** A new entrant cannot charge for the core (apply and install templates). Stylus and Stylebot are free and open source substitutes one click away.

### 1.2 Template and theme marketplaces: commissions and creator terms

| Marketplace | Platform take / creator share (Fact) | Source (accessed 2026-11-19) | Insight |
|---|---|---|---|
| **Envato Market (ThemeForest)** | Since **1 July 2026**: flat **50%** author fee, exclusivity removed. Before: exclusive authors paid 37.5% falling to 12.5%; non-exclusive paid 55%. | [ChargePanda summary](https://www.chargepanda.com/blog/post/envato-july-2026-changes-wordpress-authors-guide), citing [Envato Author Hub](https://author.envato.com/hub/changes-to-envato-market-revenue-share-and-exclusivity-what-you-need-to-know/) (official page not fetched directly) | A pure marketplace with no other revenue takes half. |
| **Figma Community** | Flat **15%** (covers processing). $2 minimum. Payout 30 business days after sale. **"We are not approving new creators to sell paid files on Community at this time."** | [Figma Help](https://help.figma.com/hc/en-us/articles/12067637274519-About-paid-Community-resources) | A huge design platform throttled its paid-file program. That is a negative signal for paid design assets. |
| **Framer Marketplace** | Creators keep **100%** of paid template sales ("Framer takes a 0% cut"), plus up to **50% of the subscription for 12 months** on referred upgrades. "$6.5M" 2025 creator payout. | [Framer Help](https://www.framer.com/help/articles/how-the-creator-program-works/), [framer.com/creators](https://framer.com/creators) | The platform subsidizes creators because it monetizes *its own subscription*. |
| **Webflow Marketplace** | Creators earn **95%**; Webflow keeps 5% for processing (from Oct 21, 2025). | [Webflow update](https://webflow.com/updates/template-creator-enhancements) (search snippet of official page; direct fetch failed) | Same pattern as Framer. |
| **Notion Marketplace** | **8% + $0.40** per transaction (includes processing). +1% FX for non-US creators. $20 minimum payout. 14-day hold. | [Notion Help](https://www.notion.com/help/selling-on-marketplace) | Low take, platform-subsidized. Top Notion sellers sell from their own audiences. |
| **Shopify Theme Store** | **15%** revenue share on gross theme sales, plus a 2.9% processing fee. | [Shopify.dev](https://shopify.dev/docs/storefronts/themes/store/revenue-share) | Themes sell for high prices to businesses; not comparable to consumer reskins. |
| **Gumroad** | **10% + $0.50** direct; **30%** via Discover. Gumroad is merchant of record. | [Gumroad pricing](https://gumroad.com/pricing) | The default "own storefront" for indie theme sellers (e.g. Dracula PRO's listing on [Gumroad](https://draculatheme.gumroad.com/l/dracula-pro)). It has a license-key verification API ([Gumroad Help](https://gumroad.com/help/article/76-license-keys)). |
| **Chrome Web Store payments** | **Deprecated.** Notice dated Sept 21, 2020. Payments disabled for new charges and existing subscriptions stopped auto-renewing in early 2021. | [Chromium-extensions notice](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/XLeZ6iKiuVI), [9to5Google](https://9to5google.com/2020/09/22/google-chrome-paid-extensions-deprecation/) | You must bring your own payment stack. |
| **ExtensionPay** | **5%** fee "at time of charge," no monthly fee. Subscriptions, one-time payments and trials on Chrome/Firefox/Edge. Claims developers made "over $800,000." | [extensionpay.com](https://extensionpay.com/) | Stripe fees presumably apply on top, because funds go to your Stripe account (the page does not say). It is not a merchant of record, so you handle tax. |

**Pattern (Fact-based inference):** Marketplaces that also sell a platform subscription (Framer, Webflow, Notion) give creators 85–100%. Marketplaces whose only revenue is commission (Envato) take about 50%. This project cannot be Envato-scale. If it ever runs a marketplace, the commission will not be what pays the bills.

---

## 2. The copyability problem

**Fact (technical):** Templates applied by an extension are CSS + JSON delivered to the client. Chrome says remotely hosted code "does not include data or things like JSON or CSS" ([Chrome docs](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code), accessed 2026-11-19). That makes delivery allowed, and it also means the payload is inspectable plaintext. Obfuscating *extension code* is prohibited: "Developers must not obfuscate code or conceal functionality" ([CWS policy](https://developer.chrome.com/docs/webstore/program-policies/code-readability)). Firefox likewise: "Add-ons are not allowed to contain obfuscated code" ([Firefox policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)) (accessed 2026-11-19).

### How theme sellers deal with it (evidence)

| Ecosystem | Approach | Evidence (accessed 2026-11-19) |
|---|---|---|
| **Discord (BetterDiscord/Vencord)** | No technical protection. Free themes plus Ko-fi tips. Money comes from *custom commissions* (labor, not files). | Guidelines ban obfuscation ([BD](https://docs.betterdiscord.app/plugins/publishing/guidelines)). Commission example: $70 base ([World Anvil](https://www.worldanvil.com/w/spleen-s-meta-world-notahumanhand/a/custom-css-commissions-article)). |
| **Obsidian** | Paid allowed with disclosure. No built-in payments. Themes can't load network assets, so nothing can be server-gated. | [Developer policies](https://docs.obsidian.md/Community+directory/Developer+policies), [future of plugins](https://obsidian.md/blog/future-of-plugins/) |
| **Editor themes (VS Code etc.)** | **Dracula PRO:** $79 list (on sale for $47), PPP pricing in 160+ countries, 3-device license, bundled with fonts, an ebook, wallpapers, updates and support ([draculatheme.com/pro](https://draculatheme.com/pro)). It grossed **$101,578.04 between Jan 2020 and Feb 2021**, built on the audience of the free Dracula theme ([Indie Hackers, Zeno Rocha, 2021-02-25](https://www.indiehackers.com/post/how-i-made-101-578-04-selling-colors-online-1690e49618)). **Monokai Pro:** "free trial period in which you can use the software as long as you want"; a license only removes "the occasional registration pop-ups" ([license](https://monokai.pro/license)). VS Code Marketplace: a 2023 count found 31 of about 51,672 extensions marked "Trial" ([blog, secondary](https://skalt.github.io/til/2023/10/03/)). | The themes that sell are **brands with big free audiences**, sold as **bundles across many apps**, with **honor-system enforcement**. |
| **WordPress (GPL)** | The code is legally redistributable. Sellers charge for **support, updates and brand**. "The brand, not the lock on the zip file, became the product." Split licensing (PHP under GPL, CSS/images proprietary) exists but adds friction. | [Blog Herald](https://blogherald.com/blogging-news/the-licensing-shift-that-forced-wordpress-theme-sellers-to-rethink-how-they-make-money/) |
| **Shopify** | B2B buyers, a 15% share, and theme value tied to store revenue. A merchant buying a $300+ theme is buying support and updates, not CSS. | [Shopify.dev](https://shopify.dev/docs/storefronts/themes/store/revenue-share) |
| **Notion templates** | Templates are duplicable by design, yet Thomas Frank's team reported **$1M in Notion template sales in calendar 2022** from essentially two premium products ([Typefully post](https://typefully.com/TomFrankly/dollar1-million-in-notion-template-sales-kuFT0iD)). | Buyers pay for *a system plus education plus the creator's reputation*. These are complex productivity templates, not a color scheme. |

### Implications for "premium paid templates"

- **Fact:** Anyone who buys a template can copy its CSS and paste it into Stylus in under a minute. No allowed technical measure prevents this.
- **Assumption:** For a $2–5 template, leakage will be widespread. One leaked copy uploaded to the free gallery or a userstyles site kills that template's sales.
- **The only defensible "premium" is the update stream.** Target sites change their DOM often (Facebook and YouTube are notorious; there is no citable rate, so treat this as Assumption). A copied CSS file stops working within weeks or months. A subscription that keeps templates working is not copyable. This is the WordPress lesson: sell updates and maintenance, not files.
- **Recommendation:** Do not plan revenue on per-template sales. If paid templates exist at all, price them as "creator-maintained subscription bundles" (for example $2/mo for all of a creator's templates, kept working), or as honor-system "pay what you want" with a nag, like Monokai. Expect paid templates to be a minor revenue line.

---

## 3. Willingness to pay and pricing psychology

### 3.1 Price points of comparables (Fact unless noted; accessed 2026-11-19)

| Product | Price | Model |
|---|---|---|
| Night Eye | $9/yr Pro; $14/yr Pro Max; $40 one-time | Freemium with a site cap ([pricing](https://nighteye.app/pricing/)) |
| Dark Reader | $9.99 one-time (individual), $4.99 discount, $19.99 corporate | Honor system ([pay-tiers.js](https://darkreader.org/elements/pay-tiers.js)) |
| GoFullPage | "premium $1 per month"; "$10k per month" (2021, self-reported); "4 million users" | Freemium ([ExtensionPay article](https://extensionpay.com/articles/browser-extensions-make-money); unverified). **Derived:** $10k/mo at $1/mo implies about 10k subscribers, about 0.25% of 4M users. |
| Obsidian Sync | $4/mo (annual) or $5/mo | Service subscription ([pricing](https://obsidian.md/pricing)) |
| Obsidian Catalyst | $25 one-time | Supporter tier |
| Raycast Pro | $8/mo annual ($96/yr) or $10/mo | Includes AI ([pricing](https://www.raycast.com/pricing)) |
| Dracula PRO | $79 one-time (PPP) | Bundle ([page](https://draculatheme.com/pro)) |
| Social Fixer | $10 suggested donation | Donation ([page](https://socialfixer.com/donate.html)) |
| Indie freemium extensions via ExtensionPay | $2.99–$9.99/mo; one switched to $3.99 one-time | Self-reported: 0.8% overall free-to-paid; **MRR $31.03** at end of July 2026 across a portfolio ([dev.to](https://dev.to/ktg0215/real-numbers-freemium-chrome-extension-monetization-after-6-months-5hga)) |

**Reading:** Consumer visual-customization pricing clusters at **$9–$30 per year or $10–$40 one-time**. Pricing at $5+/mo puts you in "productivity tool with a server-side service" territory (Obsidian, Raycast). That needs a real service attached, such as sync.

### 3.2 Conversion benchmarks: what is citable, and how applicable it is

| Benchmark | Value | Source (accessed 2026-11-19) | Applicability here |
|---|---|---|---|
| B2B SaaS freemium (self-serve) | good 3–5%, great 6–8% | [Lenny's Newsletter / OpenView, Aug 2023](https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion) ("The data set focused on B2B SaaS") | **Low.** B2B buyers expense software. This is a consumer cosmetic tool with free substitutes. Treat it as a ceiling. |
| Free trial (B2B) | good 8–12%, great 15–25% | same | Low. It only applies to an opt-in trial cohort. |
| Mobile subscription apps, download→paid within 35 days | median **2.0%** globally; **freemium 2.1%** vs hard paywall 10.7%; North America 2.6%, W. Europe 2.0% | [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/) (115k+ apps). Note: the report has internal inconsistencies on regional figures. | **Medium-low.** Mobile has native one-tap payments. Extensions need a web checkout, which adds friction. Subscription apps are built to monetize; many extensions are not. |
| Annual subscriber retention after 1 year (mobile, freemium) | **28%** retained | [RevenueCat blog 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026.md) | Medium. Directional: annual renewals are far from guaranteed. |
| Facebook extension donors | **~1.5% ever donate** | [Social Fixer](https://socialfixer.com/donate.html) | **High** (same category), but it is a lifetime donation rate, not concurrent paying users. |
| Indie extension portfolio | **0.8%** free→paid overall | [dev.to, Aug 2026](https://dev.to/ktg0215/real-numbers-freemium-chrome-extension-monetization-after-6-months-5hga) | Medium. Small sample (about 2.9k installs), self-reported. |
| GoFullPage (derived) | ~0.25% | derived from [ExtensionPay article](https://extensionpay.com/articles/browser-extensions-make-money) | Medium. Mass-market utility with a $1 price. |

**Assumption used in modelling:** concurrent paying users of **0.5% (conservative) / 1.5% (realistic) / 3% (optimistic) of WAU**. Rationale: Social Fixer's 1.5% lifetime donor rate and the 0.8% indie portfolio anchor the low and middle values. RevenueCat's 2.1% freemium median, from a payment-native platform, caps the realistic case. 3% is only plausible if Pro includes a genuinely valued service (sync or multi-device) and the audience skews to power users.

### 3.3 Annual vs monthly vs lifetime

- **Fact:** Comparables lean annual or one-time: Night Eye (annual plus one-time), Dark Reader (one-time), Obsidian (annual discount), Raycast (annual discount).
- **Fact:** Fixed fees punish monthly micro-subscriptions (§4). A $3.99/mo plan loses 15–22% to fees with a merchant of record. A $29/yr plan loses 6.7–8.2%.
- **Fact:** About 72% of annual subscribers cancelled in year 1 in RevenueCat's 2026 data ("~72% in 2026"), and about 35% of annual cancellations happen in the first month ([RevenueCat blog](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026.md), accessed 2026-11-19). Mobile data; directional.
- **Assumption:** A lifetime tier is less dangerous here than usual because marginal infra cost per user is about $0.00005/mo (§7). The real liability is perpetual maintenance and support labor. Cap lifetime sales (a launch cohort or a time-limited offer) and price lifetime at about 2× annual.
- **Recommendation:** Default to annual ($29). Offer monthly ($3.99) mainly as an anchor. Offer a limited lifetime ($59). Add an honor-system "supporter" one-time payment ($10) for people who don't need Pro. Dark Reader is the precedent.

### 3.4 Regional pricing

- **Fact:** Dracula PRO uses PPP pricing for "160+ countries" ([page](https://draculatheme.com/pro)). Dark Reader lists different nominal prices per currency, e.g. ¥1,500 JPY and ¥68 CNY ([pay-tiers.js](https://darkreader.org/elements/pay-tiers.js)) (accessed 2026-11-19).
- **Fact:** Stripe Adaptive Pricing is *currency conversion*, not PPP. "You pay 0%" and "Your customers pay 2–4%" ([Stripe docs](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing.md?payment-ui=stripe-hosted), accessed 2026-11-19).
- **Fact:** RevenueCat reports a lower download-to-paid median in India/SE Asia (1.4%) than in North America (2.6%) ([SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/), accessed 2026-11-19; the report has conflicting regional figures).
- **Recommendation:** Run manual PPP tiers (3–4 price bands via country-specific prices or coupons) from day one. Template-customization audiences are global and skew to students and young users (Assumption). At $3/mo, fixed fees make deep PPP discounts uneconomic. Keep regional prices at or above about $12/yr, or offer annual-only below a threshold.

---

## 4. Payment processing costs

### 4.1 Current list prices (Fact; accessed 2026-11-19)

| Provider | Fee | Source |
|---|---|---|
| Stripe Payments (US) | 2.9% + 30¢ domestic cards; +1.5% international cards; +1% currency conversion; disputes $15 | [stripe.com/pricing](https://stripe.com/pricing) |
| Stripe Billing | 0.7% of billing volume (pay-as-you-go) | same |
| Stripe Tax | 0.5% per transaction (no-code) where registered | same |
| **Stripe Managed Payments** (merchant of record) | **3.5% on top of payment fees**. Handles tax in 80+ countries. **Does not support Connect / marketplaces**. Product must be sold "directly to customers, not through a platform or marketplace." The seller must be based in one of the listed countries (US, CA, most of EU/EEA, GB, CH, AU, HK, JP, SG). | [pricing](https://stripe.com/pricing), [docs](https://docs.stripe.com/payments/managed-payments), [eligibility](https://docs.stripe.com/payments/managed-payments/eligibility) |
| Stripe Connect (you handle pricing) | $2 per monthly active account; 0.25% + 25¢ per payout; Instant Payouts 1%; cross-border payouts from 0.25% | [stripe.com/connect/pricing](https://stripe.com/connect/pricing) |
| Paddle (MoR) | 5% + 50¢; under $10 → "contact us for bespoke pricing". **Prohibits "digital marketplaces"** (any product that "enables non-Paddle Sellers to sell") | [pricing](https://www.paddle.com/pricing), [prohibited list](https://paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle) |
| Polar.sh (MoR) | Starter 5% + 50¢; Pro $20/mo + 3.8% + 40¢; Growth $100/mo + 3.6% + 35¢; +1.5% international cards; payouts: $2/mo + 0.25% + $0.25; disputes $15. **Prohibits marketplaces** ("Selling others' products or services using Polar") | [pricing](https://polar.sh/resources/pricing), [acceptable use](https://polar.sh/docs/merchant-of-record/acceptable-use) |
| **Lemon Squeezy** | 5% + 50¢. **"no longer accepting new sign-ups and will shut down on March 31, 2027."** Migration path is Stripe Managed Payments. | [lemonsqueezy.com/pricing](https://www.lemonsqueezy.com/pricing); secondary: [TechStartups](https://techstartups.com/?p=140481) |
| Gumroad (MoR) | 10% + 50¢ direct; 30% via Discover | [gumroad.com/pricing](https://gumroad.com/pricing) |
| ExtensionPay | 5% (plus Stripe fees, presumably) | [extensionpay.com](https://extensionpay.com/) |
| PayPal (US) | Checkout 3.49% + $0.49; **micropayments 4.99% + $0.09**; +1.5% international; Payouts 2% capped at $1 domestic / $20 international, or $0.25 flat via the API (domestic) | [PayPal fees](https://www.paypal.com/us/business/paypal-business-fees) (updated Nov 4, 2026) |
| Apple App Store (Safari extension, if sold as a paid app or IAP) | 15% under the Small Business Program (≤ $1M proceeds) | [Apple](https://developer.apple.com/app-store/small-business-program/) |

### 4.2 Effective fee on small transactions (computed from the list prices above; US card unless stated)

| Rail | $3 | $5 | $29/yr |
|---|---|---|---|
| Stripe card, one-time (2.9%+$0.30) | $0.39 (12.9%) | $0.45 (8.9%) | $1.14 (3.9%) |
| Stripe card + Billing (subscription, +0.7%) | $0.41 (13.6%) | $0.48 (9.6%) | $1.34 (4.6%) |
| Stripe + Billing, intl card (+1.5%) | $0.45 (15.1%) | $0.55 (11.1%) | $1.78 (6.1%) |
| Stripe + Billing + Managed Payments MoR (+3.5%) | $0.51 (17.1%) | $0.66 (13.1%) | $2.36 (8.1%) |
| Stripe + Billing + Managed Payments, intl card | $0.56 (18.6%) | $0.73 (14.6%) | $2.79 (9.6%) |
| Paddle (5%+$0.50) | $0.65 (21.7%) | $0.75 (15.0%) | $1.95 (6.7%) |
| Polar Starter (5%+$0.50) | $0.65 (21.7%) | $0.75 (15.0%) | $1.95 (6.7%) |
| Polar Starter, intl card (+1.5%) | $0.70 (23.2%) | $0.82 (16.5%) | $2.38 (8.2%) |
| Polar Pro (3.8%+$0.40, +$20/mo) | $0.51 (17.1%) | $0.59 (11.8%) | $1.50 (5.2%) |
| ExtensionPay 5% + Stripe (assumed stacked) | $0.54 (17.9%) | $0.70 (13.9%) | $2.59 (8.9%) |
| Gumroad direct (10%+$0.50) | $0.80 (26.7%) | $1.00 (20.0%) | $3.40 (11.7%) |
| Gumroad Discover (30%) | $0.90 (30.0%) | $1.50 (30.0%) | $8.70 (30.0%) |
| PayPal Checkout US (3.49%+$0.49) | $0.59 (19.8%) | $0.66 (13.3%) | $1.50 (5.2%) |
| PayPal micropayments US (4.99%+$0.09) | $0.24 (8.0%) | $0.34 (6.8%) | $1.54 (5.3%) |
| Notion Marketplace (8%+$0.40) | $0.64 (21.3%) | $0.80 (16.0%) | $2.72 (9.4%) |
| Figma Community (15% flat) | $0.45 (15.0%) | $0.75 (15.0%) | $4.35 (15.0%) |

**Marketplace payout economics (computed from Connect list prices):** a creator who earns $20 in a month costs $2 (active account) + $0.25 + 0.25% ≈ **$2.30 to pay out (11.5%)**, on top of the 13–15% card cost on the buyer side. At $100/mo it is about 2.5%. **Recommendation:** pay out at most monthly, with a minimum balance of $25–50. Small-earning creators are uneconomic to pay through Connect.

### 4.3 Tax and merchant-of-record constraints (critical for a marketplace)

- **Fact:** All three MoR options checked (Paddle, Polar, Stripe Managed Payments) exclude marketplaces (citations in §4.1). They can sell *your* Pro subscription. They cannot sell *creators'* templates.
- **Fact:** In the EU, platforms that sell electronically supplied services "in their own name but on behalf of another" can be treated as the deemed supplier for VAT (CJEU *Xyrality*, C-101/24, Oct 2025; [Baker McKenzie summary](https://insightplus.bakermckenzie.com/bm/tax/european-union-cjeu-judgment-in-xyrality-c-10124-clarifying-the-scope-of-article-28-of-the-principal-vat-directive), accessed 2026-11-19). For EU-established sellers, the €10,000 EU-wide threshold for cross-border digital B2C services applies ([Revenue.ie](https://www.revenue.ie/en/vat/vat-on-services/electronic-services/vat-and-electronically-supplied-services/index.aspx), accessed 2026-11-19). Non-EU sellers get no threshold; this is from vendor sources and is unverified against an official page.
- **Assumption:** An in-house paid-template marketplace makes a solo developer liable for VAT/GST and US sales-tax compliance on creator sales, plus Connect KYC, 1099/DAC7 reporting and dispute handling. This is the single largest hidden cost of the "marketplace" vision.
- **Recommendation:** Sell Pro through an MoR (Stripe Managed Payments if the founder's country is eligible, otherwise Paddle or Polar). If creators want to sell, let them sell on **their own Gumroad or Ko-fi storefronts** (Gumroad is the MoR). The platform then verifies purchase via Gumroad's license-key API and unlocks the template. The platform never becomes merchant of record for creator sales.

---

## 5. Revenue model comparison

Scores: Fit = fit with "core stays free" plus the user base. Effort = solo-dev build and ops effort. Risk = financial, legal and trust risk.

| Model | Fit | Effort | Risk | Evidence | Verdict |
|---|---|---|---|---|---|
| **Free community templates** | High | Medium (moderation) | Low | Spicetify 200+ marketplace items, 18M downloads ([spicetify.app](https://spicetify.app/)); Greasy Fork; Obsidian themes all free | **Must have.** It is the acquisition engine, not a revenue line. |
| **Premium paid templates** | Low–Medium | High (payments, licensing, takedowns) | High (copying, tax, refunds) | Figma stopped approving new paid sellers; Greasy Fork labels payment an antifeature; Dracula PRO works only with a big brand and bundle | **Defer.** Only as creator-maintained bundles via BYO storefront. |
| **Marketplace commission** | Low (early) | Very high (Connect, tax, KYC) | High | MoRs exclude marketplaces (§4.3); Envato takes 50% at scale, platform-subsidized marketplaces take 0–15% | **Do not build in the first 12–18 months.** |
| **Pro subscription for users** | High | Medium | Medium | Raycast Pro includes custom themes and sync; Obsidian Sync $4–5/mo; Night Eye $9/yr | **Primary model.** |
| **Creator subscriptions** (creators pay for analytics, more slots, custom domains) | Low | Medium | Medium | Framer, Webflow and Notion *pay* creators rather than charge them. No evidence that hobbyist CSS authors pay. | **No.** Charging supply during cold start is backwards (NFX: subsidize the valuable side). |
| **Private / unlisted templates** | High (as part of Pro) | Low | Low | Common "Pro" gate in creator tools (pattern; no single citation) | **Include in Pro.** |
| **Advanced editor features** (visual selector builder, variables, responsive rules, multi-site packs) | Medium | High | Low | Stylebot is a free point-and-click editor ([GitHub](https://github.com/ankit/stylebot)), so basic editing must stay free | **Pro-gate only the advanced layer.** |
| **Cloud sync / multi-device / backup** | High | Low–Medium on CF | Low | Obsidian Sync is its core revenue product ([pricing](https://obsidian.md/pricing)); Raycast Pro includes Cloud Sync | **Anchor feature of Pro.** It is a real server cost and easy to explain. |
| **Team / enterprise customization** (companies reskinning internal SaaS, forced via policy) | Unknown | High (sales, SSO, admin, support) | Medium | Chrome admins can force-install extensions and pre-configure them via managed storage ([Google Admin help](https://support.google.com/chrome/a/answer/6306504); [chrome.storage.managed](https://developer.chrome.com/docs/extensions/reference/api/storage)). The adjacent DAP market is large: SAP bought WalkMe for $1.5B ([TechCrunch, Jun 2024](https://techcrunch.com/2024/06/05/sap-to-acquire-digital-adoption-platform-walkme-for-1-5b/)). Pendo is free to 500 MAU, paid tiers by quote ([pricing](https://www.pendo.io/pricing/)). WalkMe's median contract is reported at about $39k/yr (Vendr via secondary sources; unverified). | **Speculative.** DAPs sell guidance, analytics and compliance, not cosmetics. I found **no evidence** of a paid market for "CSS reskins of internal tools." Test with 3–5 discovery calls before writing code. |
| **Sponsored collections** (brands or creators pay for placement) | Low | Low | High (trust; CWS bans paying for featuring, but only for its own store) | No category precedent found | **No.** It erodes trust for little money at this scale. |
| **Tips / donations / supporter one-time** | High | Very low | Low | Social Fixer ~1.5% donate ([page](https://socialfixer.com/donate.html)); Dark Reader honor-system $9.99 ([pay-tiers.js](https://darkreader.org/elements/pay-tiers.js)); Obsidian Catalyst $25 | **Ship early** (month 1–3), alongside Pro later. |
| **Ads / affiliate / data** | Low | Low | **Very high** | Stylish removal for data collection ([gHacks](https://www.ghacks.net/2018/07/03/it-is-time-to-get-rid-of-stylish/)); Obsidian bans dynamic network-loaded ads ([policies](https://docs.obsidian.md/Community+directory/Developer+policies)); Greasy Fork bans ads on its pages | **Never.** |

---

## 6. Marketplace cold start

### 6.1 What the research says

- **Fact:** Andrew Chen (a16z) defines the atomic network as "the smallest network needed that can stand on its own". "Your product's first atomic network is probably smaller and more specific than you think" ([Lenny's Newsletter excerpt, Dec 2021](https://www.lennysnewsletter.com/p/atomic-network), accessed 2026-11-19).
- **Fact:** 14 of 17 successful marketplaces Lenny Rachitsky studied "focused almost all of their resources on growing supply early-on" ([Lenny's Newsletter, Nov 2019](https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace-9ee), accessed 2026-11-19).
- **Fact:** NFX tactics include "Get the hardest side first," "Appeal tightly to a niche," "Subsidize the most valuable side," "Build a SaaS tool for one side," and "Make a product first, then open a marketplace" ([NFX](https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem), accessed 2026-11-19).
- **Fact:** "Come for the tool, stay for the network": attract users "with a single-player tool" first ([Chris Dixon, Jan 2015](https://cdixon.org/2015/01/31/come-for-the-tool-stay-for-the-network/), accessed 2026-11-19).

**Implication:** The product must be valuable with *zero* community templates. The founder should ship 10–20 excellent first-party templates for 1–2 sites (the atomic network, e.g. "YouTube minimal" plus "Reddit compact"), and the editor must be good enough that users make their own. Buyers here are also sellers (NFX tactic 14), so every user is a potential creator.

### 6.2 How userstyle and theme communities actually seeded content (evidence)

| Community | Seeding mechanism | Source (accessed 2026-11-19) |
|---|---|---|
| Greasy Fork | Launched Feb 2014 just as userscripts.org failed (inaccessible May 2014, shut down Aug 2014). It absorbed refugee authors. | [Wikipedia: Userscript](https://en.wikipedia.org/wiki/Userscript) (secondary) |
| Stylus | Forked when Stylish was sold, and pulled the existing userstyles.org catalogue. Trust (no tracking) was the wedge. | [Stylus GitHub](https://github.com/openstyles/stylus) |
| Framer / Webflow | Pay creators 95–100% of sales, plus referral commissions (Framer: 50% of the subscription for 12 months). | [Framer](https://framer.com/creators), [Webflow](https://webflow.com/updates/template-creator-enhancements) |
| Dracula PRO | Built a large free theme first, then sold the premium bundle to that audience. | [Indie Hackers](https://www.indiehackers.com/post/how-i-made-101-578-04-selling-colors-online-1690e49618) |
| Raycast | Community managers feature 3 extensions per month. Visibility, not cash. | [Raycast manual](https://manual.raycast.com/extensions) (search summary; not fetched directly) |

**Recommendation (creator incentives, cheapest first):** (1) attribution, profiles and install counts; (2) monthly featured picks; (3) Pro free for active creators (zero marginal cost); (4) tip links (Ko-fi / GitHub Sponsors) on template pages; (5) "import from userstyles" tooling so existing Stylus authors can port their styles in one click (license permitting); (6) only later, revenue share on Pro upgrades the creator refers, Framer-style. That costs nothing until revenue exists.

### 6.3 Customer acquisition channels and realistic yield

| Channel | Evidence | Realistic yield (Assumption) |
|---|---|---|
| **Chrome Web Store search** | **Fact:** Ranking "takes into account ratings from users as well as usage statistics." The Featured badge requires that "core features must also work without extra credentials or payments." Developers "cannot pay" for badges or home-page featuring ([CWS discovery](https://developer.chrome.com/docs/webstore/discovery), accessed 2026-11-19). | The main long-term channel. Keeping the core free is a *distribution* requirement (Featured badge), not just ethics. A slow climb is likely: hundreds to low thousands of installs per month after 6–12 months if reviews are good. |
| **Base rate for extensions** | **Fact:** 87% of about 188,620 Chrome extensions had fewer than 1,000 users (Extension Monitor, Aug 2019; [9to5Google](https://9to5google.com/2019/08/05/chrome-extensions-under-1000-users/)). DebugBear (2020, updated 2026) found 70% had fewer than 100 users, and 337 extensions had more than 1M ([DebugBear](https://debugbear.com/blog/counting-chrome-extensions)) (accessed 2026-11-19). | Reaching 10k+ users already puts the product above roughly the 90th percentile. |
| **Product Hunt** | **Fact (self-reported anecdotes):** #11 of the day with 218 upvotes gave 432 landing views and 86 installs ([wicki.io](https://wicki.io/posts/2020-06-stats-and-learnings-from-finishing-11-on-product-hunt/)). Another #7 finish reported 623 visitors and 279 downloads ([Indie Hackers](https://www.indiehackers.com/post/how-i-made-it-to-7-on-ph-and-got-623-unique-page-visits-279-downloads-and-was-featured-on-2-large-publications-0e4524fe83); search summary, not fetched) (accessed 2026-11-19). | 100–1,000 installs, one-off. Low-quality, tech-skewed traffic. |
| **Reddit** (r/youtube, r/chrome_extensions, site-specific subs) | No citable benchmark (unverified). | Spiky. One post that hits can bring thousands of installs; most bring dozens. Self-promotion rules vary per subreddit. |
| **YouTube creators / TikTok** ("make YouTube look like 2012") | No citable benchmark (unverified). Dracula's growth was helped by "one viral tweet," which its author calls "a one-time event" ([Indie Hackers](https://www.indiehackers.com/post/how-i-made-101-578-04-selling-colors-online-1690e49618)). | Highest upside. Visual before/after content suits short video. Not repeatable on demand. |
| **SEO on the web gallery** ("YouTube dark theme", "old Reddit look") | No citable benchmark. Night Eye reportedly grew via organic SEO (aggregator, unverified). | Each template page is a long-tail landing page. Compounds slowly. |
| **Firefox AMO / Edge Add-ons** | **Fact:** Edge has no registration fee ([Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)). Firefox requires disclosure "when payment is required" ([policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)) (accessed 2026-11-19). | Cheap incremental reach. Firefox users over-index on customization (Assumption). |

**Fact (metric caveat):** The public CWS user count is roughly the number of unique update checks over 7 days, and it counts disabled installs ([Chromium-extensions group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/ikDay6v77yY), community reply, accessed 2026-11-19). "Users" on the CWS listing therefore overstates engaged WAU.

---

## 7. Infrastructure costs (Cloudflare)

### 7.1 Current pricing (Fact; accessed 2026-11-19)

| Service | Included (Workers Paid, $5/mo account minimum) | Overage | Source |
|---|---|---|---|
| Workers requests | 10M/mo | $0.30 per M | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) |
| Workers CPU | 30M CPU-ms/mo | $0.02 per M CPU-ms | same |
| Egress / static assets | "no additional charges for data transfer (egress)". Static asset requests "free and unlimited" | — | same |
| Workers Free plan | 100,000 requests/day; 10 ms CPU per request | — | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) |
| KV | 10M reads, 1M writes/deletes/lists, 1 GB | $0.50/M reads; $5/M writes; $0.50/GB-mo | [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/) |
| D1 | 25B rows read, 50M rows written, 5 GB | $0.001/M rows read; $1/M rows written; $0.75/GB-mo | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| D1 limits | 10 GB max per DB (Paid); 1 TB per account; each DB "inherently single-threaded" (1 ms queries give at most about 1,000 queries/sec) | — | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) |
| R2 | 10 GB-mo, 1M Class A, 10M Class B (Standard storage only) | $0.015/GB-mo; $4.50/M Class A; $0.36/M Class B; egress free | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| R2 public access | A custom domain enables Cloudflare Cache. `r2.dev` "is rate-limited and should only be used for development purposes." | — | [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) |
| Workers Logs | 20M events/mo included; $0.60/M after; 7-day retention. Moves to "Cloudflare Observability pricing" from Dec 1, 2026 (new rates unverified) | — | [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) |
| Email Sending | Paid plan: 3,000/mo included, then $0.35 per 1,000 | — | [Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/) |

### 7.2 Usage assumptions (all Assumptions; cache-first architecture)

| Driver | Per WAU per month | Rationale |
|---|---|---|
| Update checks (Worker request plus 1 KV read of a versioned manifest) | 22 | About 1 check per active day, about 5 active days per week. Templates are cached locally in `chrome.storage`, so there is **no network call per page load**. |
| Gallery / API browsing (Worker requests) | 16 | About 15% of WAU browse each week × about 25 API calls |
| Bundle downloads (Worker + R2 Class B) | 6.5 | About 1.5 installs or updates per WAU per week. Bundle about 20–50 KB (CSS + JSON). Egress free. |
| Thumbnails (R2 Class B, worst case uncached) | 19.5 | 15% browse × 30 images × 4.33 weeks |
| Auth / sync / misc requests | ~5 | Sessions, Pro sync writes |
| **Total Worker requests** | **~50** | CPU about 3 ms per request |
| D1 rows read / written | 2,000 / 10 | Indexed lookups, list pages. Install counters batched, not written per event. |
| Logs | 1 event per request | Sampled logging would cut this |
| R2 storage | 2 GB + 1 GB per 40k WAU | Template versions plus thumbnails |

### 7.3 Monthly Cloudflare cost by scale (computed from §7.1 × §7.2)

| WAU | Worker req/mo | D1 rows read/mo | R2 Class B/mo | **Lean (cache-first) cost/mo** | Naive design (API call on every page load: about 1,500 req, 1,500 KV reads, 15k D1 rows read, 1,500 log events per WAU/mo) |
|---|---|---|---|---|---|
| 1,000 | 50k | 2M | 26k | **$5.00** (fits the Free plan too) | $5.00 |
| 10,000 | 500k | 20M | 260k | **$5.00** | $9.30 |
| 100,000 | 5M | 200M | 2.6M | **$5.00** | $203 |
| 1,000,000 | 50M | 2B | 26M | **≈ $49** ($12 requests, $2 CPU, $6 KV, $6 R2 ops, $18 logs) | ≈ $2,180 ($447 requests, $89 CPU, $745 KV, $888 logs) |

**Fact-based conclusion:** Cloudflare costs are negligible under a cache-first design. The 40× penalty of a naive design is still affordable, but it is pure waste. One more scaling point: D1's single-threaded model means update checks must hit KV or the Cache API, not D1, at 1M WAU (Assumption based on the [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)).

### 7.4 Other costs

| Item | Cost | Source / label |
|---|---|---|
| Chrome Web Store developer registration | One-time fee; $5 historically. Amount "determined in Google's sole discretion"; the current official page doesn't state it. | [Computerworld](https://www.computerworld.com/article/1554628/google-makes-chrome-devs-dig-into-pockets.html), [CWS register](https://developer.chrome.com/docs/webstore/register) (accessed 2026-11-19); current amount unverified |
| Edge Add-ons | $0 ("no registration fee") | [Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account) |
| Firefox AMO | $0 (no fee found; Assumption) | — |
| Apple Developer Program (Safari) | $99/yr | [Apple](https://developer.apple.com/support/enrollment/) |
| Domain (.com) | ≈ $10.46/yr at Cloudflare Registrar | [cfdomainpricing.com](https://cfdomainpricing.com/) (third-party tracker) |
| Transactional email | CF Email Sending: 3k/mo included; or Resend Free (3,000/mo, 100/day) / Pro $20/mo for 50k | [CF](https://developers.cloudflare.com/email-service/platform/pricing/), [Resend](https://resend.com/pricing) |
| Payments | 6.7–8.2% on annual, 15–23% on monthly via MoR (§4.2) | computed |
| **Moderation labor** (Assumption) | Submissions ≈ 0.5% of WAU per month × 10 min review: 1k WAU ≈ 1 h/mo; 10k ≈ 8 h; 100k ≈ 83 h (~$1.7k/mo at $20/h); 1M ≈ 830 h (~5 FTE, ~$17k/mo) | Plus abuse reports and takedowns. **This, not infra, is the scaling cost.** Automated linting (selector validation, no `url()` to unknown hosts, size limits) is mandatory. |
| **Breakage maintenance** (Assumption) | 4–8 h/mo per supported site for first-party templates | Target sites change their DOM. Unbudgeted, this becomes the founder's main recurring cost. |
| Support (Assumption) | About 1 ticket per 20 payers per month × 10 min | |

---

## 8. Financial scenarios (24 months)

**Everything in this section is a model built on labeled assumptions. None of it is market data.**

### 8.1 Inputs

| Input | Conservative | Realistic | Optimistic | Rationale / evidence |
|---|---|---|---|---|
| Launch-month installs | 800 | 2,500 | 6,000 | PH anecdotes: about 86–279 installs (§6.3). Reddit/HN posts add more. The Optimistic case assumes a hit post. |
| Baseline new installs/mo (M1→M24, linear) | 200 → 400 | 700 → 2,300 | 2,500 → 12,000 | 87% of extensions stay below 1k users (§6.3). Realistic assumes good CWS ratings and SEO compounding. |
| Viral spike | none | none | +30,000 in M9 | One YouTube/TikTok moment. Dracula's "one viral tweet" precedent. |
| Weekly-active survival by months since install | 20% + 25%·e^(−age/2) | 30% + 25%·e^(−age/2) | 35% + 25%·e^(−age/2) | No citable extension retention benchmark (unverified). Anecdotes of 30–50% immediate uninstalls ([Indie Hackers thread](https://www.indiehackers.com/post/what-does-your-install-uninstall-ratio-look-like-f44076717a), search summary, not fetched). A passive cosmetic extension may retain better than apps. |
| Pro launch month | M6 | M6 | M4 | Build the free core and community first (§9). |
| Paying users as % of WAU (steady state, 6-month ramp) | 0.5% | 1.5% | 3.0% | §3.2 (Social Fixer 1.5% ever-donate; indie 0.8%; RevenueCat freemium 2.1%) |
| Blended revenue per payer per month | $2.75 | $2.75 | $2.90 | $29/yr (=$2.42/mo) and $3.99/mo at a 70/30 annual/monthly mix ≈ $2.89. Minus PPP and promo discounts. |
| Payment fees + refunds (of gross) | 13% + 3% | 12% + 2% | 11% + 2% | §4.2 MoR blend: annual about 6.7–8.2%, monthly about 15–23%, international surcharges |
| Infra | per §7.3 (lean) | same | same | The $5 Workers Paid floor dominates |
| Other fixed cash costs/mo | $15 + domain | $25 + domain + Apple $99/yr from M12 | $60 + domain + Apple from M9 | Email, error tracking, misc SaaS. CWS fee in M1. |
| Extra (Optimistic only) | — | — | 3 team contracts × $150/mo from M18; creator template GMV = 0.4% of WAU × $4/mo from M18 at a 20% take | **Highly speculative.** No evidence a team market exists (§5). |
| Founder labor | **excluded from cash** | excluded | excluded | Shown separately in §8.3 |

### 8.2 Outputs

**Conservative**

| Month | New installs/mo | Cumulative installs | WAU | WAU ÷ cum. installs | Paid conv. (of WAU) | Paying users | Gross / mo | Fees+refunds / mo | Infra / mo | Other fixed / mo | Net / mo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | 1,000 | 1,000 | 450 | 45% | 0.00% | 0 | $0 | $0 | $5 | $21 | −$26 |
| M3 | 217 | 1,426 | 463 | 32% | 0.00% | 0 | $0 | $0 | $5 | $16 | −$21 |
| M6 | 243 | 2,130 | 583 | 27% | 0.08% | 0 | $1 | $0 | $5 | $16 | −$20 |
| M12 | 296 | 3,774 | 935 | 25% | 0.50% | 5 | $13 | $2 | $5 | $16 | −$10 |
| M18 | 348 | 5,730 | 1,359 | 24% | 0.50% | 7 | $19 | $3 | $5 | $16 | −$5 |
| M24 | 400 | 8,000 | 1,846 | 23% | 0.50% | 9 | $25 | $4 | $5 | $16 | $0 |

24-month totals: gross **$282**; fees+refunds $45; infra $120; other fixed $387; **net −$270**. M24 run-rate: $25 MRR (≈ $305 ARR).

**Realistic**

| Month | New installs/mo | Cumulative installs | WAU | WAU ÷ cum. installs | Paid conv. (of WAU) | Paying users | Gross / mo | Fees+refunds / mo | Infra / mo | Other fixed / mo | Net / mo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | 3,200 | 3,200 | 1,760 | 55% | 0.00% | 0 | $0 | $0 | $5 | $31 | −$36 |
| M3 | 839 | 4,809 | 2,063 | 43% | 0.00% | 0 | $0 | $0 | $5 | $26 | −$31 |
| M6 | 1,048 | 7,743 | 2,955 | 38% | 0.25% | 7 | $20 | $3 | $5 | $26 | −$13 |
| M9 | 1,257 | 11,304 | 4,129 | 37% | 1.00% | 41 | $114 | $16 | $5 | $26 | $67 |
| M12 | 1,465 | 15,491 | 5,512 | 36% | 1.50% | 83 | $227 | $32 | $5 | $34 | $156 |
| M18 | 1,883 | 25,743 | 8,851 | 34% | 1.50% | 133 | $365 | $51 | $5 | $34 | $275 |
| M24 | 2,300 | 38,500 | 12,943 | 34% | 1.50% | 194 | $534 | $75 | $5 | $34 | $420 |

24-month totals: gross **$5,446** (Y1 $848, Y2 $4,598); fees+refunds $762; infra $120; other fixed $734; **net $3,829** (Y1 $345, Y2 $3,484). M24 run-rate: **$534 MRR (≈ $6.4k ARR)**.

**Optimistic**

| Month | New installs/mo | Cumulative installs | WAU | WAU ÷ cum. installs | Paid conv. (of WAU) | Paying users | Gross / mo | Fees+refunds / mo | Infra / mo | Other fixed / mo | Net / mo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | 8,500 | 8,500 | 5,100 | 60% | 0.00% | 0 | $0 | $0 | $5 | $66 | −$71 |
| M3 | 3,326 | 14,739 | 7,214 | 49% | 0.00% | 0 | $0 | $0 | $5 | $61 | −$66 |
| M6 | 4,565 | 27,196 | 12,092 | 44% | 1.50% | 181 | $526 | $68 | $5 | $61 | $392 |
| M9 | 35,804 | 73,370 | 36,480 | 50% | 3.00% | 1,094 | $3,174 | $413 | $5 | $69 | $2,687 |
| M12 | 7,043 | 93,261 | 38,389 | 41% | 3.00% | 1,152 | $3,340 | $434 | $5 | $69 | $2,832 |
| M18 | 9,522 | 144,196 | 56,197 | 39% | 3.00% | 1,686 | $5,519* | $717 | $5 | $69 | $4,727 |
| M24 | 12,000 | 210,000 | 80,724 | 38% | 3.00% | 2,422 | $7,731* | $1,005 | $5 | $69 | $6,652 |

\*Includes $450/mo team contracts and about $180–260/mo marketplace take (on $900–1,300 GMV). Both are speculative.

24-month totals: gross **$82,094** (Y1 $15,779, Y2 $66,315); fees+refunds $10,672; infra $120; other fixed $1,599; **net $69,703**. M24 run-rate: **$7.7k MRR (≈ $93k ARR)**.

### 8.3 What it takes to be a business (break-even math, computed)

| Target net / month | Assumed conversion and price | Paying users needed | WAU needed | Cumulative installs needed (at ~30% long-run active) |
|---|---|---|---|---|
| $1,000 | 1.5%, $2.75 | ~423 | ~28k | ~94k |
| $1,000 | 3.0%, $2.90 | ~396 | ~13k | ~44k |
| $5,000 (modest solo salary) | 1.5%, $2.75 | ~2,100 | **~141k** | **~470k** |
| $5,000 | 3.0%, $2.90 | ~2,000 | ~66k | ~220k |

**Founder labor (Assumption, Realistic M24):** about 11 h/mo moderation, 8–16 h/mo template breakage for 2 sites, about 2 h/mo support, plus feature work. At even $40/h opportunity cost, the 8–20 h/mo of operations alone ($320–$800) cancels the realistic M24 net of $420/mo.

---

## 9. Recommended business model

### 9.1 Principles

1. **The core is free forever:** install the extension, apply and toggle any public template, per-site enable/disable, the basic visual editor, publish publicly, rate, fork. This is required for the CWS Featured badge ("core features must also work without extra credentials or payments"; [CWS discovery](https://developer.chrome.com/docs/webstore/discovery)), and to compete with Stylus/Stylebot.
2. **Charge for services and power, not for content:** things that cost money to run or save power users time.
3. **Never monetize data or ads.** The Stylish precedent and all-sites permissions make this existential.

### 9.2 What to charge for (Pro, $3.99/mo or $29/yr; limited lifetime $59; PPP bands)

| Pro feature | Why people pay | Cost to serve |
|---|---|---|
| Cloud sync and backup across browsers/devices | Obsidian Sync precedent; real value for multi-device users | ~$0 on CF (§7) |
| Private and unlisted templates; template history and rollback | Power users, and freelancers styling for clients | ~$0 |
| Advanced editor: design-token variables, conditional rules (dark mode, viewport, URL patterns), multi-site packs, import from Stylus/UserCSS | Saves hours; Stylebot covers only the basics | Dev time |
| Per-site profiles and schedules (e.g. "focus mode" 9–5) | Productivity framing raises WTP | ~$0 |
| Early access to new first-party templates; supporter badge | Obsidian Catalyst-style | ~$0 |
| **Also:** an honor-system "Supporter" one-time payment ($10, à la Dark Reader / Social Fixer) for people who want to pay without Pro | Captures the ~1–2% donors | ~$0 |

### 9.3 When to introduce payments

| Phase | Months | Payments | Gate to move on |
|---|---|---|---|
| 0: Tool first | 0–3 | Tip / supporter link only | 2k+ WAU; CWS rating ≥ 4.5; at least 50 community templates; 4-week WAU retention ≥ 30% of installs |
| 1: Pro | 3–6 | Pro via MoR (Stripe Managed Payments if the founder's country is eligible, otherwise Paddle or Polar) | ≥ 1% of WAU paying within 3 months of launch. If < 0.5%, re-price or rethink before building anything else. |
| 2: Creator economy-lite | 12+ | Tip links on templates; "verified purchase" unlock via creators' Gumroad license keys; Pro referral share for creators | ≥ 20 creators with ≥ 1k installs each who ask to sell |
| 3: Marketplace or teams (optional) | 18+ | Only if phase 2 GMV > ~$2k/mo, or ≥ 3 companies sign paid pilots | Legal/tax review before Connect |

### 9.4 Creator revenue-sharing options (if or when a marketplace exists)

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Tips (recommended first)** | Ko-fi / GitHub Sponsors links on template pages | Zero liability; matches community norms (Discord, Obsidian, Spicetify) | Small amounts |
| **B. BYO storefront + license verification (recommended second)** | Creator sells on Gumroad (Gumroad is MoR, 10% + 50¢); the platform checks the license key and unlocks | No tax or KYC for you; creators keep about 70–80% after fees | Clunky two-step UX; no platform revenue |
| **C. Pro-referral revenue share** | Creators earn e.g. 30–50% of first-year Pro revenue from users they refer (Framer pays "50% of their subscription for 12 months") | Aligns creators with your *real* revenue; no per-template payments | Needs attribution tracking; small amounts early |
| **D. Pro pool share** | X% of Pro revenue split by installs or usage of creators' templates among Pro users (Spotify-style) | Rewards maintenance; payments are batched | Gaming and fraud risk; still needs Connect and tax handling |
| **E. Full marketplace (Connect)** | Platform sells templates; 15–20% take (Figma 15%, Shopify 15%) | Platform revenue | MoRs exclude it; tax liability; payout costs ~11% on small balances; copy and leak takedowns. **Not for a solo developer.** |

### 9.5 What NOT to build

- An in-house paid-template checkout, Connect payouts, or a creator wallet in year 1.
- DRM or obfuscation for templates (it violates CWS/AMO policy and doesn't work).
- Ads, affiliate injection, sponsored placements, or any browsing-data monetization.
- Enterprise SSO, admin console or managed-policy features before 3+ companies sign paid pilots.
- Per-page-load API calls (the 40× cost path in §7.3), or analytics that log URLs.
- Support for 10 sites at launch. Each supported site is a recurring maintenance liability. Start with 1–2.

---

## 10. Reasons the business could fail (financial angle)

1. **Free substitutes cap willingness to pay.** Stylus, Stylebot, Violentmonkey and Dark Reader are free and open source. The category norm treats payment as an "antifeature" (Greasy Fork). Conversion may land at or below 0.5%.
2. **Revenue too small to justify the time.** The realistic scenario nets about $420/mo at M24, below the cost of 10–20 h/mo of operations. Most extensions never pass 1,000 users.
3. **Maintenance treadmill.** Target sites change their DOM. Templates break, ratings drop, and CWS ranking (driven by ratings and usage) falls. Labor scales with the number of sites and templates, not with revenue.
4. **Platform absorption.** Discord sells themes in Nitro. YouTube, Reddit or X could ship native customization, or tighten anti-modification measures and break the product.
5. **Store and policy risk.** All-sites host permissions attract review scrutiny. A removal (as with Enhancer for YouTube on AMO, or Stylish) zeroes installs overnight. There is no in-store payment fallback (CWS payments are deprecated).
6. **Payment-stack fragility.** Lemon Squeezy closed to new sign-ups and shuts down March 31, 2027. MoRs exclude marketplaces. The fixed per-transaction fee eats 15–27% of small payments.
7. **Copying and leakage.** Any paid template leaks within days. Takedowns become an unpaid moderation job.
8. **Marketplace tax and compliance trap.** Acting as seller of others' digital goods brings VAT deemed-supplier and payout-reporting obligations. A single compliance failure can exceed lifetime revenue at this scale.
9. **Moderation cost outruns revenue at scale.** At 100k WAU, review alone is about 80 h/mo (Assumption) against about $4k MRR (optimistic-like conversion). Without automation it doesn't work.
10. **Lifetime-deal overhang.** Lifetime buyers generate support and maintenance cost forever with no recurring revenue.
11. **Retention unknown.** Survival curves are assumptions. If long-run active users are 15% of installs rather than 30%, every scenario halves.

---

## Sources (all accessed 2026-11-19)

**Cloudflare**
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/kv/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/buckets/public-buckets/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://developers.cloudflare.com/email-service/platform/pricing/
- https://cfdomainpricing.com/ (third-party registrar price tracker)

**Payments and tax**
- https://stripe.com/pricing
- https://stripe.com/connect/pricing
- https://docs.stripe.com/payments/managed-payments
- https://docs.stripe.com/payments/managed-payments/eligibility
- https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing.md?payment-ui=stripe-hosted
- https://www.paddle.com/pricing
- https://paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle
- https://polar.sh/resources/pricing
- https://polar.sh/docs/merchant-of-record/acceptable-use
- https://www.lemonsqueezy.com/pricing
- https://techstartups.com/?p=140481 (secondary, Lemon Squeezy shutdown)
- https://extensionpay.com/
- https://extensionpay.com/articles/browser-extensions-make-money
- https://www.paypal.com/us/business/paypal-business-fees
- https://gumroad.com/pricing
- https://gumroad.com/help/article/76-license-keys
- https://developer.apple.com/support/enrollment/
- https://developer.apple.com/app-store/small-business-program/
- https://insightplus.bakermckenzie.com/bm/tax/european-union-cjeu-judgment-in-xyrality-c-10124-clarifying-the-scope-of-article-28-of-the-principal-vat-directive
- https://www.revenue.ie/en/vat/vat-on-services/electronic-services/vat-and-electronically-supplied-services/index.aspx

**Browser stores and policies**
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/XLeZ6iKiuVI
- https://9to5google.com/2020/09/22/google-chrome-paid-extensions-deprecation/
- https://developer.chrome.com/docs/webstore/register
- https://www.computerworld.com/article/1554628/google-makes-chrome-devs-dig-into-pockets.html
- https://developer.chrome.com/docs/webstore/discovery
- https://developer.chrome.com/docs/webstore/program-policies/code-readability
- https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://support.google.com/chrome/a/answer/6306504
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/ikDay6v77yY
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account
- https://extensionworkshop.com/documentation/publish/add-on-policies/
- https://9to5google.com/2019/08/05/chrome-extensions-under-1000-users/
- https://debugbear.com/blog/counting-chrome-extensions

**Comparable products**
- https://github.com/openstyles/stylus
- https://www.ghacks.net/2018/07/03/it-is-time-to-get-rid-of-stylish/
- https://www.scworld.com/news/google-mozilla-boot-stylish-from-add-on-stores-after-it-collects-data-on-browsing-histories
- https://github.com/ankit/stylebot
- https://www.tampermonkey.net/faq.php?q=Q501
- https://www.tampermonkey.net/contrib.php
- https://github.com/Tampermonkey/tampermonkey
- https://github.com/violentmonkey/violentmonkey
- https://greasyfork.org/en/help/code-rules
- https://greasyfork.org/en/help/antifeatures
- https://en.wikipedia.org/wiki/Userscript
- https://darkreader.org/
- https://darkreader.org/elements/pay-tiers.js
- https://github.com/darkreader/darkreader
- https://apps.apple.com/us/app/-/id1438243180
- https://nighteye.app/pricing/
- https://www.mrfdev.com/enhancer-for-youtube
- https://discourse.mozilla.org/t/enhancer-for-youtube-is-gone/123749
- https://unhook.app/
- https://socialfixer.com/donate.html
- https://github.com/BetterDiscord/BetterDiscord
- https://github.com/Vendicated/Vencord
- https://docs.betterdiscord.app/plugins/publishing/guidelines
- https://docs.betterdiscord.app/themes/publishing/guidelines
- https://www.worldanvil.com/w/spleen-s-meta-world-notahumanhand/a/custom-css-commissions-article
- https://skythehusky.gumroad.com/l/FurryThemes
- https://driftware.itch.io/discord-css-themes
- https://discord.com/blog/bring-your-vibe-to-discord-with-new-themes-in-nitro
- https://www.engadget.com/discord-themes-nitro-subscription-100135630.html
- https://spicetify.app/
- https://github.com/spicetify/cli
- https://obsidian.md/pricing
- https://docs.obsidian.md/Community+directory/Developer+policies
- https://obsidian.md/blog/future-of-plugins/
- https://www.raycast.com/pricing
- https://manual.raycast.com/extensions
- https://arc.net/
- https://www.engadget.com/big-tech/atlassian-is-buying-arc-maker-the-browser-company-for-610-million-145236236.html
- https://draculatheme.com/pro
- https://draculatheme.gumroad.com/l/dracula-pro
- https://www.indiehackers.com/post/how-i-made-101-578-04-selling-colors-online-1690e49618
- https://monokai.pro/license
- https://skalt.github.io/til/2023/10/03/
- https://blogherald.com/blogging-news/the-licensing-shift-that-forced-wordpress-theme-sellers-to-rethink-how-they-make-money/

**Template marketplaces**
- https://www.chargepanda.com/blog/post/envato-july-2026-changes-wordpress-authors-guide
- https://author.envato.com/hub/changes-to-envato-market-revenue-share-and-exclusivity-what-you-need-to-know/ (linked official announcement; not fetched directly)
- https://help.figma.com/hc/en-us/articles/12067637274519-About-paid-Community-resources
- https://www.framer.com/help/articles/how-the-creator-program-works/
- https://framer.com/creators
- https://webflow.com/updates/template-creator-enhancements (via search snippet; direct fetch failed)
- https://www.notion.com/help/selling-on-marketplace
- https://shopify.dev/docs/storefronts/themes/store/revenue-share
- https://typefully.com/TomFrankly/dollar1-million-in-notion-template-sales-kuFT0iD

**Willingness to pay, conversion, retention**
- https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion
- https://www.revenuecat.com/state-of-subscription-apps-2026/
- https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026.md
- https://dev.to/ktg0215/real-numbers-freemium-chrome-extension-monetization-after-6-months-5hga
- https://www.indiehackers.com/post/what-does-your-install-uninstall-ratio-look-like-f44076717a (via search summary; not fetched)

**Cold start and acquisition**
- https://www.lennysnewsletter.com/p/atomic-network
- https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace-9ee
- https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem
- https://cdixon.org/2015/01/31/come-for-the-tool-stay-for-the-network/
- https://wicki.io/posts/2020-06-stats-and-learnings-from-finishing-11-on-product-hunt/
- https://www.indiehackers.com/post/how-i-made-it-to-7-on-ph-and-got-623-unique-page-visits-279-downloads-and-was-featured-on-2-large-publications-0e4524fe83 (via search summary; not fetched)

**Enterprise / digital adoption (adjacent)**
- https://techcrunch.com/2024/06/05/sap-to-acquire-digital-adoption-platform-walkme-for-1-5b/
- https://www.pendo.io/pricing/
- https://www.vendr.com/buyer-guides/walkme (WalkMe median ~$39k/yr, as reported in secondary sources; Vendr returned 403, so unverified)
