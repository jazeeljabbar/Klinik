#!/usr/bin/env python3
"""
cleanup_pending_scans.py - Hardened, bounded cleanup for abandoned pending scans in Klinik.

Invariants:
1. Deletion state is irreversible for promotion: once status='deleting', promotion unconditionally
   rejects it regardless of claim age.
2. A Firestore transaction does not make GCS deletion atomic. Distributed atomicity is enforced
   via two-phase coordination: claim in Firestore -> idempotent GCS delete -> finalize in Firestore.
3. Every cleanup path (with or without image_path) requires a transactional eligibility check and claim.
4. Worker leases use unique claim_ids to prevent stale workers from overwriting active state or
   finalizing lost claims.
5. Failed or interrupted deletions remain durably recorded with status='deleting' for retry; they
   are NEVER reverted to 'pending'.
"""

import os
import sys
import argparse
import logging
import uuid
from datetime import datetime, timezone, timedelta

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("cleanup_pending_scans")

AMBIGUOUS_UPLOAD_GRACE_PERIOD_SECONDS = int(os.environ.get("AMBIGUOUS_UPLOAD_GRACE_PERIOD_SECONDS", 7200)) # 2 hours

SAFE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

def is_safe_scan_path(blob_path, expected_scan_id=None):
    if not blob_path or not isinstance(blob_path, str):
        return False
    
    if ".." in blob_path or "\\" in blob_path or "//" in blob_path:
        return False
        
    parts = blob_path.split("/")
    if parts[0] == "anonymous":
        if len(parts) != 3:
            return False
        scan_id_part, filename = parts[1], parts[2]
    elif parts[0] == "users":
        if len(parts) != 5:
            return False
        if parts[2] != "scans":
            return False
        user_id_part, scan_id_part, filename = parts[1], parts[3], parts[4]
        if not user_id_part:
            return False
    else:
        return False

    if not scan_id_part:
        return False
    if expected_scan_id and scan_id_part != expected_scan_id:
        return False

    file_parts = filename.rsplit(".", 1)
    if len(file_parts) != 2:
        return False
    base, ext = file_parts[0], file_parts[1].lower()
    if base != "original":
        return False
    if ext not in SAFE_EXTENSIONS:
        return False

    return True

def parse_iso_datetime(dt_str):
    if not dt_str or not isinstance(dt_str, str):
        return None
    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None

def is_scan_referenced_in_histories(histories_col, scan_id, image_path):
    if not histories_col:
        return False
    try:
        if scan_id:
            docs = histories_col.where("scan_id", "==", scan_id).limit(1).get()
            for _ in docs:
                return True
        if image_path:
            docs = histories_col.where("image_path", "==", image_path).limit(1).get()
            for _ in docs:
                return True
    except Exception as e:
        logger.error(f"Error querying histories for scan {scan_id} / {image_path}: {e}")
        return True
    return False

def claim_pending_scan_tx(tx, pending_ref, claim_id, cutoff_time, histories_col):
    if not claim_id:
        return False, "invalid_claim_id", None

    # Use supported single-document transactional read: document_reference.get(transaction=tx)
    # The Firestore Python SDK Transaction.get(ref) returns a generator, not DocumentSnapshot.
    snap = pending_ref.get(transaction=tx)
    if not snap.exists:
        return False, "not_found", None
    
    data = snap.to_dict() or {}
    scan_id = data.get("scan_id")
    ref_id = getattr(pending_ref, "id", None)
    if not scan_id:
        return False, "mismatched_id", None
    if ref_id and scan_id != ref_id:
        return False, "mismatched_id", None
    
    image_path = data.get("image_path")
    if image_path:
        if not is_safe_scan_path(image_path, expected_scan_id=scan_id):
            return False, "unsafe_path", None

    curr_status = data.get("status", "pending")
    if curr_status == "promoted":
        return False, "promoted", None
    
    if curr_status == "deleting":
        claimed_ts = parse_iso_datetime(data.get("claimed_at"))
        now = datetime.now(timezone.utc)
        if claimed_ts and (now - claimed_ts).total_seconds() < 300:
            return False, "already_claimed", None
    else:
        if not data.get("needs_cleanup", False):
            created_at_str = data.get("created_at")
            if not created_at_str:
                return False, "invalid_created_at", None
            created_dt = parse_iso_datetime(created_at_str)
            if not created_dt:
                return False, "invalid_created_at", None
            now_utc = datetime.now(timezone.utc)
            if created_dt > now_utc:
                return False, "invalid_created_at", None
            if created_dt > cutoff_time:
                return False, "within_retention", None
    
    if is_scan_referenced_in_histories(histories_col, scan_id, image_path):
        return False, "in_history", None

    is_unresolved = bool(
        data.get("unresolved_upload") or
        data.get("upload_failed") or
        curr_status == "uploading"
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    update_fields = {
        "status": "deleting",
        "claimed_at": now_iso,
        "claim_id": claim_id
    }
    if is_unresolved:
        update_fields["unresolved_upload"] = True
        update_fields["needs_cleanup"] = True

    tx.update(pending_ref, update_fields)
    claimed_data = dict(data)
    if is_unresolved:
        claimed_data["unresolved_upload"] = True
        claimed_data["needs_cleanup"] = True
    return True, "claimed", claimed_data

def record_deletion_failure_tx(tx, pending_ref, claim_id, error_message):
    if not claim_id:
        return False, "invalid_claim_id"

    snap = pending_ref.get(transaction=tx)
    if not snap.exists:
        return False, "not_found"

    data = snap.to_dict() or {}
    if data.get("status") != "deleting":
        return False, "invalid_status"

    curr_claim = data.get("claim_id")
    if not curr_claim or curr_claim != claim_id:
        return False, "claim_lost"
    
    update_data = {
        "status": "deleting",
        "last_deletion_error": error_message,
        "deletion_attempts": (data.get("deletion_attempts") or 0) + 1,
    }
    if data.get("unresolved_upload"):
        update_data["unresolved_upload"] = True
        update_data["needs_cleanup"] = True
    tx.update(pending_ref, update_data)
    return True, "updated"

def finalize_deletion_tx(tx, pending_ref, claim_id):
    if not claim_id:
        return False, "invalid_claim_id"

    snap = pending_ref.get(transaction=tx)
    if not snap.exists:
        return True, "already_deleted"

    data = snap.to_dict() or {}
    if data.get("status") != "deleting":
        return False, "invalid_status"

    curr_claim = data.get("claim_id")
    if not curr_claim or curr_claim != claim_id:
        return False, "claim_lost"

    tx.delete(pending_ref)
    return True, "deleted"

def run_cleanup(db, storage_client, bucket_name, retention_hours=24, dry_run=True, max_scans=1000):
    if not isinstance(retention_hours, (int, float)) or retention_hours <= 0:
        raise ValueError("Retention hours must be a positive number.")
    if not isinstance(max_scans, int) or max_scans <= 0:
        raise ValueError("max_scans must be a positive integer.")

    stats = {
        "evaluated": 0,
        "skipped_within_retention": 0,
        "skipped_invalid_created_at": 0,
        "skipped_mismatched_id": 0,
        "skipped_mismatched_path": 0,
        "skipped_promoted": 0,
        "skipped_already_claimed": 0,
        "skipped_in_history": 0,
        "skipped_unsafe_path": 0,
        "gcs_deleted": 0,
        "gcs_already_missing": 0,
        "gcs_failed": 0,
        "firestore_deleted": 0,
        "firestore_failed": 0,
        "dry_run": dry_run,
        "retention_hours": retention_hours
    }

    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=retention_hours)
    logger.info(f"Starting pending scan cleanup (dry_run={dry_run}, retention={retention_hours}h, cutoff={cutoff_time.isoformat()})")

    pending_col = db.collection('pending_scans')
    histories_col = db.collection('histories')
    bucket = storage_client.bucket(bucket_name) if storage_client and bucket_name else None

    try:
        docs = pending_col.limit(max_scans).get()
    except Exception as e:
        logger.error(f"Failed to fetch pending_scans collection: {e}")
        return stats

    from google.cloud import firestore

    for doc in docs:
        stats["evaluated"] += 1
        data = doc.to_dict() or {}
        doc_id = doc.id
        scan_id = data.get("scan_id")
        image_path = data.get("image_path")
        status = data.get("status", "pending")
        created_at_str = data.get("created_at")

        if not scan_id or scan_id != doc_id:
            logger.warning(f"Document ID '{doc_id}' does not match scan_id '{scan_id}'. Skipping.")
            stats["skipped_mismatched_id"] += 1
            continue

        if not created_at_str:
            logger.warning(f"Scan {scan_id} missing created_at timestamp. Skipping.")
            stats["skipped_invalid_created_at"] += 1
            continue

        created_dt = parse_iso_datetime(created_at_str)
        if not created_dt:
            logger.warning(f"Scan {scan_id} has invalid created_at timestamp: '{created_at_str}'. Skipping.")
            stats["skipped_invalid_created_at"] += 1
            continue

        now_utc = datetime.now(timezone.utc)
        if created_dt > now_utc:
            logger.warning(f"Scan {scan_id} has future created_at timestamp: '{created_at_str}'. Skipping.")
            stats["skipped_invalid_created_at"] += 1
            continue

        if status == "promoted":
            stats["skipped_promoted"] += 1
            continue

        if not data.get("needs_cleanup", False) and created_dt > cutoff_time:
            stats["skipped_within_retention"] += 1
            continue

        if image_path and not is_safe_scan_path(image_path):
            stats["skipped_unsafe_path"] += 1
            continue

        if image_path:
            parts = image_path.split("/")
            path_agrees = False
            if len(parts) >= 3 and parts[0] == "anonymous" and parts[1] == scan_id:
                path_agrees = True
            elif len(parts) >= 5 and parts[0] == "users" and parts[2] == "scans" and parts[3] == scan_id:
                path_agrees = True
            if not path_agrees:
                stats["skipped_mismatched_path"] += 1
                continue

        if is_scan_referenced_in_histories(histories_col, scan_id, image_path):
            stats["skipped_in_history"] += 1
            continue

        if dry_run:
            if image_path:
                logger.info(f"[DRY-RUN] Would delete GCS blob: {image_path}")
                stats["gcs_deleted"] += 1
            logger.info(f"[DRY-RUN] Would delete Firestore pending_scan doc: {doc_id}")
            stats["firestore_deleted"] += 1
            continue

        pending_ref = pending_col.document(scan_id)
        claim_id = str(uuid.uuid4())
        claimed = False
        claimed_data = None

        try:
            tx = db.transaction()
            if hasattr(firestore, 'transactional'):
                claim_fn = firestore.transactional(claim_pending_scan_tx)
                success, reason, claimed_data = claim_fn(tx, pending_ref, claim_id, cutoff_time, histories_col)
            else:
                success, reason, claimed_data = claim_pending_scan_tx(tx, pending_ref, claim_id, cutoff_time, histories_col)

            if not success:
                if reason == "promoted":
                    logger.info(f"Scan {scan_id} was promoted during cleanup run. Skipping.")
                    stats["skipped_promoted"] += 1
                elif reason == "already_claimed":
                    logger.info(f"Scan {scan_id} is already claimed for deletion. Skipping.")
                    stats["skipped_already_claimed"] += 1
                elif reason == "within_retention":
                    stats["skipped_within_retention"] += 1
                elif reason == "in_history":
                    stats["skipped_in_history"] += 1
                elif reason == "unsafe_path":
                    stats["skipped_unsafe_path"] += 1
                elif reason == "mismatched_id":
                    stats["skipped_mismatched_id"] += 1
                elif reason == "mismatched_path":
                    stats["skipped_mismatched_path"] += 1
                elif reason == "invalid_created_at":
                    stats["skipped_invalid_created_at"] += 1
                continue
            claimed = True
        except Exception as e:
            logger.error(f"Failed to claim scan {scan_id} for deletion: {e}")
            stats["firestore_failed"] += 1
            continue

        claimed_image_path = claimed_data.get("image_path") if claimed_data else None
        logger.info(f"Targeting claimed scan {scan_id} (claim_id: {claim_id}, image: {claimed_image_path})")

        gcs_success = False
        if not claimed_image_path:
            gcs_success = True
        else:
            try:
                from google.cloud.exceptions import NotFound
                blob = bucket.blob(claimed_image_path)
                blob.delete()
                stats["gcs_deleted"] += 1
                gcs_success = True
                logger.info(f"Deleted GCS blob: {claimed_image_path}")
            except NotFound:
                logger.info(f"GCS blob not found (404): {claimed_image_path}")
                stats["gcs_already_missing"] += 1

                # Check whether this scan represents an unresolved / ambiguous upload:
                # 1. unresolved_upload marker is True (durably persisted)
                # 2. upload_failed is True (client/network timeout)
                # 3. prior status was 'uploading' (process crashed before upload_failed was set)
                prior_status = claimed_data.get("status") if claimed_data else None
                is_unresolved = bool(
                    claimed_data and (
                        claimed_data.get("unresolved_upload") or
                        claimed_data.get("upload_failed") or
                        prior_status == "uploading"
                    )
                )

                if is_unresolved:
                    logger.warning(
                        f"Scan {scan_id} represents an unresolved upload (prior_status={prior_status}, "
                        f"unresolved_upload={claimed_data.get('unresolved_upload')}, "
                        f"upload_failed={claimed_data.get('upload_failed')}). GCS returned 404, but late upload "
                        f"may still arrive. Preserving durable recovery record with status='deleting'."
                    )
                    gcs_success = False
                    try:
                        tx = db.transaction()
                        err_msg = "Ambiguous upload: 404 in GCS; retaining durable recovery record for late-arriving image."
                        if hasattr(firestore, 'transactional'):
                            fail_fn = firestore.transactional(record_deletion_failure_tx)
                            fail_fn(tx, pending_ref, claim_id, err_msg)
                        else:
                            record_deletion_failure_tx(tx, pending_ref, claim_id, err_msg)
                    except Exception as rec_e:
                        logger.error(f"Failed to record ambiguous upload recovery state for {scan_id}: {rec_e}")
                    continue
                else:
                    gcs_success = True
            except Exception as e:
                logger.error(f"Failed to delete GCS blob {claimed_image_path}: {e}")
                stats["gcs_failed"] += 1
                gcs_success = False
                try:
                    tx = db.transaction()
                    if hasattr(firestore, 'transactional'):
                        fail_fn = firestore.transactional(record_deletion_failure_tx)
                        fail_fn(tx, pending_ref, claim_id, str(e))
                    else:
                        record_deletion_failure_tx(tx, pending_ref, claim_id, str(e))
                    logger.info(f"Durably recorded deletion failure for scan {scan_id}.")
                except Exception as rec_e:
                    logger.error(f"Failed to record failure metadata for {scan_id}: {rec_e}")
                continue

        if gcs_success:
            try:
                tx = db.transaction()
                if hasattr(firestore, 'transactional'):
                    final_fn = firestore.transactional(finalize_deletion_tx)
                    fin_ok, fin_reason = final_fn(tx, pending_ref, claim_id)
                else:
                    fin_ok, fin_reason = finalize_deletion_tx(tx, pending_ref, claim_id)

                if fin_ok:
                    stats["firestore_deleted"] += 1
                    logger.info(f"Finalized Firestore pending_scan doc deletion: {scan_id}")
                else:
                    logger.warning(f"Could not finalize deletion for {scan_id}: {fin_reason}")
                    stats["firestore_failed"] += 1
            except Exception as e:
                logger.error(f"Failed to finalize Firestore pending_scan doc {scan_id}: {e}")
                stats["firestore_failed"] += 1

    logger.info("Cleanup completed. Summary:")
    for k, v in stats.items():
        logger.info(f"  {k}: {v}")
    return stats

def main():
    parser = argparse.ArgumentParser(description="Bounded cleanup of pending and abandoned skin scans.")
    parser.add_argument("--retention-hours", type=int, default=24, help="Retention period in hours (default: 24)")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Simulate cleanup without deleting (default)")
    parser.add_argument("--execute", action="store_true", help="Perform actual deletions")
    parser.add_argument("--confirm-project", type=str, help="Safety confirmation with GCP project ID to execute")
    parser.add_argument("--project-id", type=str, default=os.environ.get("GOOGLE_CLOUD_PROJECT", "klinik-ai-499720"))
    parser.add_argument("--database-id", type=str, default=os.environ.get("FIRESTORE_DATABASE_ID", "klinikdb"))
    parser.add_argument("--bucket-name", type=str, default=os.environ.get("GCS_BUCKET_NAME", "klinik-ai-499720-skin-images"))

    args = parser.parse_args()

    is_dry_run = True
    if args.execute:
        if args.confirm_project != args.project_id:
            logger.error(f"Execution rejected: --confirm-project must match '{args.project_id}'.")
            sys.exit(1)
        is_dry_run = False

    from google.cloud import firestore, storage
    db = firestore.Client(project=args.project_id, database=args.database_id)
    storage_client = storage.Client(project=args.project_id)

    run_cleanup(
        db=db,
        storage_client=storage_client,
        bucket_name=args.bucket_name,
        retention_hours=args.retention_hours,
        dry_run=is_dry_run
    )

if __name__ == "__main__":
    main()
