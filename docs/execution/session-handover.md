# Session Handover

**Every session: read this file first, update it last.** Keep it short; history belongs in git and `decisions.md`.

---

## Current state (2026-11-19, end of M1)

- **M0 Foundations: done.** The PR was merged into `main` (#1). CI is green on GitHub and uploads the Chrome/Firefox zips as artifacts.
- **M1 Engine core: done** (branch `m1-engine`, not yet merged).
  - `packages/schema`: Valibot schemas for templates, adapters and palettes (D-025); semantic checks; stable diagnostic codes (`src/diagnostics.ts`); token contract `standard/v1` with value validation; minimal semver; generated JSON Schemas in `json/`.
  - `packages/compiler`: sanitizer (allowlist walk, escapes and parse errors fail closed), dialect resolver (`:--x`, `token()`, `setting()`, `asset()`, `@setting`), tokens/settings resolution, route-group output (D-021 output contract), `reskin` CLI (`pnpm reskin validate|compile`).
  - Tests: 84 schema tests (44 invalid-manifest fixtures), 97 compiler tests (34 attack fixtures, benign corpus, golden files, CLI). A 256 KB template compiles in ~70 ms (median, warm).
  - Fixtures: the spec example template, the §11 adapter and a DTCG palette live in `packages/test-fixtures/`.
- **Dialect decisions (D-026):** `:--name` kept; tokens are `token(color-bg)` (hyphen, not dot); no CSS nesting in v1; protected components can't be styled at all (D-028).
- **Nothing in the extension uses the compiler yet.** That's M2 (T-2.5, T-2.10).

## Next action

**M2, extension runtime + YouTube.** Start with the two spikes, which can run in parallel:
- **T-2.1** injection spike on live YouTube (adoptedStyleSheets vs `<style>`, FOUC numbers);
- **T-2.2** navigation spike.

T-2.3 (YouTube adapter v1) can start at the same time: it only needs T-1.1. Then T-2.4 → T-2.5 → T-2.6 → T-2.7, plus T-2.8 to T-2.10. New in M2: T-2.9 (runtime protected-component guard) and T-2.10 (service-worker bundle-size guard).

## Open questions for the founder

1. Brand clearance (T-6.6) can wait until M6, but it must happen before the public listing.
2. The `LICENSE` copyright line reads "developersharif and Reweave contributors". Change it if you want your legal name there.

## Session log

| Date | Session focus | Outcome | Next |
|---|---|---|---|
| 2026-11-19 | Research, naming, strategy, architecture, roadmap | Docs created; research partially interrupted by founder request | T-0.1 |
| 2026-11-19 | M0 foundations | T-0.1–T-0.6 done; check and e2e green locally | M1 (T-1.1, T-1.2, T-1.3a) |
| 2026-11-19 | M1 engine core | T-1.1–T-1.7 done; D-025–D-028; `pnpm check` green | M2 (T-2.1, T-2.2, T-2.3) |
