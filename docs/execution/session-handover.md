# Session Handover

**Every session: read this file first, update it last.** Keep it short; history belongs in git and `decisions.md`.

---

## Current state (2026-11-19, end of M0)

- **M0 Foundations: done.**
  - pnpm workspace.
  - WXT 0.21.5 + React 19 extension shell with a popup and a background worker.
  - Package skeletons (`schema`, `compiler`, `adapters`, `templates`, `brand`, `test-fixtures`).
  - Biome, Vitest, and a Playwright e2e smoke test that loads the real extension in Chromium.
  - GitHub Actions CI.
  - `check:manifest` guard.
  - `pnpm check` and `pnpm test:e2e` pass locally.
- **CI:** `.github/workflows/ci.yml` hasn't run on GitHub yet; it runs on the first push.
- **Repo:** public at github.com/developersharif/reweave-ext (`main`).
- **Decisions:** React confirmed (D-007). MIT and open source (D-016). TypeScript pinned to 6.0.x (D-022). Biome (D-023). Manifest guard (D-024).
- **Research docs:** technical-research §3–§4 filled in. §5–§6 wait for the M2/M4 spikes.

## Next action

**M1, the engine core.** These can start in parallel:
- **T-1.1** schema + validation-library choice;
- **T-1.2** css-tree dialect spike;
- **T-1.3a** attack fixtures.

Then T-1.3 → T-1.4 → T-1.5 → T-1.6 → T-1.7. Use Context7 for css-tree and for Zod/Valibot.

## Open questions for the founder

1. Brand clearance (T-6.6) can wait until M6, but it must happen before the public listing.
2. The `LICENSE` copyright line reads "developersharif and Reweave contributors". Change it if you want your legal name there.

## Session log

| Date | Session focus | Outcome | Next |
|---|---|---|---|
| 2026-11-19 | Research, naming, strategy, architecture, roadmap | Docs created; research partially interrupted by founder request | T-0.1 |
| 2026-11-19 | M0 foundations | T-0.1–T-0.6 done; check and e2e green locally | M1 (T-1.1, T-1.2, T-1.3a) |
