from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import uuid
import random
import datetime
from pydantic import BaseModel, EmailStr
import httpx
from config import settings

from database import get_db
from models.user import User, GuestSession
from core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    timedelta,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from services.email_service import (
    send_verification_otp_task,
    send_login_otp_task,
    send_welcome_email_task,
    send_password_reset_otp_task,
)
from services.sms_service import send_sms_otp, format_indian_phone_number

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login-password")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login-password", auto_error=False)


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str

class VerifyOtpSchema(BaseModel):
    email: str
    otp: str

class ResendOtpSchema(BaseModel):
    email: str
    purpose: str  # "signup" | "login"

class LoginSchema(BaseModel):
    email: str
    password: str

class LoginOtpRequestSchema(BaseModel):
    email: str

class LoginOtpVerifySchema(BaseModel):
    email: str
    otp: str

class ForgotPasswordSchema(BaseModel):
    email: str

class ResetPasswordSchema(BaseModel):
    email: str
    otp: str
    new_password: str

class GoogleTokenSchema(BaseModel):
    token: str

class MobileOtpRequestSchema(BaseModel):
    phone_number: str

class MobileOtpVerifySchema(BaseModel):
    phone_number: str
    otp: str


# ─── Helper ───────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"

def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "phone_number": user.phone_number,
        "api_key": user.api_key,
        "is_admin": user.is_admin,
        "is_verified": user.is_verified,
    }


# ─── Guest Session ────────────────────────────────────────────────────────────

@router.get("/session")
async def get_session(db: Session = Depends(get_db)):
    """Issue an anonymous guest session ID."""
    session_id = str(uuid.uuid4())
    db.add(GuestSession(session_id=session_id))
    db.commit()
    return {"session_id": session_id}


# ─── Signup / Registration ────────────────────────────────────────────────────

@router.post("/register")
async def register(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    """
    Register a new account.
    Sends a 6-digit OTP verification email immediately after signup.
    """
    db_user = db.query(User).filter(User.email == user.email).first()

    if db_user and db_user.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered and verified.")

    otp = _generate_otp()
    expiry = datetime.datetime.utcnow() + timedelta(minutes=15)

    if db_user:
        # Re-registration attempt before verifying — refresh credentials & OTP
        db_user.hashed_password = get_password_hash(user.password)
        db_user.verification_otp = otp
        db_user.verification_otp_expires_at = expiry
    else:
        db_user = User(
            email=user.email,
            hashed_password=get_password_hash(user.password),
            is_verified=False,
            verification_otp=otp,
            verification_otp_expires_at=expiry,
            is_admin=False,
        )
        db.add(db_user)

    db.commit()
    db.refresh(db_user)

    # Build verification link for one-click email verification
    verify_link = f"{request.base_url}api/auth/verify-link?email={db_user.email}&token={otp}"
    send_verification_otp_task.delay(db_user.email, otp, verify_link)

    return {
        "status": "verification_pending",
        "message": "A 6-digit verification code has been sent to your email. Enter it below to activate your account.",
        "email": db_user.email,
    }


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpSchema, db: Session = Depends(get_db)):
    """
    Verify the signup OTP.
    Returns a JWT access token on success so the user is immediately logged in.
    Also dispatches a welcome email.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")
    if not user.verification_otp or user.verification_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    if datetime.datetime.utcnow() > user.verification_otp_expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired. Request a new one.")

    user.is_verified = True
    user.verification_otp = None
    user.verification_otp_expires_at = None

    # First verified user on the platform becomes admin
    if db.query(User).filter(User.is_verified == True).count() <= 1:
        user.is_admin = True

    db.commit()

    # Fire welcome email asynchronously
    send_welcome_email_task.delay(user.email)

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


@router.get("/verify-link", response_class=HTMLResponse)
async def verify_link(email: str, token: str, db: Session = Depends(get_db)):
    """One-click email verification via link sent in the signup email."""
    user = db.query(User).filter(User.email == email).first()
    success = False
    message = ""

    if not user:
        message = "Account not found."
    elif user.is_verified:
        success = True
        message = "Your email is already verified!"
    elif not user.verification_otp or user.verification_otp != token:
        message = "Invalid or expired verification token."
    elif datetime.datetime.utcnow() > user.verification_otp_expires_at:
        message = "This verification link has expired. Please request a new code."
    else:
        user.is_verified = True
        user.verification_otp = None
        user.verification_otp_expires_at = None
        if db.query(User).filter(User.is_verified == True).count() <= 1:
            user.is_admin = True
        db.commit()
        success = True
        message = "Your email was successfully verified! You can now log in."
        send_welcome_email_task.delay(user.email)

    color = "#10b981" if success else "#ef4444"
    icon = "✓" if success else "✗"
    heading = "Success!" if success else "Verification Failed"
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Email Verification — Quro AI</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0c0d10;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}}
  .card{{background:#121318;border:1px solid #1f2937;border-radius:20px;padding:48px 32px;max-width:420px;width:90%;text-align:center;box-shadow:0 24px 48px rgba(0,0,0,.5)}}
  .icon{{width:72px;height:72px;border-radius:50%;border:2px solid {color};color:{color};font-size:36px;line-height:68px;margin:0 auto 24px}}
  h1{{font-size:1.5rem;font-weight:700;margin-bottom:12px}}
  p{{color:#94a3b8;margin-bottom:28px;line-height:1.6}}
  .btn{{display:inline-block;background:{color};color:#000;font-weight:700;padding:12px 36px;border-radius:10px;text-decoration:none;transition:opacity .2s}}
  .btn:hover{{opacity:.85}}
</style></head>
<body><div class="card">
  <div class="icon">{icon}</div>
  <h1>{heading}</h1>
  <p>{message}</p>
  <a href="/" class="btn">Go to Workspace</a>
</div></body></html>"""


@router.post("/resend-otp")
async def resend_otp(payload: ResendOtpSchema, request: Request, db: Session = Depends(get_db)):
    """Resend a verification or login OTP."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    otp = _generate_otp()
    expiry = datetime.datetime.utcnow() + timedelta(minutes=15)

    if payload.purpose == "signup":
        if user.is_verified:
            raise HTTPException(status_code=400, detail="Account is already verified.")
        user.verification_otp = otp
        user.verification_otp_expires_at = expiry
        db.commit()
        verify_link = f"{request.base_url}api/auth/verify-link?email={user.email}&token={otp}"
        send_verification_otp_task.delay(user.email, otp, verify_link)

    elif payload.purpose == "login":
        if not user.is_verified:
            raise HTTPException(status_code=400, detail="Email is not verified yet.")
        user.login_otp = otp
        user.login_otp_expires_at = expiry
        db.commit()
        send_login_otp_task.delay(user.email, otp)

    else:
        raise HTTPException(status_code=400, detail="Invalid purpose. Use 'signup' or 'login'.")

    return {"message": "Verification code resent successfully."}


# ─── Primary Login — OTP-First Flow ──────────────────────────────────────────

@router.post("/login")
async def login(payload: LoginSchema, db: Session = Depends(get_db)):
    """
    Step 1 of login: validate email + password, then send a one-time OTP.
    Returns {status: "otp_sent"} — no token yet.
    Complete login by calling POST /login-otp-verify with the OTP.
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
        )

    # Generate and store login OTP (valid 10 minutes)
    otp = _generate_otp()
    user.login_otp = otp
    user.login_otp_expires_at = datetime.datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Dispatch OTP email
    send_login_otp_task.delay(user.email, otp)

    return {
        "status": "otp_sent",
        "message": "A one-time login code has been sent to your email. Enter it to complete sign-in.",
        "email": user.email,
    }


@router.post("/login-otp-verify")
async def login_otp_verify(payload: LoginOtpVerifySchema, db: Session = Depends(get_db)):
    """
    Step 2 of login: verify the OTP and return a JWT access token.
    Works for both password+OTP flow and the passwordless OTP-only flow.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.login_otp or user.login_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid or incorrect verification code.")
    if datetime.datetime.utcnow() > user.login_otp_expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired. Request a new one.")

    # Consume the OTP
    user.login_otp = None
    user.login_otp_expires_at = None
    db.commit()

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


@router.post("/login-otp-request")
async def login_otp_request(payload: LoginOtpRequestSchema, db: Session = Depends(get_db)):
    """
    Passwordless login: request a login OTP by email only (no password required).
    Use /login-otp-verify to complete sign-in.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email address not found.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")

    otp = _generate_otp()
    user.login_otp = otp
    user.login_otp_expires_at = datetime.datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    send_login_otp_task.delay(user.email, otp)

    return {
        "status": "otp_sent",
        "message": "A one-time login code has been sent to your email inbox.",
    }


@router.post("/login-password")
async def login_password(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Direct password login (no OTP step).
    Kept for admin tooling and API integrations.
    Returns a JWT access token immediately.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="EMAIL_NOT_VERIFIED")

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


# ─── Forgot / Reset Password ──────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordSchema, db: Session = Depends(get_db)):
    """
    Send a password reset OTP. Always returns a generic success message
    to prevent user enumeration attacks.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        otp = _generate_otp()
        user.reset_password_otp = otp
        user.reset_password_otp_expires_at = datetime.datetime.utcnow() + timedelta(minutes=15)
        db.commit()
        send_password_reset_otp_task.delay(user.email, otp)
    return {"message": "If an account with that email exists, a password reset code has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordSchema, db: Session = Depends(get_db)):
    """Verify the reset OTP and update the password."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.reset_password_otp or user.reset_password_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid reset code.")
    if datetime.datetime.utcnow() > user.reset_password_otp_expires_at:
        raise HTTPException(status_code=400, detail="Reset code has expired.")

    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_password_otp = None
    user.reset_password_otp_expires_at = None
    db.commit()
    return {"message": "Password updated successfully. You can now log in."}


# ─── Google OAuth ─────────────────────────────────────────────────────────────

@router.post("/google/login")
async def google_login(payload: GoogleTokenSchema, db: Session = Depends(get_db)):
    """Validate a Google OAuth access token and sign in or auto-register the user."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.token}"},
            )
            if res.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google token.")
            user_data = res.json()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to communicate with Google Identity services.")

    email = user_data.get("email")
    google_id = user_data.get("sub")
    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Invalid token payload from Google.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=get_password_hash(str(uuid.uuid4())),  # Random — Google auth only
            is_verified=True,
            is_admin=False,
            google_id=google_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        # First user becomes admin
        if db.query(User).count() <= 1:
            user.is_admin = True
            db.commit()
        send_welcome_email_task.delay(user.email)

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


# ─── Mobile Auth Workflows (httpSMS) ──────────────────────────────────────────

@router.post("/mobile/request-otp")
async def request_mobile_otp(data: MobileOtpRequestSchema, db: Session = Depends(get_db)):
    """Generate and send OTP to mobile number via httpSMS."""
    phone = format_indian_phone_number(data.phone_number)
    
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number format.")

    otp = _generate_otp()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        user = User(
            phone_number=phone,
            is_verified=False,
            phone_otp=otp,
            phone_otp_expires_at=expires_at,
        )
        db.add(user)
    else:
        user.phone_otp = otp
        user.phone_otp_expires_at = expires_at

    db.commit()

    sms_res = await send_sms_otp(phone, otp)

    return {
        "message": "OTP sent successfully to your mobile number.",
        "phone_number": phone,
        "mode": sms_res.get("mode", "dev"),
    }


@router.post("/mobile/verify-otp")
async def verify_mobile_otp(data: MobileOtpVerifySchema, db: Session = Depends(get_db)):
    """Verify Mobile OTP and log in / register the user."""
    phone = format_indian_phone_number(data.phone_number)
    user = db.query(User).filter(User.phone_number == phone).first()

    if not user or not user.phone_otp:
        raise HTTPException(status_code=400, detail="OTP was not requested for this phone number.")

    if user.phone_otp_expires_at and datetime.datetime.utcnow() > user.phone_otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")

    if user.phone_otp != data.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    user.is_verified = True
    user.phone_otp = None
    user.phone_otp_expires_at = None
    db.commit()

    access_token = create_access_token(
        data={"sub": user.email or user.phone_number or user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


# ─── Current User Helpers (used by other routes) ─────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    from jose import jwt, JWTError
    from core.security import SECRET_KEY, ALGORITHM

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter((User.email == sub) | (User.phone_number == sub) | (User.id == sub)).first()
    if user is None:
        raise credentials_exception
    return user


async def get_optional_current_user(
    token: str = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None
    from jose import jwt, JWTError
    from core.security import SECRET_KEY, ALGORITHM

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            return None
    except JWTError:
        return None

    return db.query(User).filter((User.email == sub) | (User.phone_number == sub) | (User.id == sub)).first()


async def admin_required(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_verified or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Administrative privileges required.")
    return current_user


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return _user_payload(current_user)
