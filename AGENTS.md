# AGENTS.md: Working Rules for Coding Sessions

This repo is built across many sessions, by Claude Code and other agents. These rules keep them consistent. **Read this file, then [`docs/execution/session-handover.md`](docs/execution/session-handover.md), then the task you're picking up in [`docs/execution/task-tracker.md`](docs/execution/task-tracker.md).**

## 1. What we're building

A Chrome MV3 extension that applies community-made **templates** to supported sites (YouTube → Reddit → X). Templates are declarative CSS plus JSON, written against platform-maintained **site adapters** and compiled on the device. Later phases add a GitHub-PR-based community catalog and a Cloudflare backend.

- Product context: `docs/product/`.
- Architecture: `docs/architecture/`.
- Formats: `docs/architecture/template-schema.md`.

**Names:**
- The working brand is "Reweave", and it lives **only** in `packages/brand`.
- The code name `reskin` is used for package scope (`@reskin/*`), the CLI and identifiers.
- The internal CSS prefix is `rk`.

## 2. Non-negotiables

Break one only with a new Accepted entry in `docs/execution/decisions.md`.

1. **No remote code.** The extension never fetches or evaluates JS or Wasm. Only signed JSON, CSS and assets cross the network. Don't add `eval`, `new Function`, or a DOM-operation interpreter (D-002; CWS policy, technical-research F1–F2).
2. **No creator JavaScript** in templates, in any form (D-002).
3. **No network from template CSS:** no `@import` and no external `url()`. Assets only via `asset()` (D-014).
4. **Sanitize twice:** the compiler's sanitizer runs in CI/server *and* in the extension before install/compile (security-model §3).
5. **Permissions:** `storage` and `scripting` only, plus per-site `optional_host_permissions`. Never `<all_urls>`, `tabs`, `webNavigation`, `history` or `cookies`. `activeTab` (M5) and `alarms` (M7) only when their milestone needs them (D-011).
6. **No telemetry by default.** Never send URLs, titles, page content or user identifiers (D-017).
7. **Expose no `web_accessible_resources` and leave no DOM markers** on pages (security-model T8).
8. **Content script stays tiny:** no framework, no compiler, ≤ 25 KB minified (NFR-01).
9. **Never apply templates on adapter `sensitive` routes**, and never let templates hide `protected` components.
10. **No Facebook, Instagram or LinkedIn adapters** at launch (D-004).

## 3. How to work

1. Pick the first `todo` task whose dependencies are `done`. Mark it `in-progress (date)`.
2. **Spike tasks (🔬)** produce written findings (with source URLs or measurements) in the named doc *before* dependent code is written.
3. **Library and API docs:** use Context7 for WXT, React, Chrome extension APIs, Cloudflare, css-tree, CodeMirror, Playwright, Vitest (`resolve-library-id` → `query-docs`). Don't rely on memory for APIs that change.
4. Keep changes scoped to the task. If you discover new work, add a task to the tracker rather than expanding scope.
5. When you finish:
   - mark the task `done`;
   - add a row to the handover session log;
   - update "Next action";
   - record any decision in `decisions.md`;
   - update any doc your change made inaccurate, in the same change.

## 4. Conventions

- **TypeScript:** strict mode with `noUncheckedIndexedAccess`. No `any` (use `unknown` and narrow). Prefer named exports, small modules, and pure functions in the engine.
- **Boundaries:**
  - `packages/schema` and `packages/compiler` must not use DOM or `chrome.*` APIs; they must run in Node, the service worker and CI.
  - Browser APIs stay in `apps/extension`.
- **Errors:** validation and compile problems are `{ code, path, message, severity }` with stable `UPPER_SNAKE` codes. Tests assert codes, not messages.
- **Messages and storage:** every runtime message and storage value has a schema in `packages/schema` and is validated at the boundary.
- **Tests:**
  - Vitest next to the code (`*.test.ts`).
  - Golden files for compiler output.
  - Attack fixtures for the sanitizer.
  - Adapter tests run against `packages/test-fixtures`.
  - E2E uses Playwright with request interception against fixtures. **CI never hits live sites.**
- **Fixtures:** structure-only snapshots. Strip scripts, text, images and anything personal.
- **Dependencies:** justify each new runtime dependency in the PR or commit message. Prefer zero-dependency code for the content script. Pin versions.
- **Git:**
  - one branch per task (`t-2.6-content-sheets`);
  - Conventional Commits (`feat(compiler): …`);
  - commit only when the user asks.

## 5. Definition of done

- [ ] The acceptance criteria in the tracker are met.
- [ ] `pnpm check` passes (typecheck, lint, test, build for Chrome **and** Firefox).
- [ ] New logic has tests. Sanitizer or security-relevant changes add or extend attack fixtures.
- [ ] No non-negotiable is violated. Permissions in the built manifest are unchanged unless the task says otherwise.
- [ ] Docs, tracker and handover are updated.

## 6. Commands

To be filled in by T-0.1 and T-0.2. Until then, see the planned commands in `README.md`.
