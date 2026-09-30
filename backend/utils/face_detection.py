
import os
import cv2
import numpy as np
from PIL import Image
import io


# ── DNN Model paths ──
_MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
_PROTOTXT = os.path.join(_MODELS_DIR, "deploy.prototxt")
_CAFFEMODEL = os.path.join(_MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")
DNN_CONFIDENCE_THRESHOLD = 0.60
_face_net = None

def _load_face_net():
    global _face_net
    if _face_net is not None:
        return _face_net
    
    if os.path.exists(_PROTOTXT) and os.path.exists(_CAFFEMODEL):
        _face_net = cv2.dnn.readNetFromCaffe(_PROTOTXT, _CAFFEMODEL)
        print("[+] DNN face detector loaded successfully.")
    else:
        print(f"[-] DNN model files not found at: {_MODELS_DIR}")
        print("[!] Face detection will be unavailable.")
    
    return _face_net


def detect_face_with_boxes(file_storage):
    """
    Detects faces and returns (has_face, face_count, face_msg, face_boxes).
    Each box in face_boxes is a dict:
      {'box': (x1, y1, x2, y2), 'confidence': float, 'is_partial': bool}
    """
    try:
        file_storage.seek(0)
        image_bytes = file_storage.read()
        file_storage.seek(0)  # Reset for downstream processing
        pil_image = Image.open(io.BytesIO(image_bytes))
        pil_image = pil_image.convert("RGB")
        img_array = np.array(pil_image)
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        (h, w) = img_bgr.shape[:2]
        
        face_boxes = []

        # ── Try DNN-based detection (primary, high accuracy) ──
        net = _load_face_net()
        
        if net is not None:
            blob = cv2.dnn.blobFromImage(
                cv2.resize(img_bgr, (300, 300)),
                scalefactor=1.0,
                size=(300, 300),
                mean=(104.0, 177.0, 123.0),
                swapRB=False,
                crop=False
            )
            
            net.setInput(blob)
            detections = net.forward()
            face_count = 0
            best_confidence = 0.0
            
            for i in range(detections.shape[2]):
                confidence = float(detections[0, 0, i, 2])
                if confidence > DNN_CONFIDENCE_THRESHOLD:
                    face_count += 1
                    best_confidence = max(best_confidence, confidence)
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    x1, y1, x2, y2 = box.astype("int")
                    x1 = max(0, x1)
                    y1 = max(0, y1)
                    x2 = min(w, x2)
                    y2 = min(h, y2)

                    # Determine if framing is partial/profile (boundary truncation)
                    # When face bounding box touches or is right against frame borders:
                    is_partial = (
                        x1 <= max(4, int(0.02 * w)) or
                        y1 <= max(4, int(0.02 * h)) or
                        x2 >= min(w - 4, int(0.98 * w)) or
                        y2 >= min(h - 4, int(0.98 * h))
                    )
                    face_boxes.append({
                        'box': (x1, y1, x2, y2),
                        'confidence': confidence,
                        'is_partial': is_partial
                    })
            
            if face_count == 0:
                return False, 0, (
                    "No human face detected in the image. "
                    "Please upload a clear photo of your face for accurate acne analysis."
                ), []
            
            return True, face_count, (
                f"Face detected successfully "
                f"({face_count} face(s), confidence: {best_confidence:.0%})."
            ), face_boxes
        
        # ── Fallback: Haar Cascade (if DNN model files are missing) ──
        print("[!] Falling back to Haar Cascade face detection.")
        return _haar_cascade_fallback(img_bgr)
        
    except Exception as e:
        raise ValueError(f"Face detection failed: {str(e)}")


def detect_face(file_storage):
    """
    Backward-compatible 3-tuple return for callers and test fixtures.
    """
    has_face, face_count, face_msg, _ = detect_face_with_boxes(file_storage)
    return has_face, face_count, face_msg


def _haar_cascade_fallback(img_bgr):
    (h, w) = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    
    if face_cascade.empty():
        return True, 0, "Face detection unavailable — proceeding with analysis.", []
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.05,
        minNeighbors=8,
        minSize=(80, 80),
        flags=cv2.CASCADE_SCALE_IMAGE
    )
    
    face_count = len(faces)
    face_boxes = []
    for (x, y, fw, fh) in faces:
        x1, y1, x2, y2 = x, y, x + fw, y + fh
        is_partial = (
            x1 <= max(4, int(0.02 * w)) or
            y1 <= max(4, int(0.02 * h)) or
            x2 >= min(w - 4, int(0.98 * w)) or
            y2 >= min(h - 4, int(0.98 * h))
        )
        face_boxes.append({
            'box': (x1, y1, x2, y2),
            'confidence': 0.85,
            'is_partial': is_partial
        })
    
    if face_count == 0:
        return False, 0, (
            "No human face detected in the image. "
            "Please upload a clear photo of your face for accurate acne analysis."
        ), []
    
    return True, face_count, f"Face detected ({face_count} face(s) found).", face_boxes

