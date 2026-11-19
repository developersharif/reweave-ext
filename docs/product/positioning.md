# Positioning & Brand

## 1. Target audiences (ranked for launch)

| # | Segment | Job to be done | Evidence of demand | Role |
|---|---|---|---|---|
| 1 | **Heavy YouTube/Reddit/X users who want focus or density** | "Remove the junk (Shorts, feeds, sidebars), make it calmer/denser" | 1M-user YouTube declutter extensions; 200K-user X control panel (competitor-analysis §3.6, §10) | Primary users |
| 2 | **Theming enthusiasts ("ricers", Catppuccin/Nord/Dracula fans)** | "Make every site match my setup" | Catppuccin userstyles: 136 ports, 1,151★; Dracula PRO ~$101k gross (business-model §1) | Early adopters, palette users, **creators** |
| 3 | **Existing userstyle authors** | "Stop my styles rotting; reach more users" | UserStyles.world 25,845 styles, under-resourced (competitor-analysis §3.1) | Creators |
| 4 | **Arc refugees** | "I lost my Boosts" | Arc shuts down 2026-12-22 | Time-boxed acquisition |
| 5 | Accessibility seekers (larger type, contrast, reduced motion) | "Make it readable for me" | Not researched (market research cut short) | Later segment, needs validation |

Not targeted at launch: general "make Facebook pretty" consumers (legal + technical risk), enterprises (no evidence of a paid market).

## 2. Positioning statement

For people who spend hours a day on YouTube, Reddit and X and want them calmer, denser or just *theirs*, **Reweave** is a browser extension with community-made redesigns that **keep working when those sites change**. Unlike Stylus or Stylebot, every design shows whether it works today, is built on maintained site maps instead of brittle selectors, and never touches your browsing data.

## 3. Differentiation pillars (and proof we must ship)

| Pillar | Proof point in product | Milestone |
|---|---|---|
| **It keeps working** | "Works today ✓ · checked 2 days ago" badge; adapter fixes reach users without a store review | M3 (local), M8 (CI) |
| **Real redesigns, not just colors** | Before/after previews; curated templates that change layout (focus mode, compact grid) | M3 |
| **Your look everywhere** | Pick a palette once, every token-aware template wears it | M3 |
| **Private by design** | Per-site permissions; zero telemetry by default; open-source client; no remote resources in templates | M2, M6 |
| **Made by a community** | Creator credits, GitHub-based publishing, UserCSS import | M5, M7 |

## 4. Messaging

- **Tagline (working):** *The web, rewoven.*
- **Hero:** "Your favorite sites, redesigned by the community — and kept working when they change."
- **Sub-lines:** "Hide Shorts. Calm the feed. Wear your palette everywhere." · "One click to apply. One click to undo."
- **Avoid:** "hack", "inject", "any website", claims of official affiliation, "AI-powered" (Stylebot backlash: competitor-analysis §3.1).

## 5. Brand system (if "Reweave" clears)

| Concept | User-facing term | Internal/technical term |
|---|---|---|
| Product | Reweave | `reskin` (code name) |
| A redesign | **Pattern** | template |
| Color/font set | **Palette** | palette |
| Site map | (invisible to users; "Supported site") | adapter |
| Creator editor | **Studio** | creator mode |
| Works-today badge | **Fit** ("Fits today ✓") — test against plain "Works" in beta | compatibility status |

User-facing vocabulary is a product decision to A/B in the beta copy; code and docs use the technical terms consistently.

## 6. Competitive response playbook

| If… | Then… |
|---|---|
| Stylebot adds ratings/install counts | Lean harder on compatibility CI + adapter layer (can't be added in a weekend) and on curated layout-level designs |
| Tweeks adds settings/versions | Emphasize no-JS safety, no toggle friction, open source, reviewable designs |
| Google ships persistent AI page edits | Position as the *maintained* library; add AI authoring that outputs adapter-based templates |
| A site breaks everything with a redesign | That's our moment: ship the adapter fix within 48 h and say so publicly |
