# Backend Architecture (Cloudflare)

**Not needed until M7.** MVP-1 is local-first (D-006). This document fixes the shape now so the extension's update and install code (M7) has a stable contract.

## Phase A — Static signed catalog (M7–M8)

```
GitHub templates repo ──PR──▶ CI: reskin validate (comment on PR)
            │ merge to main
            ▼
CI: reskin bundle → sign (Ed25519, key in protected GitHub environment)
            │ upload (immutable keys)
            ▼
R2: bundles/<owner>/<slug>/<version>.json
    assets/<sha256>
    adapters/<id>/<version>.json
    index/v1/catalog.json        (signed; template list + latest versions + status)
    index/v1/adapters.json       (signed; latest adapter versions)
    index/v1/revocations.json    (signed)
            ▲
Worker (Hono) "api"  ── GET /v1/... (edge-cached, ETag) ── extension / website
            │
            └─ POST /v1/installs   anonymous counter (template id + version + day)
               POST /v1/reports    opt-in breakage reports (M8)
Website (Astro, static) built in CI from repo + catalog → Workers static assets
```

### Why this shape
- No accounts, sessions, or moderation UI to build; review happens on GitHub PRs (D-019).
- The signing key never touches the Worker or R2, so a compromised Worker/bucket can't push malicious templates (signatures fail in the extension).
- Cost: business-model.md §7 estimates the cache-first design stays at the **$5/mo Workers Paid minimum up to ~100k WAU**; R2 has no egress fees (verify current pricing when provisioning, T-7.1).

### API (v1)

| Method & path | Purpose | Caching |
|---|---|---|
| `GET /v1/index/catalog` | Signed catalog | edge cache 5 min, ETag |
| `GET /v1/index/adapters` | Signed adapter versions | edge cache 5 min |
| `GET /v1/index/revocations` | Signed revocation list | edge cache 1 min |
| `GET /v1/bundles/:owner/:slug/:version` | Immutable bundle | immutable, 1 year |
| `GET /v1/assets/:sha256` | Immutable asset | immutable, 1 year |
| `GET /v1/adapters/:id/:version` | Immutable adapter | immutable |
| `POST /v1/installs` | `{ templateId, version }` → daily counter | no-store; rate-limited per IP (IP not stored) |
| `POST /v1/reports` (M8) | `{ templateId, version, adapterId, adapterVersion, failedProbes[], extVersion }` | rate-limited; no free text in M8 |

Counter storage: Workers Analytics Engine or a D1 table `install_daily(template_id, version, day, count)` — pick in T-7.3 by cost/simplicity. No IPs, cookies, or user ids stored.

### Extension update protocol (M7)
1. `alarms` every 6 h + on startup: fetch `index/adapters` and `index/catalog` with `If-None-Match`.
2. Verify signature (bundled public keys, `keyId` rotation) and that index `issuedAt` is newer than the last accepted (rollback protection).
3. For installed templates/adapters with newer compatible versions: fetch bundle → verify digest + signature → client-side sanitize → recompile → storage.
4. Apply revocations immediately (disable + notify in popup).

## Phase B — Accounts and community features (M9+, only after Gate B)

Add **D1** (+ Drizzle ORM) for: `users`, `creators`, `templates`, `template_versions`, `install_daily`, `reviews`, `reports`, `collections`, `entitlements`.

- **Auth:** OAuth (GitHub, Google) + email magic link. Candidate library: Better Auth on Workers with D1 — **verify maintenance status and Workers compatibility at M9 start** (research interrupted). Extension sign-in via `chrome.identity.launchWebAuthFlow` or a website → extension token hand-off over `externally_connectable`.
- **Web publishing UI** replaces/augments PRs: upload → same validator → review queue (admin page) → sign. Signing moves to a separate, minimal signing Worker with the key in Workers Secrets and an allowlisted caller, or stays in CI triggered via repository dispatch. Decide in M9.
- **Reviews/ratings** tied to template *version* (competitor-analysis §10.5).
- **Search:** D1 SQLite FTS5 (verify availability in D1 at M9) or a prebuilt static index for the website.
- **Payments (Pro, supporter):** a merchant of record for *our own* subscription (VAT handled). Paddle or Polar are candidates; **avoid Lemon Squeezy** (business-model.md reports closed sign-ups and a 2027-03-31 shutdown). No creator payouts in Phase B (D-009).
- **Queues:** only if screenshot rendering/moderation jobs need async processing.

## Environments

| Env | Purpose |
|---|---|
| `dev` | local `wrangler dev` with local R2/D1 |
| `staging` | separate bucket/Worker; extension "staging" build points here |
| `prod` | custom domain (after name clearance) |

Secrets: signing private key only in CI protected environment (Phase A). Never in the repo, Worker, or extension.
