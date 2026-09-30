#!/usr/bin/env bash
# run_cleanup_job.sh — Production-ready wrapper for the guarded scan cleanup worker.
# Invariants:
# 1. Preserves promoted user scans and records with active history references.
# 2. Preserves unresolved-upload markers (unresolved_upload: True) across sweeps.
# 3. Explicit retention parameter (default 24h).
# 4. Requires explicit --execute flag and project confirmation.

set -euo pipefail

RETENTION_HOURS="${CLEANUP_RETENTION_HOURS:-24}"
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-klinik-ai-499720}"
DATABASE_ID="${FIRESTORE_DATABASE_ID:-klinikdb}"
BUCKET_NAME="${GCS_BUCKET_NAME:-klinik-ai-499720-skin-images}"
DRY_RUN="${CLEANUP_DRY_RUN:-false}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "[CLEANUP] Starting guarded cleanup worker..."
echo "[CLEANUP] Project: ${PROJECT_ID}, Database: ${DATABASE_ID}, Bucket: ${BUCKET_NAME}"
echo "[CLEANUP] Retention: ${RETENTION_HOURS} hours, Dry Run: ${DRY_RUN}"

EXTRA_ARGS=()
if [ "${DRY_RUN}" = "false" ]; then
    EXTRA_ARGS+=(--execute --confirm-project "${PROJECT_ID}")
else
    EXTRA_ARGS+=(--dry-run)
fi

python3 "${SCRIPT_DIR}/cleanup_pending_scans.py" \
    --retention-hours "${RETENTION_HOURS}" \
    --project-id "${PROJECT_ID}" \
    --database-id "${DATABASE_ID}" \
    --bucket-name "${BUCKET_NAME}" \
    "${EXTRA_ARGS[@]}"

echo "[CLEANUP] Cleanup worker finished successfully."
