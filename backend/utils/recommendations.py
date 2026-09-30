SEVERITY_CLASSES = [
    "Mild Acne",
    "Moderate Acne",
    "Severe Acne",
    "Very Severe Acne"
]
RECOMMENDATIONS = {
    "Clear Skin": {
        "summary": "Your skin appears clear with minimal visible blemishes detected.",
        "tips": [
            "Maintain your current skincare routine with a gentle cleanser twice daily.",
            "Apply a broad-spectrum SPF 30+ sunscreen every morning.",
            "Keep skin hydrated with a lightweight non-comedogenic moisturizer.",
            "Avoid frequent face touching to help maintain a clean skin barrier."
        ],
        "products": "Gentle daily cleanser, lightweight moisturizer, broad-spectrum sunscreen.",
        "urgency": None
    },
    "Mild Acne": {
        "summary": "Mild blemishes detected. Minor blemishes that are commonly addressed through consistent, gentle skincare.",
        "tips": [
            "Cleanse gently twice daily with a mild, non-irritating cleanser.",
            "Apply a non-comedogenic, oil-free moisturizer to support skin barrier hydration.",
            "Avoid picking or squeezing blemishes to prevent irritation and barrier damage.",
            "Consult a board-certified dermatologist for personalized treatment recommendations."
        ],
        "products": "Gentle cleanser, non-comedogenic moisturizer, daily sunscreen.",
        "urgency": None
    },
    "Moderate Acne": {
        "summary": "Moderate blemishes detected across evaluated areas.",
        "tips": [
            "Maintain a consistent, gentle cleansing and moisturizing routine morning and night.",
            "Avoid harsh scrubs, abrasive sponges, or aggressive exfoliation that can aggravate inflammation.",
            "Keep hair and hands away from the face, and change pillowcases regularly.",
            "Consult a board-certified dermatologist if blemishes persist or cause discomfort."
        ],
        "products": "Gentle non-foaming cleanser, oil-free moisturizer, broad-spectrum SPF.",
        "urgency": None
    },
    "Severe Acne": {
        "summary": "Significant visible blemishes detected across evaluated areas.",
        "tips": [
            "Consult a board-certified dermatologist for clinical evaluation and personalized care.",
            "Use an ultra-gentle, fragrance-free cleanser to avoid stripping the skin.",
            "Do not attempt to squeeze or extract lesions to protect against scarring.",
            "Follow professional medical guidance regarding appropriate topical or systemic regimens."
        ],
        "products": "Ultra-gentle fragrance-free cleanser, dermatologist-recommended moisturizer.",
        "urgency": None
    },
    "Very Severe Acne": {
        "summary": "Extensive visible blemishes detected. Professional dermatological evaluation is advised.",
        "tips": [
            "Consult a board-certified dermatologist or healthcare specialist for formal clinical evaluation.",
            "Use only ultra-mild, non-irritating cleansers without abrasive agents.",
            "Avoid manipulating, picking, or scrubbing affected areas.",
            "Discuss personalized treatment plans directly with a medical provider."
        ],
        "products": "Ultra-mild, non-irritating skincare products as guided by a physician.",
        "urgency": None
    }
}


def get_recommendation(predicted_class):
    if predicted_class in RECOMMENDATIONS:
        return RECOMMENDATIONS[predicted_class]
    return {
        "summary": "Unable to determine specific recommendations. Please consult a dermatologist.",
        "tips": ["Consult a board-certified dermatologist for personalized advice."],
        "products": "Consult your dermatologist.",
        "urgency": "medium"
    }


def get_severity_index(predicted_class):
    try:
        return SEVERITY_CLASSES.index(predicted_class)
    except ValueError:
        return -1
