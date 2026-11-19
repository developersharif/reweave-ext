# Reweave *(working name; code name `reskin`)*

Community-made redesigns for the sites you live on (YouTube first, then Reddit and X), **kept working when those sites change**.

- Browser extension (Chrome MV3, built with WXT).
- Templates are declarative: CSS plus JSON. They contain no JavaScript.
- Templates are compiled on your device against platform-maintained **site adapters**, so a single adapter fix repairs every template that uses it.
- Zero telemetry by default. Per-site permissions only.

> **Status (2026-11-19): planning complete, no code yet.** Next step: M0 / T-0.1. See [`docs/execution/session-handover.md`](docs/execution/session-handover.md).

## Why this exists, in one paragraph

Restyling websites is a solved, free commodity: Stylus and Stylebot do it. What nobody does well is keep redesigns *working*. Styles rot whenever a site ships a change, galleries carry no "does this still work?" signal, and script-based tools now sit behind Chrome's off-by-default "Allow User Scripts" toggle. This project bets on three things:
- maintenance as the product: adapters plus compatibility checks;
- real layout changes done purely in CSS;
- a trustworthy, private-by-design catalog.

The full reasoning, including why this might fail, is in [`docs/product/vision.md`](docs/product/vision.md).

## Documentation map

| Area | Documents |
|---|---|
| **Start here** | [`AGENTS.md`](AGENTS.md) (rules for any coding session) · [`docs/execution/session-handover.md`](docs/execution/session-handover.md) |
| Product | [vision](docs/product/vision.md) · [positioning](docs/product/positioning.md) · [requirements](docs/product/requirements.md) · [user flows](docs/product/user-flows.md) · [MVP scope](docs/product/mvp-scope.md) |
| Architecture | [overview](docs/architecture/overview.md) · [extension](docs/architecture/extension-architecture.md) · [template schema](docs/architecture/template-schema.md) · [backend](docs/architecture/backend-architecture.md) · [security model](docs/architecture/security-model.md) |
| Execution | [roadmap](docs/execution/roadmap.md) · [task tracker](docs/execution/task-tracker.md) · [decisions](docs/execution/decisions.md) · [risks](docs/execution/risks.md) |
| Research | [competitors](docs/research/competitor-analysis.md) ✅ · [business model](docs/research/business-model.md) ✅ · [naming](docs/research/naming-research.md) ◐ · [market](docs/research/market-research.md) ◐ · [technical](docs/research/technical-research.md) ◐ · [security & legal](docs/research/security-and-legal.md) ◐ |

✅ complete with citations · ◐ partial (the remaining gaps are spike or checklist tasks)

## Planned repository layout

```
apps/extension        WXT extension: background, content script, popup, options, welcome, studio
apps/api              Cloudflare Worker: catalog delivery and counters (M7)
apps/web              Static marketplace site (M7)
packages/schema       Manifest types, validation, JSON Schema
packages/compiler     CSS sanitizer + authoring-dialect compiler + CLI
packages/adapters     Site adapters (youtube, reddit, x) + fixture tests
packages/templates    Curated templates and palettes bundled with the extension
packages/brand        Product name and URLs (single rename point)
packages/test-fixtures  Structure-only DOM snapshots for tests
```

## Development

Commands are added in M0 (T-0.1, T-0.2). The intended commands:

```sh
pnpm install
pnpm dev        # WXT dev build with auto-reload in Chrome
pnpm check      # typecheck + lint + test + build
pnpm test
pnpm build      # Chrome + Firefox zips
```

## License

Planned: MIT for the extension, adapters and schema (D-016, Proposed).
