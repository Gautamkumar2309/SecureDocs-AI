from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_verification_token,
)
from app.services.email_service import (
    send_verification_email as send_verification_email_message,
    send_password_reset_email,
)
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    LogoutRequest,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


def revoke_user_refresh_tokens(db: Session, user_id: int) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.is_revoked.is_(False),
    ).update(
        {"is_revoked": True},
        synchronize_session=False,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    verification_token = create_verification_token()

    verification_token_expires_at = (
        datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(hours=24)
    )

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role="EMPLOYEE",
        verification_token=verification_token,
        verification_token_expires_at=verification_token_expires_at,
    )

    try:
        db.add(new_user)

        # Send the verification email before committing the account.
        send_verification_email_message(
            new_user.email,
            verification_token,
        )

        db.commit()
        db.refresh(new_user)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to create account or send verification email. "
                "Please try again."
            ),
        )

    return new_user


@router.post("/login")
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    email = login_data.email
    password = login_data.password

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(
        password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
            "type": "access",
        }
    )

    refresh_token = create_refresh_token(
        {
            "sub": str(user.id),
            "role": user.role,
            "type": "access",
        }
    )

    refresh_expires_at = (
        datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    stored_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=refresh_expires_at,
        is_revoked=False,
    )

    try:
        db.add(stored_token)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create login session",
        )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.post("/refresh")
def refresh_access_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    refresh_token = request.refresh_token

    try:
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")

    if not user_id or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    try:
        stored_token = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token == refresh_token,
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked.is_(False),
            )
            .with_for_update()
            .first()
        )

        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is revoked or not recognized",
            )

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        if stored_token.expires_at <= now:
            stored_token.is_revoked = True
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired",
            )

        user = db.query(User).filter(User.id == user_id).first()

        if not user or not user.is_active or not user.is_verified:
            stored_token.is_revoked = True
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is unavailable",
            )

        new_access_token = create_access_token(
            {
                "sub": str(user.id),
                "role": user.role,
            }
        )

        new_refresh_token = create_refresh_token(
            {
                "sub": str(user.id),
                "type": "refresh",
            }
        )

        new_expires_at = (
            datetime.now(timezone.utc).replace(tzinfo=None)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )

        new_stored_token = RefreshToken(
            user_id=user.id,
            token=new_refresh_token,
            expires_at=new_expires_at,
            is_revoked=False,
        )

        # Revoke the old token and save the new token.
        stored_token.is_revoked = True
        db.add(new_stored_token)
        db.commit()

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to rotate refresh token",
        )

    return {
        "message": "Tokens refreshed successfully",
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout_user(
    request: LogoutRequest,
    db: Session = Depends(get_db),
):
    refresh_token = request.refresh_token

    try:
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")

    if not user_id or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    try:
        stored_token = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token == refresh_token,
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked.is_(False),
            )
            .first()
        )

        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is already revoked or unrecognized",
            )

        stored_token.is_revoked = True
        db.commit()

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to log out",
        )

    return {"message": "Logout successful"}

@router.get("/verify-email")
def verify_email(
    token: str,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.verification_token == token)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if (
        not user.verification_token_expires_at
        or user.verification_token_expires_at < now
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired",
        )

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify email",
        )

    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification_email(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    generic_message = (
        "If the account exists and needs verification, "
        "a verification email will be sent."
    )

    user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if not user or user.is_verified or not user.is_active:
        return {"message": generic_message}

    verification_token = create_verification_token()

    verification_token_expires_at = (
        datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(hours=24)
    )

    user.verification_token = verification_token
    user.verification_token_expires_at = verification_token_expires_at

    try:
        db.commit()
        send_verification_email_message(
            user.email,
            verification_token,
        )
    except Exception:
        db.rollback()

        # Invalidate the token if email delivery fails.
        try:
            db.refresh(user)
            user.verification_token = None
            user.verification_token_expires_at = None
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to send verification email. "
                "Please try again later."
            ),
        )

    return {"message": generic_message}

@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = request.email

    generic_message = (
        "If the email exists, a password reset link will be sent."
    )

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not user.is_active:
        return {"message": generic_message}

    reset_token = create_verification_token()

    reset_token_expires_at = (
        datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(minutes=30)
    )

    user.password_reset_token = reset_token
    user.password_reset_token_expires_at = reset_token_expires_at

    try:
        db.commit()

        send_password_reset_email(
            user.email,
            reset_token,
        )

    except Exception:
        db.rollback()

        # Invalidate the reset token if email delivery fails.
        try:
            db.refresh(user)
            user.password_reset_token = None
            user.password_reset_token_expires_at = None
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to process the password reset request. Please try again later.",
        )

    return {"message": generic_message}

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    token = request.token
    new_password = request.new_password

    user = (
        db.query(User)
        .filter(User.password_reset_token == token)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if (
        not user.password_reset_token_expires_at
        or user.password_reset_token_expires_at < now
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired",
        )

    user.hashed_password = hash_password(new_password)
    user.password_reset_token = None
    user.password_reset_token_expires_at = None

    try:
        # Password change invalidates all stored refresh sessions.
        revoke_user_refresh_tokens(db, user.id)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to reset password",
        )

    return {"message": "Password reset successful"}