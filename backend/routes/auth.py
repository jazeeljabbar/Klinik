from flask import Blueprint, request, jsonify, current_app
from flask_bcrypt import Bcrypt
import jwt
import datetime
import os
import random
import uuid
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google.auth import exceptions as google_exceptions
import requests
from flask import g
import time

from models import users_collection, serialize_doc
from utils.auth_middleware import token_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
bcrypt = Bcrypt()
otp_store = {}

def get_user_by_email(email):
    t0 = time.perf_counter()
    docs = users_collection.where("email", "==", email).limit(1).get()
    duration = (time.perf_counter() - t0) * 1000
    if hasattr(g, 'timing_metrics'):
        g.timing_metrics['firestore_duration_ms'] = g.timing_metrics.get('firestore_duration_ms', 0) + duration
    for doc in docs:
        return doc
    return None

def get_user_by_phone(phone):
    t0 = time.perf_counter()
    docs = users_collection.where("phone", "==", phone).limit(1).get()
    duration = (time.perf_counter() - t0) * 1000
    if hasattr(g, 'timing_metrics'):
        g.timing_metrics['firestore_duration_ms'] = g.timing_metrics.get('firestore_duration_ms', 0) + duration
    for doc in docs:
        return doc
    return None

def check_user_consent(user_data):
    """
    Returns True if user_data contains complete and active consent records
    matching the current canonical POLICY_VERSION.
    """
    if not isinstance(user_data, dict):
        return False
    consents = user_data.get('consents')
    if not isinstance(consents, dict):
        return False
    from constants.policies import POLICY_VERSION
    return (
        consents.get('terms_accepted') is True and
        consents.get('medical_disclaimer_acknowledged') is True and
        consents.get('image_processing_authorized') is True and
        consents.get('policy_version') == POLICY_VERSION
    )

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    required = ['name', 'email', 'phone', 'gender', 'age', 'password']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing data', 'message': 'All fields are required.'}), 400
        
    consent = data.get('consent')
    if not isinstance(consent, dict):
        return jsonify({
            'error': 'Missing consent',
            'message': 'Required consent disclosures must be acknowledged to register.'
        }), 400
        
    terms_accepted = consent.get('terms_accepted')
    medical_disclaimer_acknowledged = consent.get('medical_disclaimer_acknowledged')
    image_processing_authorized = consent.get('image_processing_authorized')
    
    if not (terms_accepted is True and medical_disclaimer_acknowledged is True and image_processing_authorized is True):
        return jsonify({
            'error': 'Consent required',
            'message': 'You must accept the Terms of Service, acknowledge the Medical Disclaimer, and authorize Cloud Image Processing.'
        }), 400
        
    if get_user_by_email(data['email']):
        return jsonify({'error': 'Conflict', 'message': 'Email already registered.'}), 409
    if get_user_by_phone(data['phone']):
        return jsonify({'error': 'Conflict', 'message': 'Phone number already registered.'}), 409
        
    from constants.policies import (
        POLICY_VERSION, TERMS_VERSION, PRIVACY_VERSION,
        MEDICAL_DISCLAIMER_VERSION, IMAGE_PROCESSING_CONSENT_VERSION
    )
    
    server_utc_timestamp = datetime.datetime.utcnow().isoformat()
    consents_record = {
        'terms_accepted': True,
        'medical_disclaimer_acknowledged': True,
        'image_processing_authorized': True,
        'accepted_at': server_utc_timestamp,
        'recorded_at': server_utc_timestamp,
        'policy_version': POLICY_VERSION,
        'terms_version': TERMS_VERSION,
        'privacy_version': PRIVACY_VERSION,
        'medical_disclaimer_version': MEDICAL_DISCLAIMER_VERSION,
        'image_processing_consent_version': IMAGE_PROCESSING_CONSENT_VERSION,
        'consent_method': 'email_signup'
    }
    
    hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = {
        'name': data['name'],
        'email': data['email'],
        'phone': data['phone'],
        'gender': data['gender'],
        'age': int(data['age']),
        'password_hash': hashed_pw,
        'created_at': server_utc_timestamp,
        'consents': consents_record
    }
    
    try:
        t0 = time.perf_counter()
        doc_ref = users_collection.document()
        doc_ref.set(new_user)
        duration = (time.perf_counter() - t0) * 1000
        if hasattr(g, 'timing_metrics'):
            g.timing_metrics['firestore_duration_ms'] = g.timing_metrics.get('firestore_duration_ms', 0) + duration
            
        user_id = doc_ref.id
        
        user_data = new_user.copy()
        user_data['id'] = user_id
        user_data.pop('password_hash', None)
        user_data['consent_required'] = False
        
        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, current_app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': user_data
        }), 201
    except Exception as e:
        return jsonify({'error': 'Server error', 'message': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing credentials', 'message': 'Please provide email and password.'}), 400
        
    email = data.get('email')
    password = data.get('password')
    user_doc = get_user_by_email(email)
    
    if not user_doc:
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid credentials.'}), 401
        
    user_data = user_doc.to_dict()
    if not bcrypt.check_password_hash(user_data['password_hash'], password):
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid credentials.'}), 401
        
    user = serialize_doc(user_doc)
    user['consent_required'] = not check_user_consent(user_data)
    token = jwt.encode({
        'user_id': user['id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({
        'message': 'Logged in successfully',
        'token': token,
        'user': user
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Missing data', 'message': 'Email address is required.'}), 400
        
    user_doc = get_user_by_email(email)
    if not user_doc:
        pass
        
    otp = str(random.randint(1000, 9999))
    otp_store[email] = {
        'otp': otp,
        'expires_at': datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    }
    import resend
    
    resend_api_key = os.environ.get("RESEND_API_KEY")
    resend.api_key = resend_api_key
    
    print(f"[DEBUG] Using Resend for email. API key configured: {bool(resend_api_key)}", flush=True)
    if resend_api_key:
        try:
            params = {
                "from": "Acne AI <onboarding@resend.dev>",
                "to": [email],
                "subject": "SKIN AI — Your Password Reset OTP",
                "html": (
                    f"<p>Hello,</p>"
                    f"<p>You have requested to reset your password for your SKIN AI account.</p>"
                    f"<p>Your one-time password (OTP) is: <strong>{otp}</strong></p>"
                    f"<p>This code will expire in 10 minutes.</p>"
                    f"<p>If you did not request this, please ignore this email.</p>"
                    f"<br>"
                    f"<p>Best regards,<br>SKIN AI Team</p>"
                )
            }
            resend.Emails.send(params)
            print(f"[+] Real email sent successfully via Resend to {email}", flush=True)
        except Exception as e:
            print(f"[-] Failed to send real email via Resend: {str(e)}", flush=True)
            print(f"\n[{datetime.datetime.utcnow()}] EMAIL MOCK -> Sent OTP {otp} to {email}\n", flush=True)
    else:
        print(f"\n[{datetime.datetime.utcnow()}] EMAIL MOCK -> Sent OTP {otp} to {email}\n", flush=True)
    
    return jsonify({
        'message': 'If the email is registered, an OTP has been sent.'
    }), 200

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')
    
    if not email or not otp:
        return jsonify({'error': 'Missing data', 'message': 'Email and OTP are required.'}), 400
        
    stored_data = otp_store.get(email)
    if not stored_data:
        return jsonify({'error': 'Invalid request', 'message': 'No OTP requested for this email.'}), 400
        
    if datetime.datetime.utcnow() > stored_data['expires_at']:
        del otp_store[email]
        return jsonify({'error': 'Expired', 'message': 'OTP has expired. Please request a new one.'}), 400
        
    if stored_data['otp'] != otp:
        return jsonify({'error': 'Invalid OTP', 'message': 'The OTP entered is incorrect.'}), 400
        
    return jsonify({'message': 'OTP verified successfully.'}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')
    new_password = data.get('newPassword')
    
    if not all([email, otp, new_password]):
        return jsonify({'error': 'Missing data', 'message': 'Email, OTP, and new password are required.'}), 400
        
    stored_data = otp_store.get(email)
    if not stored_data or stored_data['otp'] != otp or datetime.datetime.utcnow() > stored_data['expires_at']:
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid or expired OTP.'}), 401
        
    user_doc = get_user_by_email(email)
    if not user_doc:
        return jsonify({'error': 'Not found', 'message': 'User not found.'}), 404
        
    hashed_pw = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user_doc.reference.update({'password_hash': hashed_pw})
    del otp_store[email]
    
    return jsonify({'message': 'Password has been reset successfully.'}), 200

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    data = request.get_json()
    token = data.get('token')
    
    if not token:
        return jsonify({'error': 'Missing token', 'message': 'Google credential token is required.'}), 400
        
    try:
        google_client_id = current_app.config.get("GOOGLE_CLIENT_ID") or os.environ.get("GOOGLE_CLIENT_ID")
        
        t0 = time.perf_counter()
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), google_client_id)
        duration = (time.perf_counter() - t0) * 1000
        if hasattr(g, 'timing_metrics'):
            g.timing_metrics['google_token_verification_duration_ms'] = duration
            
        email = idinfo.get('email')
        name = idinfo.get('name')
        
        if not email:
            return jsonify({'error': 'Invalid token', 'message': 'Google token did not contain an email address.'}), 400
            
        user_doc = get_user_by_email(email)
        
        if not user_doc:
            new_user = {
                'name': name,
                'email': email,
                'authProvider': 'google',
                'created_at': datetime.datetime.utcnow().isoformat()
            }
            t1 = time.perf_counter()
            doc_ref = users_collection.document()
            doc_ref.set(new_user)
            user_doc = doc_ref.get()
            duration_fs = (time.perf_counter() - t1) * 1000
            if hasattr(g, 'timing_metrics'):
                g.timing_metrics['firestore_duration_ms'] = g.timing_metrics.get('firestore_duration_ms', 0) + duration_fs
            
        user = serialize_doc(user_doc)
        user_data = user_doc.to_dict() if hasattr(user_doc, 'to_dict') else user
        user['consent_required'] = not check_user_consent(user_data)
            
        jwt_token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, current_app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'message': 'Logged in successfully with Google',
            'token': jwt_token,
            'user': user
        }), 200
        
    except ValueError as e:
        return jsonify({
            'error': 'Unauthorized',
            'error_type': 'invalid_token',
            'message': f'Invalid Google token: {str(e)}'
        }), 401
    except (google_exceptions.TransportError, requests.exceptions.RequestException) as e:
        return jsonify({
            'error': 'Google authentication service unavailable',
            'error_type': 'google_auth_unavailable',
            'message': 'Google authentication service is currently unreachable from this environment. Please sign in with email and password.'
        }), 503
    except Exception as e:
        err_msg = str(e)
        if 'certs' in err_msg or 'TransportError' in str(type(e)) or 'connection' in err_msg.lower():
            return jsonify({
                'error': 'Google authentication service unavailable',
                'error_type': 'google_auth_unavailable',
                'message': 'Google authentication service is currently unreachable from this environment. Please sign in with email and password.'
            }), 503
        return jsonify({
            'error': 'Server error',
            'error_type': 'server_error',
            'message': 'An unexpected authentication error occurred. Please try again or use email and password.'
        }), 500

@auth_bp.route('/consent', methods=['POST'])
def record_consent():
    """
    Dedicated endpoint to record one-time consent for authenticated users
    (Google Sign-In users or existing email/password users lacking consent records).
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required.'}), 401
        
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Unauthorized', 'message': 'Token has expired.'}), 401
    except Exception:
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid token.'}), 401
        
    data = request.get_json() or {}
    terms_accepted = data.get('terms_accepted')
    medical_disclaimer_acknowledged = data.get('medical_disclaimer_acknowledged')
    image_processing_authorized = data.get('image_processing_authorized')
    
    if not (terms_accepted is True and medical_disclaimer_acknowledged is True and image_processing_authorized is True):
        return jsonify({
            'error': 'Consent required',
            'message': 'You must accept the Terms of Service, acknowledge the Medical Disclaimer, and authorize Cloud Image Processing.'
        }), 400
        
    user_ref = users_collection.document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return jsonify({'error': 'Not found', 'message': 'User not found.'}), 404
        
    from constants.policies import (
        POLICY_VERSION, TERMS_VERSION, PRIVACY_VERSION,
        MEDICAL_DISCLAIMER_VERSION, IMAGE_PROCESSING_CONSENT_VERSION
    )
    
    server_utc_timestamp = datetime.datetime.utcnow().isoformat()
    consent_method = data.get('consent_method', 'account_onboarding')
    
    consents_record = {
        'terms_accepted': True,
        'medical_disclaimer_acknowledged': True,
        'image_processing_authorized': True,
        'accepted_at': server_utc_timestamp,
        'recorded_at': server_utc_timestamp,
        'policy_version': POLICY_VERSION,
        'terms_version': TERMS_VERSION,
        'privacy_version': PRIVACY_VERSION,
        'medical_disclaimer_version': MEDICAL_DISCLAIMER_VERSION,
        'image_processing_consent_version': IMAGE_PROCESSING_CONSENT_VERSION,
        'consent_method': consent_method
    }
    
    user_ref.update({'consents': consents_record})
    updated_doc = user_ref.get()
    updated_user = serialize_doc(updated_doc)
    updated_user.pop('password_hash', None)
    updated_user['consent_required'] = False
    
    return jsonify({
        'message': 'Consent recorded successfully',
        'user': updated_user,
        'policy_version': POLICY_VERSION
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """
    Returns the current authenticated user profile and authoritative consent status.
    Used on app startup and session restore.
    """
    user_data = current_user.copy()
    user_data.pop('password_hash', None)
    user_data['consent_required'] = not check_user_consent(user_data)
    return jsonify({
        'user': user_data
    }), 200

