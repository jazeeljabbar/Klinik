from functools import wraps
from flask import request, jsonify, current_app
import jwt
from models import users_collection, serialize_doc
import traceback

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'error': 'Unauthorized', 'message': 'Token is missing'}), 401
            
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            user_doc = users_collection.document(data['user_id']).get()
            
            if not user_doc.exists:
                return jsonify({'error': 'Unauthorized', 'message': 'User not found'}), 401
                
            current_user = serialize_doc(user_doc)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Unauthorized', 'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Unauthorized', 'message': 'Invalid token'}), 401
        except Exception as e:
            traceback.print_exc()
            return jsonify({'error': 'Unauthorized', 'message': 'Invalid token format'}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated
