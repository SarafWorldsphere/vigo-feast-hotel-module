
import logging

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from urllib.parse import unquote, urlparse

from app.core.config import (
    AWS_REGION,
    AWS_S3_BUCKET,
    S3_PRESIGNED_URL_EXPIRE_SECONDS,
)

logger = logging.getLogger(__name__)

_s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(
        signature_version="s3v4",
        s3={"addressing_style": "virtual"},
    ),
)


def extract_s3_key(value: str | None) -> str | None:
    """
    Extract the clean S3 object key from any format:
    - Raw key: 'restaurants/xxx/menu/yyy.jpg'
    - Leading slash: '/restaurants/xxx/menu/yyy.jpg'
    - Virtual-hosted URL: 'https://vigofeast-media.s3.ap-south-2.amazonaws.com/restaurants/xxx/menu/yyy.jpg?params'
    - Path-style URL: 'https://s3.ap-south-2.amazonaws.com/vigofeast-media/restaurants/xxx/menu/yyy.jpg'
    - S3 URI: 's3://vigofeast-media/restaurants/xxx/menu/yyy.jpg'
    """
    if not value or not isinstance(value, str):
        return None
    val = value.strip()
    if not val:
        return None

    # Handle s3:// URIs
    if val.startswith("s3://"):
        without_scheme = val[5:]
        if without_scheme.startswith(f"{AWS_S3_BUCKET}/"):
            val = without_scheme[len(AWS_S3_BUCKET) + 1 :]
        else:
            parts = without_scheme.split("/", 1)
            val = parts[1] if len(parts) > 1 else parts[0]

    # Handle http:// and https:// URLs
    elif val.startswith("http://") or val.startswith("https://"):
        parsed = urlparse(val)
        path = unquote(parsed.path).lstrip("/")
        # If path-style URL (e.g. /bucket-name/restaurants/...)
        if path.startswith(f"{AWS_S3_BUCKET}/"):
            path = path[len(AWS_S3_BUCKET) + 1 :]
        val = path
    else:
        # Strip query parameters if present
        if "?" in val:
            val = val.split("?")[0]
        val = unquote(val).lstrip("/")

    # Normalize slashes
    val = val.strip("/")

    # Only return keys that belong to this application's namespaces
    if val.startswith("restaurants/") or val.startswith("registration-documents/"):
        return val

    return None


def generate_upload_url(
    object_key: str,
    content_type: str,
) -> str:
    clean_key = extract_s3_key(object_key) or object_key
    return _s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": AWS_S3_BUCKET,
            "Key": clean_key,
            "ContentType": content_type,
        },
        ExpiresIn=S3_PRESIGNED_URL_EXPIRE_SECONDS,
    )


def generate_view_url(object_key: str) -> str:
    clean_key = extract_s3_key(object_key) or object_key
    return _s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": AWS_S3_BUCKET,
            "Key": clean_key,
        },
        ExpiresIn=S3_PRESIGNED_URL_EXPIRE_SECONDS,
    )


def verify_object_exists(object_key: str) -> dict:
    clean_key = extract_s3_key(object_key) or object_key
    return _s3.head_object(
        Bucket=AWS_S3_BUCKET,
        Key=clean_key,
    )


def get_object_metadata(object_key: str) -> dict:
    clean_key = extract_s3_key(object_key) or object_key
    return _s3.head_object(
        Bucket=AWS_S3_BUCKET,
        Key=clean_key,
    )


def delete_object(object_key: str) -> None:
    """Delete an object from the S3 bucket."""
    if not object_key:
        return

    _s3.delete_object(
        Bucket=AWS_S3_BUCKET,
        Key=object_key,
    )


def delete_s3_object(object_key: str) -> bool:
    """
    Delete an object from the configured S3 bucket.
    Extracts the clean key (handling full URLs, presigned URLs, leading slashes).
    Returns True if an existing S3 object was successfully deleted, False otherwise.
    """
    clean_key = extract_s3_key(object_key)
    if not clean_key:
        logger.warning(
            "Skipping S3 deletion for non-S3 key: %r", object_key
        )
        return False

    # Check if object actually exists before attempting deletion
    try:
        _s3.head_object(Bucket=AWS_S3_BUCKET, Key=clean_key)
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code in ("404", "NoSuchKey"):
            logger.warning(
                "S3 object does not exist in bucket '%s': %s (original: %r)",
                AWS_S3_BUCKET,
                clean_key,
                object_key,
            )
            return False
        logger.exception("Error checking S3 object %s: %s", clean_key, e)
        raise

    try:
        logger.info(
            "Deleting S3 object: Bucket=%s, Key=%s (original: %r)",
            AWS_S3_BUCKET,
            clean_key,
            object_key,
        )
        _s3.delete_object(
            Bucket=AWS_S3_BUCKET,
            Key=clean_key,
        )
        logger.info("Successfully deleted S3 object: %s", clean_key)
        return True
    except ClientError:
        logger.exception("Failed to delete S3 object: %s", clean_key)
        raise

