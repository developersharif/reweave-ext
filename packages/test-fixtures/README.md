# @reskin/test-fixtures

Inputs shared by tests across the workspace. CI never touches live sites (D-020); these files stand in for them.

| Path | What |
|---|---|
| `spec-example/` | The template from template-schema.md §3.1, used by schema and compiler tests |
| `adapters/youtube-spec.json` | The §11 example adapter (frozen; the real adapter lives in `packages/adapters/youtube/`) |
| `palettes/` | DTCG palettes for compiler tests |
| `youtube/*.html` | Structure-only snapshots of logged-out YouTube pages, plus `pages.json` (URL path and route for each) |

## Structure-only snapshots

`youtube/*.html` comes from `apps/extension/scripts/capture-youtube-fixtures.mjs`. It is a manual tool that loads the live site logged out, so no account data is involved. Each file is a copy of the rendered DOM with:

- **removed:**
  - `<head>` contents;
  - `script`, `style`, `link`, `meta`, `noscript`, `iframe`, `img`, `video`, `audio`, `source`, `canvas`, `object`, `embed`, `input`, `textarea`;
  - all text nodes and comments, and the contents of `svg` and `template`.
- **attributes:**
  - kept: `id`, `class`, `page-subtype`, `role`, `slot`, `type`, `target-id`. Tokens that look generated (mixed case with digits, all digits, or over 40 characters) are dropped;
  - other attributes keep only their presence (`is-shorts=""`);
  - removed entirely: `on*`, `data-*`, `aria-*`, and anything carrying content or URLs (`href`, `src`, `title`, `alt`, `style`, `label`, `value`, `name`, ...).
- **reparented elements:** an `<a>` inside an `<a>` or a `<button>` inside a `<button>` becomes a `<span>`. The HTML parser can't nest those and would move everything after them. Adapter selectors must not rely on those inner elements.

The capture script fails unless each saved file parses back into the same element tree as the sanitized DOM. `packages/adapters/test/youtube.test.ts` re-checks the stripping rules on every run.

Re-capture after YouTube changes its markup. Review the diff, then run `pnpm --filter @reskin/adapters test`.
