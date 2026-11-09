import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    COOKIE_SECURE,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    get_current_owner,
    hash_password,
    hash_refresh_token,
    verify_password,
    verify_refresh_token,
)
from app.db.database import get_db
from app.models.password_reset_token import PasswordResetToken
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant_owner_session import RestaurantOwnerSession
from app.schemas.auth import (
    ForgotPasswordOtpRequest,
    ForgotPasswordOtpRequestResponse,
    ForgotPasswordOtpVerifyRequest,
    ForgotPasswordOtpVerifyResponse,
    ForgotPasswordResetRequest,
    ForgotPasswordResetResponse,
    OwnerLoginRequest,
    OwnerLoginResponse,
    OwnerOtpRequest,
    OwnerOtpRequestResponse,
    OwnerOtpVerifyRequest,
    OwnerOtpVerifyResponse,
    OwnerRegisterRequest,
    OwnerRegisterResponse,
)
from app.services.owner_otp import verify_otp_request
from app.services.owner_otp_service import request_owner_otp
from app.services.password_reset_service import create_reset_token

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


def create_owner_auth_session(
    owner: RestaurantOwner,
    response: Response,
    db: Session,
) -> str:
    """Create the existing refresh session and set authentication cookies."""

    now = datetime.now(timezone.utc)

    refresh_token = generate_refresh_token()
    refresh_token_hash = hash_refresh_token(refresh_token)

    session = RestaurantOwnerSession(
        owner_id=owner.id,
        refresh_token_hash=refresh_token_hash,
        expires_at=now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    owner.last_login_at = now
    db.add(session)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    access_token = create_access_token(
        str(owner.id),
        owner.token_version
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return access_token



@router.post(
    "/register-owner",
    response_model=OwnerRegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_owner(
    request: OwnerRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    # 1. Check password confirmation
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    # 2. Check email already exists
    existing_email = (
        db.query(RestaurantOwner)
        .filter(RestaurantOwner.email == request.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # 3. Check phone already exists
    existing_phone = (
        db.query(RestaurantOwner)
        .filter(RestaurantOwner.phone == request.phone)
        .first()
    )

    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number is already registered",
        )

    # 4. Hash password
    password_hash = hash_password(request.password)

    # 5. Create owner
    owner = RestaurantOwner(
        name=request.name,
        email=request.email,
        phone=request.phone,
        password_hash=password_hash,
        is_verified=False,
        is_active=True,
    )

    db.add(owner)
    db.commit()
    db.refresh(owner)

    refresh_token = generate_refresh_token()

    refresh_token_hash = hash_refresh_token(refresh_token)

    session = RestaurantOwnerSession(
        owner_id=owner.id,
        refresh_token_hash=refresh_token_hash,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    db.add(session)
    db.commit()

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    # 6. Create access JWT
    access_token = create_access_token(
        str(owner.id),
        owner.token_version
    )

    # 7. Store JWT in HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    # 8. Return owner ID and access token
    return OwnerRegisterResponse(
        message="Owner registered successfully",
        owner_id=owner.id,
        access_token=access_token,
    )


@router.post(
    "/login",
    response_model=OwnerLoginResponse,
    status_code=status.HTTP_200_OK,
)
def login(
    request: OwnerLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    # 1. Find owner by email
    owner = (
        db.query(RestaurantOwner)
        .filter(RestaurantOwner.email == request.email)
        .first()
    )

    if not owner or not verify_password(request.password, owner.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # 2. Check if account is active
    if not owner.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or suspended",
        )

    # 3. Atomically update last login and create session
    owner.last_login_at = datetime.now(timezone.utc)

    refresh_token = generate_refresh_token()
    refresh_token_hash = hash_refresh_token(refresh_token)

    session = RestaurantOwnerSession(
        owner_id=owner.id,
        refresh_token_hash=refresh_token_hash,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    db.add(session)
    db.commit()

    # 5. Set refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    # 6. Create access JWT and set cookie
    access_token = create_access_token(
        str(owner.id),
        owner.token_version
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    # 7. Return response
    return OwnerLoginResponse(
        message="Login successful",
        owner_id=str(owner.id),
        access_token=access_token,
    )


@router.post("/refresh")
def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing",
        )

    # 1. Fast indexed lookup by SHA-256 hash (O(1))
    token_hash = hash_refresh_token(refresh_token)
    session = (
        db.query(RestaurantOwnerSession)
        .filter(
            RestaurantOwnerSession.refresh_token_hash == token_hash,
            RestaurantOwnerSession.revoked_at.is_(None),
        )
        .first()
    )

    # 2. Fallback for legacy unrevoked bcrypt-hashed sessions (if any)
    if not session:
        legacy_sessions = (
            db.query(RestaurantOwnerSession)
            .filter(
                RestaurantOwnerSession.revoked_at.is_(None),
                RestaurantOwnerSession.refresh_token_hash.startswith("$2"),
            )
            .all()
        )
        for item in legacy_sessions:
            if verify_refresh_token(refresh_token, item.refresh_token_hash):
                session = item
                break

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    now = datetime.now(timezone.utc)

    if session.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    owner = (
        db.query(RestaurantOwner)
        .filter(
            RestaurantOwner.id == session.owner_id,
            RestaurantOwner.is_active.is_(True),
        )
        .first()
    )

    if not owner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Owner account is inactive or does not exist",
        )

    access_token = create_access_token(
        str(owner.id),
        owner.token_version
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return {
        "message": "Access token refreshed successfully",
        "access_token": access_token,
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    refresh_token = request.cookies.get("refresh_token")

    # If there is no refresh token, the user is already logged out.
    if not refresh_token:
        response.delete_cookie(
            key="access_token",
            secure=COOKIE_SECURE,
            samesite="lax",
        )
        response.delete_cookie(
            key="refresh_token",
            secure=COOKIE_SECURE,
            samesite="lax",
        )

        return {
            "message": "Logged out successfully",
        }

    # 1. Fast indexed lookup by SHA-256 hash (O(1))
    token_hash = hash_refresh_token(refresh_token)
    session = (
        db.query(RestaurantOwnerSession)
        .filter(
            RestaurantOwnerSession.refresh_token_hash == token_hash,
            RestaurantOwnerSession.revoked_at.is_(None),
        )
        .first()
    )

    # 2. Fallback for legacy unrevoked bcrypt-hashed sessions (if any)
    if not session:
        legacy_sessions = (
            db.query(RestaurantOwnerSession)
            .filter(
                RestaurantOwnerSession.revoked_at.is_(None),
                RestaurantOwnerSession.refresh_token_hash.startswith("$2"),
            )
            .all()
        )
        for item in legacy_sessions:
            if verify_refresh_token(refresh_token, item.refresh_token_hash):
                session = item
                break

    # Revoke the matching refresh-token session.
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()

    # Remove authentication cookies from the browser.
    response.delete_cookie(
        key="access_token",
        secure=COOKIE_SECURE,
        samesite="lax",
    )

    response.delete_cookie(
        key="refresh_token",
        secure=COOKIE_SECURE,
        samesite="lax",
    )

    return {
        "message": "Logged out successfully",
    }


@router.get("/me")
def get_current_owner_profile(
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    return {
        "id": str(current_owner.id),
        "name": current_owner.name,
        "email": current_owner.email,
        "phone": current_owner.phone,
        "profile_image_url": None,
        "is_active": current_owner.is_active,
        "is_verified": current_owner.is_verified,
    }


@router.post(
    "/otp/request",
    response_model=OwnerOtpRequestResponse,
    status_code=status.HTTP_200_OK,
)
def request_login_otp(
    request: OwnerOtpRequest,
    db: Session = Depends(get_db),
):
    owner = (
        db.query(RestaurantOwner)
        .filter(
            RestaurantOwner.phone == request.phone,
            RestaurantOwner.is_active.is_(True),
            RestaurantOwner.is_deleted.is_(False),
        )
        .first()
    )

    if not owner:
        # Generic response prevents revealing account existence.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to send OTP to this phone number",
        )

    try:
        request_id = request_owner_otp(
            db=db,
            phone=owner.phone,
            purpose="LOGIN",
            language=request.language,
            owner_id=owner.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        )
    except Exception:
        logger.exception("OTP request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to send OTP. Please try again later.",
        )

    return OwnerOtpRequestResponse(
        message="If eligible, an OTP has been requested.",
        request_id=request_id,
    )


@router.post(
    "/otp/verify",
    response_model=OwnerOtpVerifyResponse,
    status_code=status.HTTP_200_OK,
)
def verify_login_otp(
    request: OwnerOtpVerifyRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    owner = (
        db.query(RestaurantOwner)
        .filter(
            RestaurantOwner.phone == request.phone,
            RestaurantOwner.is_active.is_(True),
            RestaurantOwner.is_deleted.is_(False),
        )
        .first()
    )
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    try:
        valid = verify_otp_request(
            db=db,
            request_id=request.request_id,
            phone=owner.phone,
            purpose="LOGIN",
            otp=request.otp,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify OTP. Please try again later.",
        )

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    access_token = create_owner_auth_session(
        owner=owner,
        response=response,
        db=db,
    )

    return OwnerOtpVerifyResponse(
        message="Login successful",
        owner_id=str(owner.id),
        access_token=access_token,
    )


@router.post(
    "/forgot-password/request-otp",
    response_model=ForgotPasswordOtpRequestResponse,
    status_code=status.HTTP_200_OK,
)
def forgot_password_request_otp(
    request: ForgotPasswordOtpRequest,
    db: Session = Depends(get_db),
):
    trimmed_phone = request.phone.strip()

    owner = (
        db.query(RestaurantOwner)
        .filter(
            RestaurantOwner.phone == trimmed_phone,
            RestaurantOwner.is_active.is_(True),
            RestaurantOwner.is_deleted.is_(False),
        )
        .first()
    )

    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered account found with this mobile number.",
        )

    try:
        request_id = request_owner_otp(
            db=db,
            phone=owner.phone,
            purpose="FORGOT_PASSWORD",
            language=request.language,
            owner_id=owner.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        )

    except Exception:
        logger.exception("Forgot password OTP request failed")

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to send OTP. Please try again later.",
        )

    return ForgotPasswordOtpRequestResponse(
        message="OTP sent successfully to your registered mobile number.",
        request_id=request_id,
    )


@router.post(
    "/forgot-password/verify-otp",
    response_model=ForgotPasswordOtpVerifyResponse,
    status_code=status.HTTP_200_OK,
)
def forgot_password_verify_otp(
    request: ForgotPasswordOtpVerifyRequest,
    db: Session = Depends(get_db),
):
    trimmed_phone = request.phone.strip()

    owner = (
        db.query(RestaurantOwner)
        .filter(
            RestaurantOwner.phone == trimmed_phone,
            RestaurantOwner.is_active.is_(True),
            RestaurantOwner.is_deleted.is_(False),
        )
        .first()
    )

    if not owner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    try:
        valid = verify_otp_request(
            db=db,
            request_id=request.request_id,
            phone=owner.phone,
            purpose="FORGOT_PASSWORD",
            otp=request.otp,
        )

    except Exception:
        logger.exception("Forgot password OTP verification failed")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify OTP. Please try again later.",
        )

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    try:
        reset_token, expires_in = create_reset_token(
            db=db,
            owner_id=owner.id,
        )

    except Exception:
        db.rollback()
        logger.exception("Reset token creation failed")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate password reset token.",
        )

    return ForgotPasswordOtpVerifyResponse(
        message="OTP verified successfully",
        reset_token=reset_token,
        expires_in=expires_in,
    )


@router.post(
    "/forgot-password/reset",
    response_model=ForgotPasswordResetResponse,
    status_code=status.HTTP_200_OK,
)
def forgot_password_reset(
    request: ForgotPasswordResetRequest,
    db: Session = Depends(get_db),
):
    # 1. Validate password confirmation.
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )

    # 2. Hash the reset token.
    token_hash = hashlib.sha256(
        request.reset_token.encode("utf-8")
    ).hexdigest()

    now = datetime.now(timezone.utc)

    try:
        # 3. Lock the reset-token record.
        reset_record = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
            .with_for_update()
            .first()
        )

        if not reset_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid, expired or already used reset token.",
            )

        # 4. Verify owner.
        owner = (
            db.query(RestaurantOwner)
            .filter(
                RestaurantOwner.id == reset_record.owner_id,
                RestaurantOwner.is_active.is_(True),
                RestaurantOwner.is_deleted.is_(False),
            )
            .with_for_update()
            .first()
        )

        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found.",
            )

        # 5. Hash new password.
        try:
            owner.password_hash = hash_password(
                request.new_password
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )

        # 6. Invalidate access tokens.
        owner.token_version += 1

        # 7. Revoke every existing refresh session.
        db.query(RestaurantOwnerSession).filter(
            RestaurantOwnerSession.owner_id == owner.id,
            RestaurantOwnerSession.revoked_at.is_(None),
        ).update(
            {"revoked_at": now},
            synchronize_session=False,
        )

        # 8. Mark reset token as consumed.
        reset_record.used_at = now

        # 9. Commit everything together.
        db.commit()

        return ForgotPasswordResetResponse(
            message="Password reset successfully. Please login again."
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        logger.exception("Password reset failed")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to reset password. Please try again later.",
        )