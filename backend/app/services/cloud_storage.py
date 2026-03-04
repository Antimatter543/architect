import base64
import uuid
import logging
from google.cloud import storage
from app.config import GCS_BUCKET_NAME

logger = logging.getLogger(__name__)
_client = None


def _get_client():
    global _client
    if _client is None:
        _client = storage.Client()
    return _client


def upload_image_b64(image_b64: str, session_id: str, prefix: str = "designs") -> str | None:
    try:
        image_data = base64.b64decode(image_b64)
        client = _get_client()
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob_name = f"{prefix}/{session_id}/{uuid.uuid4()}.jpg"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(image_data, content_type="image/jpeg")
        blob.make_public()
        return blob.public_url
    except Exception as e:
        logger.error(f"GCS upload failed: {e}")
        return None
