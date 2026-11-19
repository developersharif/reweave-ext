# Session Handover

**Every session: read this file first, update it last.** Keep it short; history belongs in git and `decisions.md`.

---

## Current state (2026-11-19, end of M2)

- **M0 Foundations: done** (#1). **M1 Engine core: done** (#2, merged as 612ea39).
- **M2 Extension runtime + YouTube: done** on branch `m2-runtime` (not yet committed or merged).
  - **Spikes:** injection (T-2.1) and navigation (T-2.2) were measured on live YouTube, technical-research §5. D-021 is confirmed; the navigation strategy is D-031.
  - **YouTube adapter v1** (`packages/adapters/youtube`): 8 routes (account sensitive), 38 components (1 protected), 12 probes, `yt-navigate-finish`.
    - Seven structure-only fixtures, captured by script.
    - Tests run selectors in headless Chromium (D-030).
  - **Background** (`apps/extension/src/background/`): registry, compile service, content-script registration, migrations, and a validated router that accepts extension pages only. State changes are serialized. `permissions.onAdded` enables a site.
  - **Content script** (13.8 KB): adopted sheets per route group, navigation with a grace period, sensitive routes, live `storage.onChanged`, pause, protected guard (T-2.9).
  - **Popup** (React): detection states without `tabs` (D-032), on/off, template switch including "Original site", variant, generated settings controls, reset, global pause.
  - **Dev template** `reskin/focus-youtube` (`packages/templates`).
  - **Guards:** `check:size` (content ≤ 25 KB, no React or compiler; SW ≤ 60 KB gzip, now 42 KB).
  - **Tests:**
    - unit: 96 schema, 99 compiler, 20 adapter, 3 template, 28 extension;
    - e2e: 6 against fixture-backed youtube.com (`RK_E2E` build, D-029);
    - manual live smoke on real YouTube (logged out): all checks passed, no extension errors.
- **Founder checks (2026-11-19):** the logged-in live check (T-2.11) passed, with every component matched on all 7 pages. The founder also tested the extension by hand. The permission prompt can't be automated (D-029), so re-test it by hand when the enable flow changes.

## Next action

**M3, curated templates, palettes, health and library.** Start with the first `todo` task in the M3 table of the tracker.

Open question carried from M2: D-032. Until `activeTab` arrives (M5), the popup can't recognise a supported site before it's enabled. Revisit if that confuses people in testing.

## Open questions for the founder

1. Brand clearance (T-6.6) can wait until M6, but it must happen before the public listing.
2. The `LICENSE` copyright line reads "developersharif and Reweave contributors". Change it if you want your legal name there.

## Session log

| Date | Session focus | Outcome | Next |
|---|---|---|---|
| 2026-11-19 | Research, naming, strategy, architecture, roadmap | Docs created; research partially interrupted by founder request | T-0.1 |
| 2026-11-19 | M0 foundations | T-0.1–T-0.6 done; check and e2e green locally | M1 (T-1.1, T-1.2, T-1.3a) |
| 2026-11-19 | M1 engine core | T-1.1–T-1.7 done; D-025–D-028; `pnpm check` green | M2 (T-2.1, T-2.2, T-2.3) |
| 2026-11-19 | M2 extension runtime | T-2.1–T-2.11 done (T-2.11: founder's logged-in check); D-029–D-032; `pnpm check` + 6 e2e green; live smoke passed | M3 |
