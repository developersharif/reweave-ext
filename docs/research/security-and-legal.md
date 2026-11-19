# Security, Privacy & Legal Research

> **Not legal advice.** **Status: partial.** The dedicated security/legal pass was stopped before it wrote its findings.
> - Items marked **verified** come from sources cited in `competitor-analysis.md` or `business-model.md` (accessed 2026-11-19).
> - Items marked **to verify** are known areas that must be checked against primary sources, or with a lawyer, before the milestone listed.
> - The engineering threat model lives in [`../architecture/security-model.md`](../architecture/security-model.md).

## 1. Chrome Web Store policy

| Topic | Position | Status |
|---|---|---|
| Remote code | Remote CSS/JSON is allowed; remote JS is banned; no interpreter for "complex commands" fetched as data | **Verified** (technical-research F1, F2) |
| User scripts | JS templates need the `userScripts` toggle, so they are excluded by D-002 | **Verified** (F3) |
| Single purpose | Our single purpose: "apply community-made visual redesigns to supported websites" | To verify wording before M6 |
| Permissions | Narrowest permissions; justify each in the listing | To verify before M6 |
| Privacy policy | Required whenever the extension handles user data; must match actual behavior | To verify before M6 |
| Limited Use | Applies to any browsing data we touch; we collect none by default (D-017) | To verify before M6 |
| Trademarks in listing | Descriptive use only ("for YouTube"); no third-party logos as the icon | To verify before M6 |
| Payments | The CWS has had no payment system since 2021; use our own merchant of record | **Verified** (competitor-analysis §8) |

Firefox add-ons (AMO): source-code submission is required for bundled or minified code, along with the data-collection consent rules introduced in 2025. **To verify** before the Firefox release (M10).

## 2. Malicious template risks

Covered in `security-model.md` §3:
- CSS exfiltration;
- tracking beacons;
- UI redress and scam overlays;
- clickjacking-style tricks;
- performance denial of service;
- supply chain.

The local experiment (technical-research §2) confirmed that extension-injected CSS can make network requests. We therefore don't rely on the page's CSP, and template CSS gets no network access at all (D-014).

## 3. Privacy

- **Lesson (verified, business-model §0):** Stylish was pulled from both stores for collecting browsing history. userstyles.org's Chrome listing still discloses browsing-data collection (competitor-analysis §0).
- **Our stance:**
  - no telemetry by default;
  - no URLs, titles or page content ever leave the device;
  - opt-in reports carry only ids, versions and failed probe ids;
  - the client is open source so users can check.
- **GDPR (to verify before M7):**
  - Anonymous counters with no IP storage likely involve no personal data.
  - Accounts in M9 need a lawful basis, processing agreements with processors (Cloudflare, payment provider), and data export and deletion.

## 4. Legal exposure from modifying third-party sites

| Site | Evidence | Risk level (assumption) |
|---|---|---|
| Facebook / Instagram | **Verified:** Meta's terms prohibit changing Facebook's "appearance". Meta acted against Facebook extensions in 2012, 2013 and 2021 (competitor-analysis §8, §10) | **High**: excluded at launch (D-004) |
| LinkedIn | **Verified:** probes for 6,236 extension IDs (F7). Demand is weak | Medium: excluded at launch |
| X | **Verified:** Old Twitter Layout users report suspensions. That tool replaces the client using private APIs, which we don't do | Low–Medium for purely cosmetic CSS |
| YouTube, Reddit | The sources read showed no history of legal action against purely cosmetic extensions. That is not proof of safety | Low |

**To verify before M7 (lawyer or primary sources):**
- the outcome and current status of *Zuckerman v. Meta* (Section 230(c)(2)(B), Unfollow Everything 2.0);
- relevant clauses of the YouTube, Reddit and X terms on modifying display;
- whether showing screenshots of restyled third-party sites in a marketplace raises copyright or trademark issues.

**Design choices that lower risk:**
- purely visual changes;
- no scraping or automation;
- no ad-blocking positioning;
- no logos or official-sounding names in templates (template-schema §10);
- the user chooses and applies every change.

## 5. Store listing & trademark checklist (before M6)

- [ ] Name, icon and screenshots contain no third-party logos as dominant elements.
- [ ] Descriptive phrasing only: "Redesigns for YouTube, Reddit and X". Never "YouTube Redesign by …".
- [ ] Disclaimer: "Not affiliated with or endorsed by Google, Reddit or X Corp."
- [ ] Permission justifications: `storage` (preferences and templates locally), `scripting` (apply styles on sites you enable), optional host permissions (only the sites you choose).
- [ ] The privacy policy URL is live and matches security-model §4.
- [ ] No keyword stuffing in the description.

## 6. User-generated content obligations (before M7)

To verify, each with a primary source:
- **US DMCA safe harbor:**
  - registering a designated agent with the US Copyright Office (fee and renewal period to verify);
  - a notice-and-takedown process;
  - a repeat-infringer policy.
- **EU Digital Services Act:**
  - which obligations apply at our size (notice and action, statement of reasons, trader traceability for marketplaces, micro and small enterprise exemptions);
  - whether a free catalog with no sellers counts as a "marketplace".
- **UK Online Safety Act** relevance (likely low for a CSS catalog with no user-to-user messaging).
- **Content policy:** ban impersonation, deceptive UI, hiding safety or consent notices, hateful imagery in previews, and copyrighted assets without a license.
- **Licensing:** default MIT for templates. Allowed licenses are listed in template-schema §3.2. Contributors certify the right to publish (a DCO-style checkbox).

## 7. Payments and payouts (before M9)

**Verified (business-model §2, §4):**
- Paddle, Polar and Stripe Managed Payments exclude marketplaces. Selling creators' templates would make us responsible for tax and payout compliance.
- Lemon Squeezy has closed sign-ups and shuts down on 2027-03-31.

**Recommendation:**
- Sell only *our own* Pro subscription and supporter payment, through a merchant of record that handles VAT and sales tax.
- No creator payouts until D-009 is revisited.
- Tips go to the creators' own links (Ko-fi, GitHub Sponsors).

## 8. Checklist by phase

**Before the first CWS submission (M6)**
- [ ] §5 checklist complete.
- [ ] The sanitizer catches every attack fixture (T-1.3a).
- [ ] No web-accessible resources; no remote code; dependencies pinned.
- [ ] Privacy policy and terms published.
- [ ] Name clearance (T-6.6).

**Before public publishing opens (M7)**
- [ ] Signing key in a protected CI environment; key rotation documented.
- [ ] Revocation path tested end-to-end.
- [ ] Content policy, takedown page, DMCA agent (if serving the US), repeat-infringer policy.
- [ ] Review checklist (security-model §5) in the PR template.
- [ ] DSA applicability assessed.
- [ ] Contributor terms and license checkbox.

**Before accepting money (M9)**
- [ ] Merchant of record chosen and current status re-verified.
- [ ] Refund policy.
- [ ] Tax registration handled by the merchant of record.
- [ ] Privacy policy updated for accounts.
- [ ] Account deletion and data export.
- [ ] No dark patterns in upgrade flows.
