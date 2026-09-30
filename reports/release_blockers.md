# Klinik Production Release Blockers

This report identifies all unresolved legal, operator, contact, cloud configuration, and clinical sign-off items that must be resolved and approved by Kavin prior to deploying Klinik to production.

---

## 1. Operator Identity & Legal Jurisdiction

| Item | Current Status | Release Blocker Rationale | Action Required from Kavin |
| :--- | :--- | :--- | :--- |
| **Legal Entity Name** | Unspecified | Terms & Privacy state Klinik is operated by Kavin. A formal commercial entity or registered trade name has not been provided. | Supply formal legal entity or confirmed personal publishing name for legal disclosures. |
| **Governing Law & Jurisdiction** | Unspecified | Terms of Service section for dispute resolution and governing jurisdiction is omitted to avoid inventing jurisdiction. | Designate governing state/country jurisdiction (e.g., California, Delaware, United Kingdom, etc.). |
| **Physical / Registered Address** | Omitted | No physical or registered business address is currently published on the site. | Provide official business contact address if required under applicable consumer protection laws. |

---

## 2. Customer Support & Contact Channels

| Item | Current Status | Release Blocker Rationale | Action Required from Kavin |
| :--- | :--- | :--- | :--- |
| **Support Email Address** | Unresolved | Placeholder addresses (e.g. `support@klinik.app`) were rejected and never shipped in deployable code. `Contact.jsx` displays a truthful notice that official channels are pending commercial release. | Provide live, monitored email address (e.g., `support@...` or `hello@...`) or verified ticketing URL. |
| **Account Deletion / Privacy Inquiries** | Operator Routing | Privacy Policy directs deletion requests to operator contact channels upon establishment. | Designate an intake email or automated account deletion workflow. |

---

## 3. Cloud Retention Policy & Automated Cleanup Architecture

> [!IMPORTANT]
> **Generic GCS Bucket Lifecycle Rules and Generic Firestore TTL Are NOT Interchangeable Substitutes for the Guarded Cleanup Worker.**
>
> 1. **Why Generic GCS Lifecycle Rules Cannot Be Used for Scans**:
>    - GCS bucket lifecycle rules delete storage blobs purely by object age and path prefix, with zero awareness of Firestore application state.
>    - When an authenticated user promotes a scan to their personal `Skin Journey` history, the image in Cloud Storage becomes a permanent part of the user's clinical progression record.
>    - A generic GCS age-based rule (e.g., "delete objects older than 24 hours") would blind-delete promoted user images, resulting in permanent data destruction and broken image links in user profiles.
> 2. **Why Generic Firestore TTL Policies Cannot Be Used on `pending_scans`**:
>    - Native Firestore TTL deletes documents whose expiration timestamp has passed, but has zero awareness of Cloud Storage and cannot execute storage API calls. It would delete tracking documents while leaving the actual image blobs orphaned in GCS.
>    - Furthermore, native Firestore TTL cannot evaluate whether an upload failed or was delayed. Deleting an `unresolved_upload: True` tracking record on an arbitrary TTL timer would permanently destroy the recovery metadata before a delayed upload lands, resulting in untracked orphan images in GCS that can never be discovered or cleaned.
> 3. **How Guarded Retention Automation Preserves Promoted Scans and Unresolved Uploads**:
>    - Retention automation **must** execute the application's guarded cleanup worker (`backend/scripts/cleanup_pending_scans.py`) rather than generic storage or database rules.
>    - **Promoted Scan Protection**: Before initiating deletion, the worker checks `status == "promoted"` and performs a transactional query against the `histories` collection. If the image is referenced in history, deletion is immediately aborted and the scan is skipped (`skipped_promoted: 1` or `skipped_in_history: 1`). Promoted images are never touched.
>    - **Unresolved Upload Protection**: For crashed or interrupted uploads (`unresolved_upload: True`, `upload_failed: True`, or initial `uploading` status), a GCS 404 does not authorize document deletion. The record is permanently retained in Firestore with `status: "deleting"`, `needs_cleanup: True`, and `unresolved_upload: True`, blocking user promotion and keeping the tracking doc active until the delayed blob lands and is cleaned in a subsequent sweep.

| Item | Current Infrastructure Status | Release Blocker Rationale | Action Required from Kavin |
| :--- | :--- | :--- | :--- |
| **GCS Bucket State** | `lifecycle_config: null` (Verified) | Read-only inspection of `gs://klinik-ai-499720-skin-images` confirmed zero bucket lifecycle rules are enabled in GCP. Guest and unpromoted images currently remain indefinitely unless cleaned by the worker. | Approve retention policy duration (e.g., 24h, 48h, or 7d) for unpromoted scans and authorize guarded worker deployment. |
| **Firestore TTL State** | `0 items` (Verified) | Read-only inspection confirmed no native TTL policies are active on `pending_scans`. | Acknowledge that generic TTL is not suitable; retention must be handled exclusively by the guarded cleanup worker. |
| **Cloud Scheduler API** | `SERVICE_DISABLED` (Verified) | Project `klinik-ai-499720` has Cloud Scheduler and Cloud Functions APIs disabled. Automated cloud crons cannot run without enabling the service. | Authorize enabling `cloudscheduler.googleapis.com` or deploying an external scheduled runner for `cleanup_pending_scans.py`. |
| **Guarded Cleanup Worker Logic** | **Verified Locally in Python Suite (60 Passing Tests)** | Unit tests, SDK contract tests, fail-closed handling, transaction purity, and multi-run durable markers are verified in Python. **However**, live Cloud deployment, production scheduling, and live emulator integration remain **unverified and pending**. | Decide retention window duration and authorize scheduling configuration. |
| **Mobile Responsiveness & Layout** | **Verified Locally Across 5 Viewports (60/60 Overflow, 23/23 Interactive)** | Mobile regression resolved: decorative orb overflow eliminated, invalid React inline media queries replaced with CSS utility classes, `.desktop-only-inline` defined, modals constrained to viewport with internal scrolling, safe-area padding applied to `AuthLayout`, and grid minimums reduced to 280px. All checks pass locally. | None; responsive layout verified. |

---

## 4. Clinical Guidance & Medical Claims Sign-Off

| Item | Current Status | Release Blocker Rationale | Action Required from Kavin |
| :--- | :--- | :--- | :--- |
| **Active Ingredient Recommendations** | Cataloged in Inventory | The app mentions specific over-the-counter ingredients (salicylic acid 2%, benzoyl peroxide 2.5%, adapalene 0.1%, niacinamide) and systemic treatments (isotretinoin / Accutane). | Dermatologist review and written approval of all clinical guidance in `reports/clinical_guidance_inventory.md`. |
| **Urgency Statements & Triage** | Tiered (low to critical) | High and critical acne tiers advise immediate medical consultation and psychological support. | Confirm severity triage thresholds and emergency wording. |

---

## Summary Checklist for Deployment

- [ ] Kavin provides official business entity and governing jurisdiction.
- [ ] Kavin provides live customer support email address or contact ticketing URL.
- [ ] Kavin decides on unpromoted scan retention duration (recommendation: 24 hours).
- [ ] Kavin authorizes deployment of a scheduled runner (Cloud Scheduler / Cloud Run) to execute `cleanup_pending_scans.py`.
- [ ] Qualified medical practitioner reviews and signs off on the Clinical Guidance Inventory (`reports/clinical_guidance_inventory.md`).
