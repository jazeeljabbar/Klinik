
import numpy as np
from PIL import Image
import io
MODEL_INPUT_SIZE = (224, 224)


def preprocess_image(file_storage):
    try:
        image_bytes = file_storage.read()
        image = Image.open(io.BytesIO(image_bytes))
        image = image.convert("RGB")
        image = image.resize(MODEL_INPUT_SIZE, Image.LANCZOS)
        img_array = np.array(image, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
        
    except Exception as e:
        raise ValueError(f"Failed to preprocess image: {str(e)}")
