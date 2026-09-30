"""
Canonical Policy Versions and Consent Declarations for Klinik
"""

POLICY_VERSION = "2026-09-23"
TERMS_VERSION = "v1.1"
PRIVACY_VERSION = "v1.1"
MEDICAL_DISCLAIMER_VERSION = "v1.1"
IMAGE_PROCESSING_CONSENT_VERSION = "v1.1"

MEDICAL_DISCLAIMER_TEXT = (
    "I understand that Klinik is an educational, non-diagnostic skin assessment tool "
    "and does not provide professional healthcare, medical diagnosis, or prescription treatment."
)

IMAGE_CONSENT_TEXT = (
    "I authorize Klinik to upload and process facial images using cloud infrastructure "
    "for automated skin assessments, and to store them as pending or account check-in records."
)

GUEST_DISCLOSURE_TEXT = (
    "When you analyze a photo, your facial image will be uploaded to cloud infrastructure "
    "(Google Cloud Storage) and stored as a pending scan record to perform quality verification "
    "and automated skin analysis. As an anonymous visitor, unlinked scans remain stored on cloud "
    "infrastructure until purged according to retention policies."
)
