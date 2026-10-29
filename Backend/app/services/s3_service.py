
import boto3
from botocore.config import Config

from app.core.config import (
    AWS_REGION,
    AWS_S3_BUCKET,
    S3_PRESIGNED_URL_EXPIRE_SECONDS,
)

_s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(
        signature_version="s3v4",
        s3={"addressing_style": "virtual"},
    ),
)



def generate_upload_url(
    object_key: str,
    content_type: str,
) -> str:
    return _s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": AWS_S3_BUCKET,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=S3_PRESIGNED_URL_EXPIRE_SECONDS,
    )


def generate_view_url(object_key: str) -> str:
    return _s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": AWS_S3_BUCKET,
            "Key": object_key,
        },
        ExpiresIn=S3_PRESIGNED_URL_EXPIRE_SECONDS,
    )


def verify_object_exists(object_key: str) -> dict:
    return _s3.head_object(
        Bucket=AWS_S3_BUCKET,
        Key=object_key,
    )


def get_object_metadata(object_key: str) -> dict:
    return _s3.head_object(
        Bucket=AWS_S3_BUCKET,
        Key=object_key,
    )

