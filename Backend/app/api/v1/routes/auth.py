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
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant_owner_session import RestaurantOwnerSession
from app.schemas.auth import (
    OwnerLoginRequest,
    OwnerLoginResponse,
    OwnerRegisterRequest,
    OwnerRegisterResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


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
    access_token = create_access_token(str(owner.id))

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
    access_token = create_access_token(str(owner.id))

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

    sessions = (
        db.query(RestaurantOwnerSession)
        .filter(RestaurantOwnerSession.revoked_at.is_(None))
        .all()
    )

    session = None

    for item in sessions:
        if verify_refresh_token(
            refresh_token,
            item.refresh_token_hash,
        ):
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

    access_token = create_access_token(str(owner.id))

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

    # Find the active session belonging to this refresh token.
    sessions = (
        db.query(RestaurantOwnerSession)
        .filter(
            RestaurantOwnerSession.revoked_at.is_(None)
        )
        .all()
    )

    session = None

    for item in sessions:
        if verify_refresh_token(
            refresh_token,
            item.refresh_token_hash,
        ):
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
        "is_active": current_owner.is_active,
        "is_verified": current_owner.is_verified,
    }