import logging
from urllib.parse import quote, unquote, urlparse

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import (
    AWS_REGION,
    AWS_S3_BUCKET,
    AWS_S3_PUBLIC_BASE_URL,
    S3_PRESIGNED_URL_EXPIRE_SECONDS,
)

logger = logging.getLogger(__name__)

PUBLIC_MEDIA_PREFIXES = ("restaurants/",)
PRIVATE_MEDIA_PREFIXES = ("registration-documents/",)

_s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(
        signature_version="s3v4",
        s3={"addressing_style": "virtual"},
    ),
)


def _is_bucket_url(parsed) -> bool:
    host = (parsed.hostname or "").lower()
    if not host:
        return False

    bucket_lower = AWS_S3_BUCKET.lower()
    public_host = (urlparse(AWS_S3_PUBLIC_BASE_URL).hostname or "").lower()
    if public_host and host == public_host:
        return True

    # Virtual-hosted S3 URLs: <bucket>.s3.<region>.amazonaws.com or <bucket>.s3.amazonaws.com
    if host.startswith(f"{bucket_lower}.s3") and host.endswith(".amazonaws.com"):
        return True

    # Path-style S3 URLs: s3.<region>.amazonaws.com/<bucket>/... or s3.amazonaws.com/<bucket>/...
    path = unquote(parsed.path).lstrip("/")
    if (
        host == "s3.amazonaws.com"
        or (host.startswith("s3.") and host.endswith(".amazonaws.com"))
    ) and path.startswith(f"{AWS_S3_BUCKET}/"):
        return True

    return False


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
            return None

    # Handle http:// and https:// URLs belonging to our S3 bucket / public media domain
    elif val.startswith("http://") or val.startswith("https://"):
        parsed = urlparse(val)
        if not _is_bucket_url(parsed):
            return None
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
    if val.startswith(PUBLIC_MEDIA_PREFIXES) or val.startswith(PRIVATE_MEDIA_PREFIXES):
        return val

    return None


def is_public_media_key(object_key: str | None) -> bool:
    clean_key = extract_s3_key(object_key)
    return bool(clean_key and clean_key.startswith(PUBLIC_MEDIA_PREFIXES))


def generate_public_url(object_key: str) -> str:
    """
    Build the permanent direct public URL for objects under public prefixes (restaurants/*).
    Raises ValueError for private prefixes such as registration-documents/*.
    """
    clean_key = extract_s3_key(object_key)
    if not clean_key or not clean_key.startswith(PUBLIC_MEDIA_PREFIXES):
        raise ValueError(
            f"Object key is not eligible for public URL access: {object_key!r}"
        )

    base_url = AWS_S3_PUBLIC_BASE_URL.rstrip("/")
    encoded_key = quote(clean_key, safe="/")
    return f"{base_url}/{encoded_key}"


def resolve_media_url(value: str | None) -> str | None:
    """
    Resolve a stored image key or URL for public storefront/menu responses:
    - 'restaurants/...' keys (including legacy S3 URLs/URIs) -> permanent direct S3 public URL
    - 'registration-documents/...' -> None (never expose private documents as public URLs)
    - External URLs / sample keys (e.g., Pexels URL, 'paneer') -> returned unchanged
    """
    if not value or not isinstance(value, str):
        return None
    val = value.strip()
    if not val:
        return None

    clean_key = extract_s3_key(val)
    if clean_key:
        if clean_key.startswith(PUBLIC_MEDIA_PREFIXES):
            return generate_public_url(clean_key)
        logger.warning(
            "Blocked public URL resolution for private media key: %s",
            clean_key,
        )
        return None

    return val


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
    if clean_key.startswith(PUBLIC_MEDIA_PREFIXES):
        return generate_public_url(clean_key)
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
