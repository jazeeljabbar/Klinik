# Klinik Production Release Readiness Report

**Assessment Date**: September 25, 2026  
**Status**: **BLOCKED** (Technical codebase is fully prepared and locally verified; final release is blocked exclusively on 4 external owner decisions and live Cloud deployment authorization).

---

## 1. Executive Status & Gate Summary

| Gate | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Model Integrity & Inference** | **READY** | `backend/acne2812022.h5` verified (SHA-256: `a96fc2464a79...`, 93 MB). Loads via Keras 3 with ResNet50 backbone, dual outputs (`grading_output` 4-class softmax, `count_output` linear regression). Genuine inference verified locally on `acne-01.jpg` and `acne-02.jpg`. |
| **Fail-Closed Availability** | **READY** | In standard/production mode, missing model returns HTTP 503 `{"error": "Prediction unavailable", "error_type": "model_unavailable"}` before any storage or database writes. Mock predictions are completely disabled outside explicit demo mode. |
| **Runtime Storage Security** | **READY** | Cloud storage client initializes with `GOOGLE_CLOUD_PROJECT=klinik-ai-499720` and bucket `klinik-ai-499720-skin-images`. Absence of credentials never defaults to local storage; explicit configuration required. |
| **Runtime Database Security** | **READY** | `backend/models.py` connects to Firestore database `klinikdb` in `klinik-ai-499720`. Fails startup with `RuntimeError` if Cloud Firestore is unreachable (no dummy DB fallback in production). |
| **Deployment Packaging** | **READY** | `backend/Dockerfile` configured with `ENV KERAS_HOME=/tmp/.keras`. `backend/.dockerignore` and `backend/.gcloudignore` created to prevent leaking `venv/`, local uploads, or credentials into the container. `frontend/.env.production` configured with production API URL and Web Client ID. |
| **Frontend Production Build** | **READY** | `npm run build` compiles cleanly in 444ms (0 errors, 2,270 modules transformed). |
| **Automated Test Suite** | **READY** | 74 unit, contract, and race condition tests pass cleanly (`0 failed`, `4 skipped` for non-loopback emulator). |
| **Guarded Cleanup Worker** | **READY** | `backend/scripts/run_cleanup_job.sh` and `cleanup_pending_scans.py` prepared with explicit 24h retention. Preserves promoted user scans and unresolved upload recovery markers. |
| **Owner Decisions & Clinical Sign-off** | **BLOCKED** | 4 unresolved legal, operational, and clinical sign-off decisions required from Kavin. |

---

## 2. Production Release Configuration

### Infrastructure & Hosting Targets
- **Google Cloud Project ID**: `klinik-ai-499720` (Project Number: `495903900543`)
- **Backend Compute Target**: Google Cloud Run service `klinik-api` (Region: `us-central1`)
  - Target URL: `https://klinik-api-495903900543.us-central1.run.app`
- **Frontend Hosting Target**: Firebase Hosting
  - Production Domains: `https://klinik-ai-499720.web.app`, `https://klinik-ai-499720.firebaseapp.com`
- **Database**: Cloud Firestore in Datastore mode / Native mode
  - Database ID: `klinikdb`
  - Collections: `users`, `histories`, `pending_scans`
- **Object Storage Bucket**: Google Cloud Storage
  - Bucket URI: `gs://klinik-ai-499720-skin-images`
  - Lifecycle Rules: Zero generic bucket lifecycle rules (retention managed exclusively via guarded worker)

### Frontend API URL & CORS Configuration
- **API Base URL**: `https://klinik-api-495903900543.us-central1.run.app` configured in `frontend/.env.production`.
- **Allowed Origins (`backend/app.py`)**:
  - `https://klinik-ai-499720.web.app`
  - `https://klinik-ai-499720.firebaseapp.com`
  - Local origins for development preview (`localhost:5173`, `localhost:5174`, `127.0.0.1:5173`)

### Model Packaging & Runtime Filesystem
- **Model File**: `backend/acne2812022.h5`
  - File Size: `96,454,168 bytes` (93 MB)
  - Format: Hierarchical Data Format v5 (HDF5)
  - SHA-256 Checksum: `a96fc2464a79542d4e38b03d30328e67df758665ac1819e567f04f21400b948e`
- **Docker Inclusion**:
  - `backend/Dockerfile` copies the model directly into `/app/acne2812022.h5` via `COPY . .`.
  - `backend/.dockerignore` and `backend/.gcloudignore` exclude developer `.bak` files, virtual environments (`venv/`), local database uploads (`data/`), and credential files, ensuring clean builds.
- **Keras Home & Cache Permissions**:
  - Configured `ENV KERAS_HOME=/tmp/.keras` in `backend/Dockerfile`.
  - Fallback logic in `backend/app.py` automatically routes `KERAS_HOME` to `/tmp/.keras` if the application directory is mounted read-only in production.

---

## 3. Authentication & Google OAuth Verification

### Analysis of the Previous OAuth Cert Fetch Error
During local acceptance testing, attempting Google authentication yielded:
> `Could not fetch certificates at https://www.googleapis.com/oauth2/v1/certs`

**Root Cause**:
1. **Network Isolation in Local Preview**: In the strictly isolated local sandbox and test environment, outbound internet connectivity is disabled to prevent accidental cloud mutations. `google.oauth2.id_token.verify_oauth2_token()` attempts an outbound HTTPS request via `google.auth.transport.requests.Request()` to Google's public key endpoint `https://www.googleapis.com/oauth2/v1/certs`. This triggered a `google.auth.exceptions.TransportError`.
2. **Missing Local CA Bundle on macOS Python 3.13**: Standalone Python 3.13 on macOS does not link to system keychain certificates by default without `certifi` configured.

### Production Verification Status & Safeguards
1. **Status**: **UNVERIFIED IN PRODUCTION**. Live end-to-end Google OAuth verification has not been performed from this environment. While Cloud Run provides outbound network connectivity to Google public endpoints, live authentication requires:
   - Correct Google Cloud Console OAuth 2.0 Client credentials configuration (Authorized JavaScript Origins: `https://klinik-ai-499720.web.app` and `https://klinik-ai-499720.firebaseapp.com`).
   - Active Google OAuth consent screen configuration.
   - Live browser token acquisition and backend JWT cryptographic signature verification.
   *Speculative claims regarding automatic certificate caching have been removed.* Google sign-in must be treated as unverified until verified under the authorized post-deployment smoke test protocol.
2. **Never Bypassed**: Cryptographic token verification in `backend/routes/auth.py` was **never disabled**. TLS certificate verification, Google RSA signature checks, expiry checks, issuer validation (`accounts.google.com` or `https://accounts.google.com`), and audience matching (`google_client_id`) remain strictly active in `id_token.verify_oauth2_token()`.
3. **Environment Fault Isolation**: In `backend/routes/auth.py`, `TransportError` and connection failures are caught and returned as HTTP 503 `error_type: "google_auth_unavailable"` rather than exposing raw stack traces or internal errors.
4. **CA Bundle Setup**: `backend/app.py` configures `SSL_CERT_FILE` and `REQUESTS_CA_BUNDLE` via `certifi` on startup.
5. **Verified Baseline**: Email and password authentication backed by Firestore is fully verified and functional.

---

## 4. Image Verification Evidence & Reconciliation

### File Reconciliation Matrix

| Identifier | Dimensions | File Size | SHA-256 Checksum | Origin / Nature |
| :--- | :---: | :---: | :---: | :--- |
| **Original `acne-01.jpg`** | **612 × 407 px** | 24,073 B | `2010dc666a9ec467ee4612d1a2bbdcf8d7fe27a36cae50c7d7f0accdfb0a805c` | Original supplied test fixture (preserved in upload storage). |
| **Original `acne-02.jpg`** | **612 × 408 px** | 27,821 B | `fdfb3f832c4596fba81fd1353faf4cf2530b7f2c6725bc3ebfff67d8b0f91115` | Original supplied test fixture (preserved in upload storage). |
| **`Test data/acne_01.jpg`** | **490 × 350 px** | 12,354 B | `4c1ca70f474dc2da32274903f29be45aaeec693be1db8e9d2ca17e63bff74ee0` | Distinct cropped sub-image, not the original 612×407. |
| **`Test data/acne_02.jpg`** | **3356 × 4604 px**| 1,123,937 B | `cd89b673f476d767ba2339357da764d3c0e96e97dffc05906ea088532fd55ed8` | High-resolution portrait photograph, completely different from 612×408. |

### Real Model Inference on the Original Supplied Files

Both authentic original files were executed through `backend/acne2812022.h5` without forcing expected severity:

1. **Original `acne-01.jpg` (612 × 407 px)**:
   - **Predicted Class**: **Mild Acne**
   - **Confidence**: `52.77%` (Second class: Moderate Acne at `46.03%`, Margin: `6.74%`)
   - **Lesion Count Estimate**: `9.4`
   - **Out-of-Distribution / Rejection Evaluation**: Because confidence is below the application's 70% threshold and margin is below 15%, live pipeline execution triggers the rejection safeguard:
     > *"The model could not clearly distinguish between acne severity levels (top two predictions are too close: 52.77% vs 46.03%). This image may not be suitable for analysis."*
   - **Quality Flags**: `['low_resolution', 'partial_face']` (below 800px application requirement; chin/forehead touches boundary).
2. **Original `acne-02.jpg` (612 × 408 px)**:
   - **Predicted Class**: **Mild Acne**
   - **Confidence**: `99.93%` (Second class: Moderate Acne at `0.07%`, Margin: `99.85%`)
   - **Lesion Count Estimate**: `6.1`
   - **Out-of-Distribution / Rejection Evaluation**: Pass (Confidence $\ge 70\%$, Margin $\ge 15\%$).
   - **Quality Flags**: `['low_resolution', 'partial_face']`.

*Note: Real model execution provides engineering and statistical verification of the model pipeline; it does not constitute clinical diagnostic validation.*

---

## 5. Unresolved Owner Decisions (Kavin Sign-Off Required)

The following 4 items remain the sole blockers preventing deployment authorization:

1. **Publisher / Operator Identity & Contact**:
   - Provide personal publishing name (e.g., "Kavin [Lastname]") or formal commercial entity.
   - Designate governing jurisdiction for Terms of Service (e.g., California, Delaware, United Kingdom).
   - Provide public customer support and privacy inquiry email (e.g., `support@...` or `kavin@...`).
2. **Guest & Unpromoted Scan Retention Duration**:
   - Approve explicit retention period for unpromoted scans (recommended: **24 hours** via `--retention-hours 24`; options: 12h, 24h, 48h, 7d).
   - Saved `Skin Journey` history remains retained until user deletion.
3. **Guarded Cleanup Worker Architecture & Scheduling Authorization**:
   - Authorize enabling `cloudscheduler.googleapis.com` in project `klinik-ai-499720`.
   - Authorize creating service account `klinik-cleanup-scheduler@klinik-ai-499720.iam.gserviceaccount.com` with `roles/run.invoker`.
   - Authorize deploying Cloud Run Job `klinik-cleanup-job` and Cloud Scheduler trigger `klinik-cleanup-trigger` on schedule `0 3 * * *` (UTC).
4. **Clinical Guidance & Urgency Statements Review**:
   - Review and sign off on active ingredient mentions and severity triage wording cataloged in `reports/clinical_guidance_inventory.md`.

---

## 6. Release, Rollback & Cleanup Deployment Procedures

### Step 1: Pre-Deployment Build & Verification
```bash
# 1. Verify backend unit & integration test suite (74 tests)
cd /Users/jazeelabduljabbar/Developer/AcneDetection-main
backend/venv/bin/python -m pytest backend/tests/ -v

# 2. Build production frontend assets (verified predeploy hook also configured in frontend/firebase.json)
cd /Users/jazeelabduljabbar/Developer/AcneDetection-main/frontend
npm run build
```

### Step 2: Backend Cloud Run Deployment (Configuration-Preserving)
Inspected existing service configuration on `klinik-api`:
- **Current Active Revision**: `klinik-api-00006-kwk`
- **Service Identity**: `klinik-backend-runner@klinik-ai-499720.iam.gserviceaccount.com`
- **Existing Required Variables**: `GOOGLE_CLOUD_PROJECT`, `FIRESTORE_DATABASE_ID`, `GCS_BUCKET_NAME`, `FLASK_ENV=production`, `GOOGLE_CLIENT_ID`, `TF_ENABLE_ONEDNN_OPTS=0`
- **Existing Secret Reference**: `SECRET_KEY` mapped from Secret Manager secret `klinik_secret_key:latest`
- **Flags to Explicitly Purge**: `DEMO_MODE`, `SIMULATED_PREDICTIONS`, `FIRESTORE_EMULATOR_HOST`, `STORAGE_EMULATOR_HOST`, `LOCAL_STORAGE_PATH`, `OFFLINE_MODE`

Deploy using `--update-env-vars` and `--update-secrets` to strictly preserve existing production settings and Secret Manager bindings without exposing raw values:
```bash
cd /Users/jazeelabduljabbar/Developer/AcneDetection-main
gcloud run deploy klinik-api \
  --source backend \
  --region us-central1 \
  --project klinik-ai-499720 \
  --service-account klinik-backend-runner@klinik-ai-499720.iam.gserviceaccount.com \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --timeout 300 \
  --update-env-vars "GOOGLE_CLOUD_PROJECT=klinik-ai-499720,FIRESTORE_DATABASE_ID=klinikdb,GCS_BUCKET_NAME=klinik-ai-499720-skin-images,FLASK_ENV=production,GOOGLE_CLIENT_ID=495903900543-ovdtn6kcajv1jbpdajdapukr2jv5ig5u.apps.googleusercontent.com,TF_ENABLE_ONEDNN_OPTS=0,KERAS_HOME=/tmp/.keras" \
  --update-secrets "SECRET_KEY=klinik_secret_key:latest" \
  --remove-env-vars "DEMO_MODE,SIMULATED_PREDICTIONS,FIRESTORE_EMULATOR_HOST,STORAGE_EMULATOR_HOST,LOCAL_STORAGE_PATH,OFFLINE_MODE"
```

### Step 3: Frontend Firebase Hosting Deployment
`frontend/firebase.json` is configured with `"predeploy": ["npm run build"]`, guaranteeing fresh asset compilation.
```bash
cd /Users/jazeelabduljabbar/Developer/AcneDetection-main/frontend
firebase deploy --only hosting --project klinik-ai-499720
```

### Step 4: Guarded Cleanup Worker Deployment Plan
- **Execution Target**: Cloud Run Job `klinik-cleanup-job` in `us-central1`.
- **Worker Identity**: `klinik-backend-runner@klinik-ai-499720.iam.gserviceaccount.com` (verified roles: `roles/datastore.user`, `roles/storage.objectAdmin`, `roles/iam.serviceAccountTokenCreator`).
- **Trigger**: Cloud Scheduler job `klinik-cleanup-trigger` in `us-central1`.
- **Scheduler Identity**: `klinik-cleanup-scheduler@klinik-ai-499720.iam.gserviceaccount.com` with `roles/run.invoker` on `klinik-cleanup-job`.
- **Cadence / Schedule**: Daily at 03:00 UTC (`0 3 * * *`).
- **Retention Setting**: Explicit `--retention-hours 24`.
- **Invariants**: Preserves promoted user check-ins (`user_id is not null`), preserves active/ambiguous recovery markers (`pending_manual_review`), and uses transactional Firestore claim leases.

Deployment commands:
```bash
# 1. Enable Cloud Scheduler API (upon authorization)
gcloud services enable cloudscheduler.googleapis.com --project klinik-ai-499720

# 2. Deploy Cloud Run Job
gcloud run jobs deploy klinik-cleanup-job \
  --source backend \
  --command "python" \
  --args "scripts/cleanup_pending_scans.py,--retention-hours,24,--execute,--confirm-project,klinik-ai-499720" \
  --region us-central1 \
  --project klinik-ai-499720 \
  --service-account klinik-backend-runner@klinik-ai-499720.iam.gserviceaccount.com \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=klinik-ai-499720,FIRESTORE_DATABASE_ID=klinikdb,GCS_BUCKET_NAME=klinik-ai-499720-skin-images"

# 3. Create Cloud Scheduler Trigger Service Account & Grant Invoker Role
gcloud iam service-accounts create klinik-cleanup-scheduler \
  --display-name "Klinik Cleanup Scheduler Invoker" \
  --project klinik-ai-499720 || true

gcloud run jobs add-iam-policy-binding klinik-cleanup-job \
  --region us-central1 \
  --project klinik-ai-499720 \
  --member "serviceAccount:klinik-cleanup-scheduler@klinik-ai-499720.iam.gserviceaccount.com" \
  --role "roles/run.invoker"

# 4. Schedule Job Execution Daily at 03:00 UTC
gcloud scheduler jobs create http klinik-cleanup-trigger \
  --location us-central1 \
  --project klinik-ai-499720 \
  --schedule "0 3 * * *" \
  --time-zone "UTC" \
  --uri "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/klinik-ai-499720/jobs/klinik-cleanup-job:run" \
  --http-method POST \
  --oauth-service-account-email "klinik-cleanup-scheduler@klinik-ai-499720.iam.gserviceaccount.com"
```

### Step 5: Rollback Procedures

#### A. Backend Service Rollback
- **Target Recoverable Revision**: `klinik-api-00006-kwk` (deployed 2026-06-18 11:35:25 UTC).
- **Execution**: Instantly route 100% of live traffic back to `klinik-api-00006-kwk`:
```bash
gcloud run services update-traffic klinik-api \
  --to-revisions klinik-api-00006-kwk=100 \
  --region us-central1 \
  --project klinik-ai-499720
```

#### B. Frontend Hosting Rollback
*Note on Firebase CLI*: `firebase hosting:clone` expects `<siteId>:<channelId>` and cannot be used with release IDs. The verified rollback methods are:
- **Target Recoverable Release**: Release `sites/klinik-ai-499720/releases/1781781269218000` (Version: `sites/klinik-ai-499720/versions/3b2a89c0a05c416a`, deployed 2026-06-18 11:14:29 UTC).
- **Primary Method (Firebase Console - Zero CLI Ambiguity)**:
  1. Open [Firebase Console > Hosting > Release history](https://console.firebase.google.com/project/klinik-ai-499720/hosting/sites/klinik-ai-499720).
  2. Locate the row for Release `1781781269218000` (Version `3b2a89c0a05c416a`).
  3. Click the overflow menu (`⋮`) and select **Roll back**.
- **Scriptable Method (Firebase Hosting REST API)**:
```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "x-goog-user-project: klinik-ai-499720" \
  -H "Content-Type: application/json" \
  "https://firebasehosting.googleapis.com/v1beta1/sites/klinik-ai-499720/channels/live/releases?versionName=sites/klinik-ai-499720/versions/3b2a89c0a05c416a"
```

#### C. Critical State & Database Invariant
> [!CAUTION]
> **Code Rollback Does Not Undo Database Writes**:
> Rolling back Cloud Run service revisions or Firebase Hosting releases replaces only stateless execution code and client assets. It **does NOT** rollback, modify, or delete records written to Cloud Firestore (`klinikdb` collections: `users`, `histories`, `pending_scans`) or files uploaded to Cloud Storage (`gs://klinik-ai-499720-skin-images`). Any user accounts created, scans recorded, or images uploaded during a faulty release persist and must be addressed via database maintenance scripts, not application rollback.

### Step 6: Post-Deployment Smoke Test Protocol
*(To be executed only after deployment authorization using designated test accounts)*
1. **Isolated Email/Password Test Account**: Register with `test-smoke-<timestamp>@klinik-verification.internal`. Assert account creation succeeds and session token is issued.
2. **Consent Gate**: Confirm Terms, Disclaimer, and Image Processing consent modal displays and records consent timestamp.
3. **Live Model Inference**: Upload test photo; assert HTTP 200 with `simulated_analysis: false`, `model_mode: "real_model"`, and non-empty severity prediction.
4. **Photo Persistence**: Confirm scan appears in `Skin Check-ins` with authentic image proxy and dimensions.
5. **Skin Journey**: Confirm side-by-side comparison displays photos with dates and non-blocking quality notes.
6. **Mobile Layout**: Confirm responsive viewport navigation on iOS/Android viewports.
7. **Controlled Google Sign-In Test**:
   - Using a pre-authorized test Google account, click "Sign in with Google".
   - Confirm Google OAuth popup completes successfully.
   - Assert backend returns HTTP 200 with valid JWT session.
   - If Google OAuth returns HTTP 503 (`google_auth_unavailable`) or configuration error, verify Google Cloud Console OAuth 2.0 Client "Authorized JavaScript Origins" (`https://klinik-ai-499720.web.app`) without impacting the email/password auth baseline.
8. **Test Data Cleanup**: Delete the test check-in via UI `Delete Scan` and verify complete removal.
