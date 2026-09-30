from flask import Blueprint, request, jsonify
import json
import datetime
import time
from flask import g
from models import histories_collection, serialize_doc
from utils.auth_middleware import token_required

history_bp = Blueprint('history', __name__, url_prefix='/api/history')

@history_bp.route('/', methods=['GET'])
@token_required
def get_history(current_user):
    try:
        from google.cloud import firestore
        try:
            t0 = time.perf_counter()
            docs = histories_collection.where('user_id', '==', current_user['id']).order_by('timestamp', direction=firestore.Query.DESCENDING).get()
            duration_fs = (time.perf_counter() - t0) * 1000
            if hasattr(g, 'timing_metrics'):
                g.timing_metrics['firestore_duration_ms'] = g.timing_metrics.get('firestore_duration_ms', 0) + duration_fs
        except Exception as query_err:
            if "The query requires an index" in str(query_err):
                print(f"[!] FIRESTORE INDEX REQUIRED: {query_err}", flush=True)
                return jsonify({'error': 'Database index required', 'message': 'The database needs an index to run this query. Check server logs.'}), 500
            raise query_err
            
        histories = []
        for doc in docs:
            h = serialize_doc(doc)
            if h and isinstance(h.get('recommendation_json'), str):
                try:
                    h['recommendation'] = json.loads(h['recommendation_json'])
                except:
                    h['recommendation'] = {}
                del h['recommendation_json']
                
            # Image delivery mode
            image_path = h.get('image_path')
            if image_path:
                from services.storage_service import is_local_storage, generate_signed_url
                if is_local_storage():
                    h['image_url'] = None
                    h['image_delivery_mode'] = 'authenticated_proxy'
                else:
                    try:
                        t1 = time.perf_counter()
                        h['image_url'] = generate_signed_url(image_path)
                        h['image_delivery_mode'] = 'signed_url'
                        duration_url = (time.perf_counter() - t1) * 1000
                        if hasattr(g, 'timing_metrics'):
                            g.timing_metrics['signed_url_generation_duration_ms'] = g.timing_metrics.get('signed_url_generation_duration_ms', 0) + duration_url
                    except Exception as e:
                        print(f"Signed URL generation failed, using authenticated proxy fallback", flush=True)
                        h['image_url'] = None
                        h['image_delivery_mode'] = 'authenticated_proxy'

            
            # Standardized contract: history_id is always the Firestore document ID
            h['history_id'] = h.get('id')
            
            # image_path is server-only, never sent to browser
            h.pop('image_path', None)
            
            # Strip internal fields that should not reach the browser
            h.pop('user_id', None)
            h.pop('image_hash_sha256', None)
            h.pop('image_hash_perceptual', None)
                    
            histories.append(h)
                
        return jsonify(histories), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch history', 'message': str(e)}), 500

def promote_scan_tx(tx, pending_ref, doc_ref, user_id, client_payload=None):
    snap = pending_ref.get(transaction=tx)
    if not snap.exists:
        return False, "not_found", None
    pending_data = snap.to_dict() or {}
    
    # Verify scan ownership
    if pending_data.get('user_id') != user_id:
        return False, "not_found", None
    
    status = pending_data.get('status', 'pending')
    if status == 'promoted':
        return False, "already_promoted", None
    
    # Invariant: Once a scan enters "deleting" (or "failed_deletion") or has unresolved_upload,
    # history promotion must reject it unconditionally, regardless of claim age or claimed_at validity.
    # An expired worker lease allows another cleanup worker to resume deletion, but NEVER
    # allows promotion. A Firestore transaction does not make a GCS deletion atomic: GCS
    # and Firestore are distinct distributed systems without 2PC. Once deletion is initiated,
    # promotion is permanently blocked so history records can never reference in-flight,
    # timed-out, or deleted photos.
    if status in ('deleting', 'failed_deletion') or pending_data.get('unresolved_upload'):
        return False, "claimed_for_deletion", None

    # Promotion must accept only explicitly eligible states. Incomplete, uploading,
    # processing, or rejected scans cannot be saved to persistent history.
    if status not in ('completed', 'pending'):
        return False, "ineligible_state", None

    # Derive metadata from the server-side record
    client_payload = client_payload or {}
    recommendation = pending_data.get('recommendation', {})
    recommendation_json = ""
    if isinstance(recommendation, dict):
        recommendation_json = json.dumps(recommendation)
    elif isinstance(recommendation, str):
        recommendation_json = recommendation
    
    scan_id = getattr(pending_ref, 'id', pending_data.get('scan_id'))
    browser_source = client_payload.get('source', pending_data.get('source', 'unknown'))
    browser_client_ts = client_payload.get('client_capture_timestamp', pending_data.get('client_capture_timestamp'))
    now_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    new_history = {
        'user_id': user_id,
        'image_url': None,
        'image_path': pending_data.get('image_path'),
        'predicted_class': pending_data.get('predicted_class'),
        'confidence': pending_data.get('confidence'),
        'severity_index': pending_data.get('severity_index'),
        'recommendation_json': recommendation_json,
        'timestamp': now_utc,
        'scan_id': scan_id,
        'client_capture_timestamp': browser_client_ts,
        'source': browser_source,
        'model_version': pending_data.get('model_version'),
        'simulated_analysis': pending_data.get('simulated_analysis', False),
        'model_mode': pending_data.get('model_mode', 'real_model'),
        'image_hash_sha256': pending_data.get('image_hash_sha256'),
        'image_hash_perceptual': pending_data.get('image_hash_perceptual'),
        'comparison_eligible': pending_data.get('comparison_eligible'),
        'quality_flags': pending_data.get('quality_flags', []),
        'image_dimensions': pending_data.get('image_dimensions'),
        'analysis_completed': pending_data.get('analysis_completed', True)
    }
    
    tx.set(doc_ref, new_history)
    tx.update(pending_ref, {
        'status': 'promoted',
        'promoted_at': now_utc
    })
    return True, "success", (new_history, recommendation)

@history_bp.route('/', methods=['POST'])
@token_required
def save_history(current_user):
    from routes.auth import check_user_consent
    if not check_user_consent(current_user):
        return jsonify({
            'error': 'Consent required',
            'message': 'Account consent record is missing or incomplete. Please accept the updated terms and disclosures.'
        }), 403

    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Missing data', 'message': 'No data provided.'}), 400
    
    # Only accept safe browser fields
    scan_id = data.get('scan_id')
    if not scan_id:
        return jsonify({'error': 'Missing data', 'message': 'scan_id is required.'}), 400
    
    # Reject any attempt to submit protected server-authority fields
    protected_fields = ['image_path', 'image_url', 'predicted_class', 'confidence',
                        'severity_index', 'recommendation', 'image_hash_sha256',
                        'image_hash_perceptual', 'model_version', 'comparison_eligible',
                        'quality_flags', 'user_id']
    submitted_protected = [f for f in protected_fields if f in data]
    if submitted_protected:
        return jsonify({
            'error': 'Invalid payload',
            'message': f'Browser must not submit server-authority fields: {", ".join(submitted_protected)}'
        }), 400
    
    try:
        from models import db, pending_scans_collection, histories_collection
        from scripts.cleanup_pending_scans import parse_iso_datetime
        from google.cloud import firestore

        pending_ref = pending_scans_collection.document(scan_id)
        doc_ref = histories_collection.document()

        def _promote_tx(tx):
            return promote_scan_tx(tx, pending_ref, doc_ref, current_user['id'], client_payload=data)

        t2 = time.perf_counter()
        tx = db.transaction()
        if hasattr(firestore, 'transactional'):
            promote_fn = firestore.transactional(_promote_tx)
            success, reason, result = promote_fn(tx)
        else:
            success, reason, result = _promote_tx(tx)
            
        duration_fs = (time.perf_counter() - t2) * 1000
        if hasattr(g, 'timing_metrics'):
            g.timing_metrics['firestore_duration_ms'] = g.timing_metrics.get('firestore_duration_ms', 0) + duration_fs

        if not success:
            if reason == "not_found":
                return jsonify({'error': 'Scan not found', 'message': 'No pending scan found for this scan_id.'}), 404
            elif reason == "already_promoted":
                return jsonify({'error': 'Already promoted', 'message': 'This scan has already been saved to your history.'}), 409
            elif reason == "claimed_for_deletion":
                return jsonify({'error': 'Scan claimed for deletion', 'message': 'This pending scan has expired and is claimed for cleanup deletion.'}), 409
            elif reason == "ineligible_state":
                return jsonify({'error': 'Ineligible state', 'message': 'This scan is incomplete or rejected and cannot be saved to history.'}), 400
            else:
                return jsonify({'error': 'Promotion failed', 'message': 'Unable to promote scan.'}), 400

        new_history, recommendation = result
        
        # Build safe browser response
        response_history = {
            'id': doc_ref.id,
            'history_id': doc_ref.id,
            'scan_id': scan_id,
            'predicted_class': new_history['predicted_class'],
            'confidence': new_history['confidence'],
            'severity_index': new_history['severity_index'],
            'recommendation': recommendation if isinstance(recommendation, dict) else {},
            'timestamp': new_history['timestamp'],
            'source': new_history['source'],
            'comparison_eligible': new_history['comparison_eligible'],
            'quality_flags': new_history['quality_flags'],
            'image_dimensions': new_history.get('image_dimensions'),
            'analysis_completed': new_history['analysis_completed'],
            'simulated_analysis': new_history.get('simulated_analysis', False),
            'model_mode': new_history.get('model_mode', 'real_model')
        }
        
        return jsonify({
            'message': 'History saved successfully',
            'history': response_history
        }), 201
    except Exception as e:
        return jsonify({'error': 'Failed to save history', 'message': str(e)}), 500

@history_bp.route('/<history_id>', methods=['DELETE'])
@token_required
def delete_history_item(current_user, history_id):
    try:
        doc_ref = histories_collection.document(history_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({'error': 'Not found', 'message': 'History item not found.'}), 404
            
        data = doc.to_dict()
        if data.get('user_id') != current_user['id']:
            return jsonify({'error': 'Unauthorized', 'message': 'You do not have permission to delete this item.'}), 403
            
        # Delete from GCS
        image_path = data.get('image_path')
        if image_path:
            try:
                from services.storage_service import get_storage_client, get_bucket_name
                client = get_storage_client()
                bucket = client.bucket(get_bucket_name())
                blob = bucket.blob(image_path)
                blob.delete()
            except Exception as e:
                print(f"Failed to delete image from GCS: {e}", flush=True)

        doc_ref.delete()
        return jsonify({'message': 'History item deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to delete history', 'message': str(e)}), 500

@history_bp.route('/<history_id>/image', methods=['GET'])
@token_required
def get_history_image(current_user, history_id):
    try:
        doc_ref = histories_collection.document(history_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({'error': 'Image not found'}), 404
            
        data = doc.to_dict()
        
        # Verify ownership
        if data.get('user_id') != current_user['id']:
            return jsonify({'error': 'Image not found'}), 404 # Returning 404 instead of 403 to prevent scanning
            
        image_path = data.get('image_path')
        if not image_path:
            return jsonify({'error': 'Image not found'}), 404
            
        import os
        import mimetypes
        from flask import Response
        from services.storage_service import is_local_storage, get_local_storage_dir, get_storage_client, get_bucket_name
        
        if is_local_storage():
            local_path = os.path.join(get_local_storage_dir(), image_path)
            if os.path.exists(local_path):
                with open(local_path, 'rb') as f:
                    image_bytes = f.read()
                content_type, _ = mimetypes.guess_type(local_path)
                if not content_type:
                    content_type = 'image/jpeg'
                response = Response(image_bytes, mimetype=content_type)
                response.headers['Cache-Control'] = 'private, no-store'
                response.headers['X-Content-Type-Options'] = 'nosniff'
                return response
            else:
                # Differentiate between explicitly identified legacy synthetic fixtures
                # and real scans whose local image file is missing.
                is_legacy_synthetic = (
                    data.get('is_synthetic') is True
                    or data.get('source') in ('synthetic_fixture', 'fixture')
                    or data.get('model_version') == 'fixture'
                    or ('synthetic' in (image_path or '').lower())
                )
                if is_legacy_synthetic:
                    synthetic_svg = (
                        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'>"
                        "<rect width='100%' height='100%' fill='#f8fafc'/>"
                        "<rect x='20' y='20' width='360' height='260' rx='12' fill='#f1f5f9' stroke='#cbd5e1' stroke-width='2' stroke-dasharray='6 6'/>"
                        "<circle cx='200' cy='115' r='45' fill='#cbd5e1'/>"
                        "<path d='M150 205 C150 165 250 165 250 205 Z' fill='#cbd5e1'/>"
                        "<text x='50%' y='238' font-family='sans-serif' font-size='14' font-weight='600' text-anchor='middle' fill='#64748b'>Synthetic Demo Record</text>"
                        "<text x='50%' y='258' font-family='sans-serif' font-size='11' text-anchor='middle' fill='#94a3b8'>No physical image stored</text>"
                        "</svg>"
                    )
                    response = Response(synthetic_svg, mimetype='image/svg+xml')
                    response.headers['Cache-Control'] = 'private, no-store'
                    return response
                else:
                    # Missing local image for an actual record: must show "Photo unavailable"
                    unavailable_svg = (
                        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'>"
                        "<rect width='100%' height='100%' fill='#f8fafc'/>"
                        "<circle cx='200' cy='120' r='36' fill='#e2e8f0'/>"
                        "<path d='M188 120 L212 120 M200 108 L200 132' stroke='#94a3b8' stroke-width='3' stroke-linecap='round' transform='rotate(45 200 120)'/>"
                        "<text x='50%' y='190' font-family='sans-serif' font-size='14' font-weight='600' text-anchor='middle' fill='#64748b'>Photo unavailable</text>"
                        "<text x='50%' y='210' font-family='sans-serif' font-size='11' text-anchor='middle' fill='#94a3b8'>Original image could not be loaded</text>"
                        "</svg>"
                    )
                    response = Response(unavailable_svg, mimetype='image/svg+xml')
                    response.headers['Cache-Control'] = 'private, no-store'
                    return response

        client = get_storage_client()
        bucket = client.bucket(get_bucket_name())
        blob = bucket.blob(image_path)
        
        if not blob.exists():
            return jsonify({'error': 'Image not found'}), 404
            
        image_bytes = blob.download_as_bytes()
        content_type, _ = mimetypes.guess_type(image_path)
        if not content_type:
            content_type = 'image/jpeg'
            
        response = Response(image_bytes, mimetype=content_type)
        response.headers['Cache-Control'] = 'private, no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response
        
    except Exception as e:
        print(f"Failed to proxy image: {e}", flush=True)
        return jsonify({'error': 'Failed to fetch image', 'message': str(e)}), 500
