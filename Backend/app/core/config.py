import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
ALLOW_DEMO_REFUND_CREATION = os.getenv("ALLOW_DEMO_REFUND_CREATION", "false").lower() == "true"

AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "vigofeast-media")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-2")
S3_PRESIGNED_URL_EXPIRE_SECONDS = int(
    os.getenv("S3_PRESIGNED_URL_EXPIRE_SECONDS", "300")
)
