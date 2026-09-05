"""
ClaimGuard AI
Authentication API
"""

from __future__ import annotations

from fastapi import (
    APIRouter,
    HTTPException,
)

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

from app.schemas.auth import (
    AdminLoginRequest,
    InvestigatorLoginRequest,
    ProviderLoginRequest,
    RefreshTokenRequest,
)

from app.services.auth_service import (
    AuthService,
)

from app.services.supabase_service import (
    supabase_service,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ============================================================
# ADMIN LOGIN
# ============================================================

@router.post("/login")
def admin_login(
    request: AdminLoginRequest,
):

    email = (
        str(request.email)
        .strip()
        .lower()
    )

    password = request.password

    # ========================================================
    # FIND ADMIN
    # ========================================================

    result = (
        supabase_service.client
        .table("profiles")
        .select(
            """
            id,
            email,
            full_name,
            role,
            is_active,
            password_hash
            """
        )
        .eq(
            "email",
            email,
        )
        .eq(
            "role",
            "ADMIN",
        )
        .limit(1)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    admin = result.data[0]

    # ========================================================
    # CHECK ACTIVE
    # ========================================================

    if not admin.get("is_active"):

        raise HTTPException(
            status_code=403,
            detail="Admin account is inactive.",
        )

    # ========================================================
    # CHECK PASSWORD EXISTS
    # ========================================================

    password_hash = admin.get(
        "password_hash"
    )

    if not password_hash:

        raise HTTPException(
            status_code=403,
            detail=(
                "Admin account does not "
                "have a password."
            ),
        )

    # ========================================================
    # VERIFY PASSWORD
    # ========================================================

    if not AuthService.verify_password(
        password,
        password_hash,
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    # ========================================================
    # CREATE ACCESS TOKEN
    # ========================================================

    access_token = (
        AuthService.create_access_token(
            user_id=admin["id"],
            email=admin["email"],
            role="ADMIN",
        )
    )

    # ========================================================
    # CREATE REFRESH TOKEN
    # ========================================================

    refresh_token = (
        AuthService.create_refresh_token(
            user_id=admin["id"],
            email=admin["email"],
            role="ADMIN",
        )
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "message":
            "Admin login successful",

        "access_token":
            access_token,

        "refresh_token":
            refresh_token,

        "token_type":
            "bearer",

        "expires_in":
            ACCESS_TOKEN_EXPIRE_MINUTES * 60,

        "refresh_expires_in":
            AuthService.REFRESH_TOKEN_EXPIRE_DAYS
            * 24
            * 60
            * 60,

        "user": {

            "id":
                admin["id"],

            "email":
                admin["email"],

            "full_name":
                admin["full_name"],

            "role":
                admin["role"],

            "is_active":
                admin["is_active"],
        },
    }


# ============================================================
# INVESTIGATOR LOGIN
# ============================================================

@router.post("/investigator")
def investigator_login(
    request: InvestigatorLoginRequest,
):

    email = (
        str(request.email)
        .strip()
        .lower()
    )

    password = request.password

    # ========================================================
    # FIND INVESTIGATOR
    # ========================================================

    result = (
        supabase_service.client
        .table("investigators")
        .select(
            """
            investigator_id,
            full_name,
            email,
            phone_number,
            password_hash,
            role,
            is_active
            """
        )
        .eq(
            "email",
            email,
        )
        .eq(
            "role",
            "INVESTIGATOR",
        )
        .limit(1)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    investigator = result.data[0]

    # ========================================================
    # CHECK APPROVAL STATUS
    # ========================================================

    if not investigator.get("is_active"):

        raise HTTPException(
            status_code=403,
            detail=(
                "Investigator account is not "
                "approved by the administrator."
            ),
        )

    # ========================================================
    # CHECK PASSWORD EXISTS
    # ========================================================

    password_hash = investigator.get(
        "password_hash"
    )

    if not password_hash:

        raise HTTPException(
            status_code=403,
            detail=(
                "Investigator account is not "
                "fully activated."
            ),
        )

    # ========================================================
    # VERIFY PASSWORD
    # ========================================================

    if not AuthService.verify_password(
        password,
        password_hash,
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    # ========================================================
    # CREATE ACCESS TOKEN
    # ========================================================

    access_token = (
        AuthService.create_access_token(
            user_id=investigator["investigator_id"],
            email=investigator["email"],
            role="INVESTIGATOR",
        )
    )

    # ========================================================
    # CREATE REFRESH TOKEN
    # ========================================================

    refresh_token = (
        AuthService.create_refresh_token(
            user_id=investigator["investigator_id"],
            email=investigator["email"],
            role="INVESTIGATOR",
        )
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "message":
            "Investigator login successful",

        "access_token":
            access_token,

        "refresh_token":
            refresh_token,

        "token_type":
            "bearer",

        "expires_in":
            ACCESS_TOKEN_EXPIRE_MINUTES * 60,

        "refresh_expires_in":
            AuthService.REFRESH_TOKEN_EXPIRE_DAYS
            * 24
            * 60
            * 60,

        "user": {

            "investigator_id":
                investigator["investigator_id"],

            "full_name":
                investigator["full_name"],

            "email":
                investigator["email"],

            "phone_number":
                investigator["phone_number"],

            "role":
                investigator["role"],

            "is_active":
                investigator["is_active"],
        },
    }


# ============================================================
# PROVIDER LOGIN
# ============================================================

@router.post("/provider")
def provider_login(
    request: ProviderLoginRequest,
):

    provider_id = (
        request.provider_id
        .strip()
    )

    password = request.password

    try:

        result = (
            AuthService()
            .login_provider(
                provider_id=provider_id,
                password=password,
            )
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to process "
                "provider login."
            ),
        ) from exc


# ============================================================
# REFRESH ACCESS TOKEN
# ============================================================

@router.post("/refresh")
def refresh_access_token(
    request: RefreshTokenRequest,
):

    try:

        return AuthService.refresh_access_token(
            request.refresh_token
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc


# ============================================================
# EXPORT
# ============================================================

__all__ = [
    "router",
]