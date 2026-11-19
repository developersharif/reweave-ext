# Session Handover

**Every session: read this file first, update it last.** Keep it short; history belongs in git and `decisions.md`.

---

## Current state (2026-11-19)

- **Phase:** Research & planning complete enough to start building. **No code exists yet.** Not yet a git repository.
- **Research completeness:**
  - ✅ `competitor-analysis.md`: full, cited.
  - ✅ `business-model.md`: full, cited.
  - ✅ `naming-research.md`: domains verified; conflict/trademark checks **incomplete**.
  - ⚠️ `market-research.md`, `technical-research.md`, `security-and-legal.md`: **partial**. Research was stopped by the founder to start building, and the remaining unknowns are now spike tasks.
- **Key decisions:** see `decisions.md`.
  - D-001: positioning.
  - D-002 and D-003: declarative templates plus site adapters.
  - D-004: YouTube first, then Reddit and X; no Facebook.
  - D-006: local-first.
  - D-007: React, still **Proposed**.
  - D-010: working brand "Reweave", still **Proposed**.

## Next action

**Start M0 with T-0.1, then T-0.2.** Concretely:

1. `git init`, then create the pnpm workspace (`apps/*`, `packages/*`), strict TS base config and the root scripts (`check`, `test`, `build`, `dev`).
2. Load the current WXT docs through Context7 (`resolve-library-id` "wxt", then `query-docs`). Scaffold `apps/extension` with React + TS and confirm the runtime content-script registration API.
3. Write the WXT version and findings into `docs/research/technical-research.md` §4.
4. Mark T-0.1 and T-0.2 `done` in `task-tracker.md` and update this file.

T-0.3 (Chrome platform facts) is independent and can run in parallel.

## Open questions for the founder

1. React (D-007) or Vue for extension UI? Default: React.
2. Accept "Reweave" as the working brand (D-010)? Runner-ups are in naming-research.md.
3. Open-source the extension client under MIT (D-016)?
4. Is there a GitHub org/account to host the repo and the future `templates` repo?

## Session log

| Date | Session focus | Outcome | Next |
|---|---|---|---|
| 2026-11-19 | Research, naming, strategy, architecture, roadmap | Docs created; research partially interrupted by founder request | T-0.1 |
