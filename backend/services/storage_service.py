import os
from datetime import timedelta
from google.cloud import storage
import uuid
import mimetypes

def get_storage_client():
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "klinik-ai-499720")
    return storage.Client(project=project_id)

def get_bucket_name():
    return os.environ.get("GCS_BUCKET_NAME", "klinik-ai-499720-skin-images")

def is_local_storage():
    """
    Returns True only when explicit local/test storage configuration is enabled.
    In cloud mode (default), cloud storage credentials must be used and will
    fail clearly if misconfigured or unavailable. The absence of
    GOOGLE_APPLICATION_CREDENTIALS never triggers local storage.
    """
    return (
        os.environ.get("KLINIK_LOCAL_STORAGE") == "1"
        or os.environ.get("KLINIK_OFFLINE_TESTING") == "1"
        or os.environ.get("KLINIK_SYNTHETIC_STORAGE") == "1"
    )

def get_local_storage_dir():
    base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "uploads")
    os.makedirs(base_dir, exist_ok=True)
    return base_dir

def validate_image_file(filename):
    """
    Returns True if the file extension is allowed.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    _, ext = os.path.splitext(filename.lower())
    return ext in allowed_extensions

def upload_image_to_gcs(file_bytes, filename, user_id=None, scan_id=None):
    """
    Uploads an image to GCS (or local disk in local/emulator mode) and returns the storage path (blob name).
    """
    if not scan_id:
        scan_id = uuid.uuid4().hex
        
    _, ext = os.path.splitext(filename.lower())
    
    if user_id:
        blob_path = f"users/{user_id}/scans/{scan_id}/original{ext}"
    else:
        blob_path = f"anonymous/{scan_id}/original{ext}"
        
    if is_local_storage():
        target_path = os.path.join(get_local_storage_dir(), blob_path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        return blob_path

    client = get_storage_client()
    bucket = client.bucket(get_bucket_name())
    blob = bucket.blob(blob_path)
    
    content_type, _ = mimetypes.guess_type(filename)
    if not content_type:
        content_type = "application/octet-stream"
        
    blob.upload_from_string(file_bytes, content_type=content_type)
    
    return blob_path

def generate_signed_url(blob_path, expiry_minutes=60):
    if not blob_path:
        return None
    if is_local_storage():
        # In local storage mode, clients use the authenticated proxy endpoint (/api/history/<id>/image)
        return None

    import google.auth
    from google.auth.transport import requests as google_requests
    
    client = get_storage_client()
    bucket = client.bucket(get_bucket_name())
    blob = bucket.blob(blob_path)
    
    credentials, project_id = google.auth.default()
    
    # If running locally with service account JSON, it has sign_bytes
    if hasattr(credentials, "sign_bytes"):
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=expiry_minutes),
            method="GET"
        )
    
    # On Cloud Run / ADC, use IAM credentials
    auth_request = google_requests.Request()
    credentials.refresh(auth_request)
    service_account_email = credentials.service_account_email
    
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=expiry_minutes),
        method="GET",
        service_account_email=service_account_email,
        access_token=credentials.token
    )

def delete_image_from_gcs(blob_path):
    """
    Deletes an image blob from GCS (or local disk in local/emulator mode) if it exists.
    Handles NotFound gracefully.
    """
    if not blob_path:
        return False
    if is_local_storage():
        target_path = os.path.join(get_local_storage_dir(), blob_path)
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
            except OSError:
                pass
        return True
    try:
        from google.cloud.exceptions import NotFound
        client = get_storage_client()
        bucket = client.bucket(get_bucket_name())
        blob = bucket.blob(blob_path)
        blob.delete()
        return True
    except NotFound:
        return True
    except Exception as e:
        print(f"Failed to delete GCS image {blob_path}: {e}", flush=True)
        return False


