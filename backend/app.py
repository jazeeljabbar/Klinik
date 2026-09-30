
import os
import re
import traceback
from datetime import datetime
import uuid
import io
import time
import json
from dotenv import load_dotenv
load_dotenv()
from werkzeug.utils import secure_filename
try:
    import certifi
    if "SSL_CERT_FILE" not in os.environ:
        os.environ["SSL_CERT_FILE"] = certifi.where()
    if "REQUESTS_CA_BUNDLE" not in os.environ:
        os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
except ImportError:
    pass

if "KERAS_HOME" not in os.environ:
    try:
        _default_keras_home = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".keras")
        os.makedirs(_default_keras_home, exist_ok=True)
        os.environ["KERAS_HOME"] = _default_keras_home
    except Exception:
        _fallback_keras_home = "/tmp/.keras"
        os.makedirs(_fallback_keras_home, exist_ok=True)
        os.environ["KERAS_HOME"] = _fallback_keras_home

print("[STARTUP] Process started", flush=True)

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_mail import Mail
import numpy as np
from utils.preprocessing import preprocess_image
from utils.recommendations import (
    SEVERITY_CLASSES,
    get_recommendation,
    get_severity_index
)
from utils.face_detection import detect_face, detect_face_with_boxes
from routes.auth import auth_bp
from routes.history import history_bp


app = Flask(__name__)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "https://klinik-ai-499720.web.app",
    "https://klinik-ai-499720.firebaseapp.com",
    re.compile(r"^http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$")
]
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})

@app.before_request
def start_timer():
    g.start_time = time.perf_counter()
    g.timing_metrics = {}
    g.request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex

@app.after_request
def record_status(response):
    g.response_status_code = response.status_code
    return response

@app.teardown_request
def log_request(exception=None):
    if not hasattr(g, 'start_time'):
        return
        
    # We don't want to log generic static files or health checks constantly if not needed, but the prompt says to log these endpoints.
    # To be safe, log everything or just the requested ones.
    # We will log all requests for full observability.
    total_duration_ms = (time.perf_counter() - g.start_time) * 1000
    route = request.url_rule.rule if request.url_rule else request.path
    status = getattr(g, 'response_status_code', 500 if exception else 200)
    
    log_data = {
        "request_id": getattr(g, "request_id", ""),
        "route": route,
        "method": request.method,
        "status": status,
        "total_duration_ms": round(total_duration_ms, 2)
    }
    
    metrics = getattr(g, "timing_metrics", {})
    for k, v in metrics.items():
        log_data[k] = round(v, 2)
        
    print(json.dumps(log_data), flush=True)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "acne2812022.h5")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
CONFIDENCE_THRESHOLD = 70.0  # Minimum confidence (%) to accept a prediction
MARGIN_THRESHOLD = 15.0      # Min gap (%) between top-1 and top-2 predictions

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///app.db")
if app.config["SQLALCHEMY_DATABASE_URI"].startswith("postgres://"):
    app.config["SQLALCHEMY_DATABASE_URI"] = app.config["SQLALCHEMY_DATABASE_URI"].replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "super-secret-development-key-for-jwt")
app.config["MAIL_SERVER"] = os.environ.get("MAIL_SERVER", "smtp.sendgrid.net")
app.config["MAIL_PORT"] = int(os.environ.get("MAIL_PORT", 587))
app.config["MAIL_USE_TLS"] = os.environ.get("MAIL_USE_TLS", "True").lower() == "true"
app.config["MAIL_USERNAME"] = os.environ.get("MAIL_USERNAME", "apikey")
app.config["MAIL_PASSWORD"] = os.environ.get("MAIL_PASSWORD") # Read from environment variable or .env file
app.config["MAIL_DEFAULT_SENDER"] = os.environ.get("MAIL_DEFAULT_SENDER", "pg2253890@gmail.com")
app.config["GOOGLE_CLIENT_ID"] = os.environ.get("GOOGLE_CLIENT_ID")

mail = Mail(app)

app.register_blueprint(auth_bp)
app.register_blueprint(history_bp)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

model = None

def is_demo_mode():
    """
    Returns True only when explicit isolated demo/test mode is enabled.
    In standard/production mode, missing model weights must fail closed (HTTP 503)
    rather than generating mock or synthetic predictions.
    Offline testing (KLINIK_OFFLINE_TESTING=1) alone must NOT implicitly enable
    simulated predictions.
    """
    return (
        os.environ.get("KLINIK_ALLOW_SIMULATED_PREDICTIONS") == "1"
        or os.environ.get("KLINIK_DEMO_MODE") == "1"
    )

def load_ml_model():
    global model
    try:
        from tensorflow.keras.models import load_model
        target_path = MODEL_PATH
        if not os.path.exists(target_path) and os.path.exists(target_path + ".bak"):
            import shutil
            shutil.copy2(target_path + ".bak", target_path)
            print(f"[+] Restored model file from backup: {target_path}.bak -> {target_path}", flush=True)

        if os.path.exists(target_path):
            print("[STARTUP] TensorFlow/model loading started", flush=True)
            model = load_model(target_path, compile=False)
            print("[STARTUP] Model loading completed", flush=True)
            print("[STARTUP] Service ready", flush=True)
            print(f"[+] Model loaded successfully from: {target_path}")
            print(f"[+] Model input shape: {model.input_shape}")
        else:
            print(f"[-] Model file not found at: {target_path}")
            if is_demo_mode():
                print("[!] Explicit demo mode enabled: /predict will return simulated results.")
            else:
                print("[!] Standard mode: /predict will fail closed (503) if model is requested without weights.")
    except Exception as e:
        print(f"[-] Failed to load model: {str(e)}")
        if is_demo_mode():
            print("[!] Explicit demo mode enabled: /predict will return simulated results.")
        else:
            print("[!] Standard mode: /predict will fail closed (503) if model is requested without weights.")
load_ml_model()

def allowed_file(filename):
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_mock_prediction():
    import random
    class_idx = random.randint(0, len(SEVERITY_CLASSES) - 1)
    confidence = round(random.uniform(70, 99), 2)
    predicted_class = SEVERITY_CLASSES[class_idx]
    
    return predicted_class, confidence

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "running",
        "model_loaded": model is not None,
        "timestamp": datetime.utcnow().isoformat()
    }), 200


def transition_pending_scan_status(scan_id, allowed_current_statuses, update_payload):
    """
    Atomically transitions a pending scan document only if its current status is in
    allowed_current_statuses. Prevents overwriting 'deleting', 'promoted', or missing records.
    Uses doc_ref.get(transaction=tx) to match the Firestore SDK contract.
    """
    from models import db, pending_scans_collection
    from google.cloud import firestore

    doc_ref = pending_scans_collection.document(scan_id)

    def _tx(tx):
        snap = doc_ref.get(transaction=tx)
        if not snap.exists:
            return False, "not_found"
        data = snap.to_dict() or {}
        curr_status = data.get("status")
        if curr_status not in allowed_current_statuses:
            return False, f"ineligible_status_{curr_status}"
        tx.update(doc_ref, update_payload)
        return True, "updated"

    tx = db.transaction()
    if hasattr(firestore, 'transactional'):
        tx_fn = firestore.transactional(_tx)
        return tx_fn(tx)
    return _tx(tx)


def authorize_scan_error_cleanup(scan_id, error_reason):
    """
    Guarded transition to authorize error cleanup.
    Only allows transition to 'deleting' if current status is in ('uploading', 'processing').
    Fails closed if the scan is 'completed', 'promoted', missing, or if the transaction/read fails.
    """
    if not scan_id:
        return False, "missing_scan_id"
    now_iso = datetime.utcnow().isoformat()
    try:
        ok, reason = transition_pending_scan_status(
            scan_id,
            allowed_current_statuses=('uploading', 'processing'),
            update_payload={
                'status': 'deleting',
                'needs_cleanup': True,
                'last_deletion_error': str(error_reason),
                'claimed_at': now_iso
            }
        )
        return ok, reason
    except Exception as e:
        print(f"Guarded error cleanup authorization failed for {scan_id}: {e}", flush=True)
        return False, f"transaction_error_{e}"


@app.route("/predict", methods=["POST"])
def predict():
    """
    Predict acne severity from an uploaded image.
    
    Expects:
        - Form-data with key 'image' containing the image file.
    
    Returns:
        JSON: {
            "predicted_class": str,
            "confidence": float,
            "severity_index": int,
            "recommendation": dict,
            "timestamp": str
        }
    
    Status Codes:
        200: Successful prediction
        400: Bad request (no file, invalid format)
        500: Internal server error
    """
    scan_id = None
    user_id = None
    image_path = None
    expected_image_path = None
    completed_persisted = False

    try:
        # ── Determine user_id if logged in, enforce consent gate, or enforce guest disclosure ──
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header:
            if not auth_header.startswith("Bearer "):
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Invalid authorization header format."
                }), 401
            token = auth_header.split(" ")[1]
            try:
                import jwt
                data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
                user_id = data.get("user_id")
                if not user_id:
                    return jsonify({
                        "error": "Unauthorized",
                        "message": "Invalid token payload."
                    }), 401
                from models import users_collection, serialize_doc
                user_doc = users_collection.document(user_id).get()
                if not user_doc.exists:
                    return jsonify({
                        "error": "Unauthorized",
                        "message": "User not found."
                    }), 401
                user_data = serialize_doc(user_doc)
                from routes.auth import check_user_consent
                if not check_user_consent(user_data):
                    return jsonify({
                        "error": "Consent required",
                        "message": "Account consent record is missing or incomplete. Please accept the updated terms and disclosures."
                    }), 403
            except jwt.ExpiredSignatureError:
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Token has expired."
                }), 401
            except jwt.InvalidTokenError:
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Invalid token."
                }), 401
            except Exception as e:
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Authentication failed."
                }), 401
        else:
            # Guest scan: validate client-provided guest acknowledgement
            guest_consent = request.form.get("guest_consent")
            if guest_consent not in ("true", True, "True"):
                return jsonify({
                    "error": "Guest disclosure acknowledgement required",
                    "message": "You must acknowledge the clinical disclaimer and image upload terms before proceeding with a guest scan."
                }), 400

        # ── Validate request files ──
        if "image" not in request.files:
            return jsonify({
                "error": "No image file provided",
                "message": "Please upload an image file with the key 'image'."
            }), 400
        
        file = request.files["image"]
        
        if file.filename == "":
            return jsonify({
                "error": "No file selected",
                "message": "Please select an image file to upload."
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "error": "Invalid file format",
                "message": f"Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        # ── Verify model availability before initiating storage upload or Firestore tracking ──
        if model is None and not is_demo_mode():
            return jsonify({
                "error": "Prediction unavailable",
                "error_type": "model_unavailable",
                "message": "The analysis model is unavailable. Please try again later or contact support."
            }), 503
            
        # ── Parse additional metadata ──
        client_capture_timestamp = request.form.get("client_capture_timestamp")
        source = request.form.get("source", "unknown")
                
        # ── Setup scan identifiers and durable tracking record ──
        image_bytes = file.read()
        scan_id = uuid.uuid4().hex
        image_url = None
        image_path = None
        completed_persisted = False

        from constants.policies import POLICY_VERSION
        from models import pending_scans_collection
        now_utc = datetime.utcnow().isoformat()

        ext = os.path.splitext(secure_filename(file.filename))[1].lower() or '.jpg'
        if ext not in ALLOWED_EXTENSIONS and not ext.lstrip('.'):
            ext = '.jpg'
        if user_id:
            expected_image_path = f"users/{user_id}/scans/{scan_id}/original{ext}"
        else:
            expected_image_path = f"anonymous/{scan_id}/original{ext}"

        # Establish recoverable tracking record before initiating GCS upload.
        # If Firestore persistence fails, do not start the storage upload.
        initial_tracking_doc = {
            'scan_id': scan_id,
            'user_id': user_id,
            'image_path': expected_image_path,
            'status': 'uploading',
            'created_at': now_utc,
            'guest_disclosure_acknowledged': True if user_id is None else False,
            'disclosure_version': POLICY_VERSION if user_id is None else None,
            'source': source,
            'client_capture_timestamp': client_capture_timestamp,
            'analysis_completed': False
        }
        try:
            pending_scans_collection.document(scan_id).set(initial_tracking_doc)
        except Exception as track_err:
            print(f"Failed to persist initial scan tracking record: {track_err}", flush=True)
            return jsonify({
                "error": "Storage error",
                "message": "Failed to initialize scan tracking."
            }), 500

        # ── Save image to GCS ──
        try:
            from services.storage_service import upload_image_to_gcs
            
            t0 = time.perf_counter()
            image_path = upload_image_to_gcs(image_bytes, file.filename, user_id=user_id, scan_id=scan_id)
            g.timing_metrics["gcs_upload_duration_ms"] = (time.perf_counter() - t0) * 1000
            print("GCS upload SUCCESS", flush=True)
        except Exception as upload_err:
            print(f"GCS upload failed or timed out: {upload_err}", flush=True)
            try:
                from services.storage_service import delete_image_from_gcs
                delete_image_from_gcs(expected_image_path)
            except Exception as del_e:
                print(f"Failed immediate deletion after upload error: {del_e}", flush=True)

            # Preserve tracking record for ambiguous / late-completing uploads!
            # Do NOT delete the tracking document even if delete returned 404.
            try:
                pending_scans_collection.document(scan_id).update({
                    'status': 'deleting',
                    'needs_cleanup': True,
                    'upload_failed': True,
                    'unresolved_upload': True,
                    'upload_failed_at': now_utc,
                    'last_deletion_error': f"Upload failed or timed out: {upload_err}"
                })
            except Exception as fs_e:
                print(f"Failed to update tracking doc on upload error: {fs_e}", flush=True)

            return jsonify({
                "error": "Upload error",
                "message": "Failed to upload image for analysis."
            }), 500

        # Guarded transition from 'uploading' to 'processing':
        ok, reason = transition_pending_scan_status(
            scan_id,
            allowed_current_statuses=('uploading',),
            update_payload={'status': 'processing'}
        )
        if not ok:
            print(f"Aborting prediction: scan {scan_id} could not transition to processing ({reason})", flush=True)
            return jsonify({
                "error": "Scan state conflict",
                "message": f"Scan is no longer available for analysis ({reason})."
            }), 409

        try:
            from services.storage_service import generate_signed_url
            t1 = time.perf_counter()
            image_url = generate_signed_url(image_path)
            g.timing_metrics["signed_url_generation_duration_ms"] = (time.perf_counter() - t1) * 1000
        except Exception as url_err:
            print(f"Signed URL generation failed: {url_err}", flush=True)
            image_url = None
            
        unique_filename = f"{scan_id}_{secure_filename(file.filename)}"
        
        # ── Hashing & Quality Checks ──
        import hashlib
        import cv2
        import imagehash
        from PIL import Image
        
        image_hash_sha256 = hashlib.sha256(image_bytes).hexdigest()
        
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            image_hash_perceptual = str(imagehash.phash(pil_img))
        except Exception as e:
            image_hash_perceptual = None
            print(f"Failed to generate pHash: {e}")
            
        quality_flags = []
        face_boxes = []
        image_dimensions = None
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if cv_img is not None:
                (h, w) = cv_img.shape[:2]
                image_dimensions = {'width': int(w), 'height': int(h)}
                gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
                brightness_score = float(np.mean(gray))

                # 1. Resolution check (minimum 800x800 recommended for progress comparison)
                if w < 800 or h < 800:
                    quality_flags.append("low_resolution")

                # 2. Lighting checks
                if brightness_score < 40.0:
                    quality_flags.append("low_light")
                if brightness_score > 240.0:
                    quality_flags.append("overexposed")
            else:
                quality_flags.append("blur")
                gray = None
        except Exception as e:
            print(f"Failed OpenCV quality checks: {e}")
            cv_img = None
            gray = None

        # ── Face detection validation ──
        has_face, face_count, face_msg = detect_face(io.BytesIO(image_bytes))
        if not has_face:
            quality_flags.append("no_face")
        else:
            try:
                _, _, _, face_boxes = detect_face_with_boxes(io.BytesIO(image_bytes))
                if any(box.get('is_partial') for box in face_boxes):
                    quality_flags.append("partial_face")
            except Exception:
                face_boxes = []

        # ── Sharpness / Blur check (evaluated on facial ROI or skin area) ──
        if gray is not None:
            (h, w) = cv_img.shape[:2]
            if face_boxes and len(face_boxes) > 0:
                x1, y1, x2, y2 = face_boxes[0]['box']
                roi_gray = gray[y1:y2, x1:x2]
            else:
                roi_gray = gray[int(0.05 * h):int(0.95 * h), int(0.05 * w):int(0.98 * w)]

            if roi_gray.size > 0:
                roi_lap = float(cv2.Laplacian(roi_gray, cv2.CV_64F).var())
                gx = cv2.Sobel(roi_gray, cv2.CV_64F, 1, 0, ksize=3)
                gy = cv2.Sobel(roi_gray, cv2.CV_64F, 0, 1, ksize=3)
                tenengrad = float(np.mean(gx**2 + gy**2))

                # Calibrated sharpness threshold verified against sharp photos and blurred controls
                if roi_lap < 15.0 or (roi_lap < 25.0 and tenengrad < 350.0):
                    quality_flags.append("blur")

        comparison_eligible = len(quality_flags) == 0
        
        # ── Process and predict ──
        if model is not None:
            t_infer = time.perf_counter()
            processed_image = preprocess_image(io.BytesIO(image_bytes))
            prediction = model.predict(processed_image, verbose=0)
            g.timing_metrics["model_inference_duration_ms"] = (time.perf_counter() - t_infer) * 1000
            
            probs = prediction[0] if isinstance(prediction, list) else prediction
            
            # probs shape is (1, num_classes)
            prob_array = probs[0]
            sorted_indices = np.argsort(prob_array)[::-1]  # descending
            class_idx = int(sorted_indices[0])
            confidence = round(float(prob_array[class_idx] * 100), 2)
            second_confidence = round(float(prob_array[sorted_indices[1]] * 100), 2)
            margin = confidence - second_confidence
            entropy = -float(np.sum(prob_array * np.log2(prob_array + 1e-10)))
            max_entropy = np.log2(len(prob_array))
            normalized_entropy = entropy / max_entropy  # 0=certain, 1=uniform
            
            # ── Rejection checks ──
            #   1. Confidence is below threshold (model not sure about ANY class)
            #   2. Margin is too small (model is torn between classes = likely OOD)
            #   3. Entropy is too high (probabilities are spread too evenly)
            rejection_reason = None
            if confidence < CONFIDENCE_THRESHOLD:
                rejection_reason = (
                    f"The model's confidence ({confidence}%) is too low to make "
                    f"a reliable prediction. This image may not contain recognizable "
                    f"acne patterns."
                )
            elif margin < MARGIN_THRESHOLD:
                rejection_reason = (
                    f"The model could not clearly distinguish between acne severity "
                    f"levels (top two predictions are too close: {confidence}% vs "
                    f"{second_confidence}%). This image may not be suitable for analysis."
                )
            elif normalized_entropy > 0.85:
                rejection_reason = (
                    "The prediction probabilities are too evenly spread across all "
                    "classes, indicating the image does not match any known acne pattern."
                )
            
            if rejection_reason:
                del_ok = False
                if image_path:
                    try:
                        from services.storage_service import delete_image_from_gcs
                        del_ok = delete_image_from_gcs(image_path)
                    except Exception as clean_err:
                        print(f"Failed to delete rejected scan image: {clean_err}", flush=True)
                        del_ok = False
                
                try:
                    if del_ok:
                        pending_scans_collection.document(scan_id).delete()
                    else:
                        # Deletion helper returned False or failed: retain retryable cleanup metadata!
                        pending_scans_collection.document(scan_id).update({
                            'status': 'deleting',
                            'needs_cleanup': True,
                            'rejection_reason': rejection_reason,
                            'last_deletion_error': 'Immediate GCS deletion returned False'
                        })
                except Exception as fs_err:
                    print(f"Failed to update rejected tracking doc: {fs_err}", flush=True)

                return jsonify({
                    "error": "Unable to classify",
                    "error_type": "low_confidence",
                    "message": (
                        "I can't predict the acne severity for this image. "
                        + rejection_reason + " "
                        "Please upload a clear, close-up photo of facial acne."
                    ),
                    "confidence": confidence
                }), 200
            class_idx = min(class_idx, len(SEVERITY_CLASSES) - 1)
            predicted_class = SEVERITY_CLASSES[class_idx]
            is_simulated = False
            model_mode = 'real_model'
            model_version = 'acne2812022.h5'
        elif is_demo_mode():
            predicted_class, confidence = generate_mock_prediction()
            is_simulated = True
            model_mode = 'simulated_local_demo'
            model_version = 'simulated_local_demo'
        else:
            # Defensive post-upload model-unavailable fallback:
            # Use guarded recovery flow and preserve tracking whenever deletion is unsuccessful or ambiguous.
            del_ok = False
            if image_path and scan_id:
                authorized, auth_reason = authorize_scan_error_cleanup(scan_id, "Model unavailable after upload")
                if authorized:
                    try:
                        from services.storage_service import delete_image_from_gcs
                        del_ok = delete_image_from_gcs(image_path)
                    except Exception as clean_err:
                        print(f"Failed to delete image on model unavailable after upload: {clean_err}", flush=True)
                        del_ok = False

                    if del_ok:
                        try:
                            from models import pending_scans_collection
                            pending_scans_collection.document(scan_id).delete()
                        except Exception as fs_err:
                            print(f"Failed to delete pending scan on model unavailable: {fs_err}", flush=True)
                    else:
                        try:
                            from models import pending_scans_collection
                            pending_scans_collection.document(scan_id).update({
                                'status': 'deleting',
                                'needs_cleanup': True,
                                'last_deletion_error': "GCS deletion failed or ambiguous after model became unavailable"
                            })
                        except Exception as upd_err:
                            print(f"Failed to update tracking doc on model unavailable: {upd_err}", flush=True)

            return jsonify({
                "error": "Prediction unavailable",
                "error_type": "model_unavailable",
                "message": "The analysis model is unavailable. Please try again later or contact support."
            }), 503
        recommendation = get_recommendation(predicted_class)
        severity_index = get_severity_index(predicted_class)
        
        # ── Persist scan metadata server-side ──
        # The browser never sees or controls image_path, hashes, or model internals.
        # These are stored in pending_scans keyed by scan_id for later promotion
        # to the histories collection when the user confirms via POST /api/history.
        from models import pending_scans_collection
        
        from constants.policies import POLICY_VERSION
        now_utc = datetime.utcnow().isoformat()
        
        pending_scan_doc = {
            'scan_id': scan_id,
            'user_id': user_id,
            'image_path': image_path,
            'predicted_class': predicted_class,
            'confidence': float(confidence),
            'severity_index': int(severity_index),
            'recommendation': recommendation,
            'source': source,
            'model_version': model_version,
            'simulated_analysis': is_simulated,
            'model_mode': model_mode,
            'image_hash_sha256': image_hash_sha256,
            'image_hash_perceptual': image_hash_perceptual,
            'comparison_eligible': comparison_eligible,
            'quality_flags': quality_flags,
            'image_dimensions': image_dimensions,
            'client_capture_timestamp': client_capture_timestamp,
            'created_at': now_utc,
            'guest_disclosure_acknowledged': True if user_id is None else False,
            'disclosure_version': POLICY_VERSION if user_id is None else None,
            'disclosure_acknowledged_at': now_utc if user_id is None else None,
            'status': 'completed',
            'analysis_completed': True
        }
        
        t_fs = time.perf_counter()
        try:
            ok, reason = transition_pending_scan_status(
                scan_id,
                allowed_current_statuses=('processing',),
                update_payload=pending_scan_doc
            )
            if ok:
                completed_persisted = True
            else:
                print(f"Failed to transition scan {scan_id} to completed: {reason}", flush=True)
                return jsonify({
                    "error": "Scan state conflict",
                    "message": f"Scan is no longer available ({reason})."
                }), 409
        except Exception as tx_err:
            print(f"Ambiguous completion write outcome for scan {scan_id}: {tx_err}", flush=True)
            # Verify server state via get() before deciding whether write succeeded or whether to clean up
            try:
                server_snap = pending_scans_collection.document(scan_id).get()
                if server_snap.exists:
                    server_data = server_snap.to_dict() or {}
                    if server_data.get("status") == "completed":
                        completed_persisted = True
            except Exception as get_err:
                print(f"Failed to verify server state after ambiguous completion write: {get_err}", flush=True)

            if not completed_persisted:
                raise tx_err

        g.timing_metrics["pending_scan_save_duration_ms"] = (time.perf_counter() - t_fs) * 1000
        
        # ── Return only safe browser fields ──
        return jsonify({
            "scan_id": scan_id,
            "predicted_class": predicted_class,
            "confidence": confidence,
            "severity_index": severity_index,
            "recommendation": recommendation,
            "comparison_eligible": comparison_eligible,
            "quality_flags": quality_flags,
            "image_dimensions": image_dimensions,
            "source": source,
            "timestamp": now_utc,
            "policy_version": POLICY_VERSION,
            "analysis_completed": True,
            "simulated_analysis": is_simulated,
            "model_mode": model_mode,
            "model_notice": (
                "Local demo — simulated analysis. The neural network model weights are not loaded locally; "
                "this assessment is simulated for workflow preview and should not be used as clinical findings."
            ) if is_simulated else None
        }), 200
        
    except ValueError as e:
        if not completed_persisted and scan_id:
            try:
                server_snap = pending_scans_collection.document(scan_id).get()
                if server_snap.exists and (server_snap.to_dict() or {}).get("status") in ("completed", "promoted"):
                    completed_persisted = True
            except Exception as check_err:
                print(f"Failed to check server scan status on ValueError: {check_err}", flush=True)

        if completed_persisted:
            print(f"Scan {scan_id} is completed or promoted; skipping error cleanup.", flush=True)
        elif image_path and scan_id:
            # Invariant: Authorize error cleanup exclusively through a successful guarded state transition ('deleting').
            # Protect both completed and promoted states. If a completion write may have committed and verification reads fail,
            # do NOT delete the image or tracking record. A failed read must never authorize deletion.
            authorized, auth_reason = authorize_scan_error_cleanup(scan_id, f"ValueError before completion: {str(e)}")
            if authorized:
                del_ok = False
                try:
                    from services.storage_service import delete_image_from_gcs
                    del_ok = delete_image_from_gcs(image_path)
                except Exception as clean_err:
                    print(f"Failed to delete orphaned image on ValueError: {clean_err}", flush=True)
                    del_ok = False

                if del_ok:
                    try:
                        pending_scans_collection.document(scan_id).delete()
                    except Exception as fs_err:
                        print(f"Failed to delete tracking doc after successful GCS delete: {fs_err}", flush=True)
            else:
                print(f"Error cleanup NOT authorized for scan {scan_id} ({auth_reason}). Retaining storage object and tracking record.", flush=True)

        return jsonify({
            "error": "Image processing error",
            "message": str(e)
        }), 400
        
    except Exception as e:
        traceback.print_exc()
        if not completed_persisted and scan_id:
            try:
                server_snap = pending_scans_collection.document(scan_id).get()
                if server_snap.exists and (server_snap.to_dict() or {}).get("status") in ("completed", "promoted"):
                    completed_persisted = True
            except Exception as check_err:
                print(f"Failed to check server scan status on Exception: {check_err}", flush=True)

        if completed_persisted:
            print(f"Scan {scan_id} is completed or promoted; skipping error cleanup.", flush=True)
        elif image_path and scan_id:
            # Invariant: Authorize error cleanup exclusively through a successful guarded state transition ('deleting').
            # Protect both completed and promoted states. If a completion write may have committed and verification reads fail,
            # do NOT delete the image or tracking record. A failed read must never authorize deletion.
            authorized, auth_reason = authorize_scan_error_cleanup(scan_id, f"Exception before completion: {str(e)}")
            if authorized:
                del_ok = False
                try:
                    from services.storage_service import delete_image_from_gcs
                    del_ok = delete_image_from_gcs(image_path)
                except Exception as clean_err:
                    print(f"Failed to delete orphaned image on Exception: {clean_err}", flush=True)
                    del_ok = False

                if del_ok:
                    try:
                        pending_scans_collection.document(scan_id).delete()
                    except Exception as fs_err:
                        print(f"Failed to delete tracking doc after successful GCS delete: {fs_err}", flush=True)
            else:
                print(f"Error cleanup NOT authorized for scan {scan_id} ({auth_reason}). Retaining storage object and tracking record.", flush=True)

        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred during prediction."
        }), 500

@app.errorhandler(413)
def file_too_large(e):
    return jsonify({
        "error": "File too large",
        "message": "Maximum file size is 16MB."
    }), 413


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Not found",
        "message": "The requested endpoint does not exist."
    }), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({
        "error": "Method not allowed",
        "message": "This HTTP method is not supported for this endpoint."
    }), 405

if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    port = int(os.environ.get("PORT", 5001))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug_mode
    )
