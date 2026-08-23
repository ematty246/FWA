"""
ClaimGuard AI
Authentication / Authorization Security
"""

from __future__ import annotations

import jwt

from fastapi import (
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.core.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
)


security = HTTPBearer()


# ============================================================
# GET CURRENT USER FROM JWT
# ============================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
) -> dict:

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    # ========================================================
    # REQUIRED JWT FIELDS
    # ========================================================

    user_id = payload.get("sub")
    email = payload.get("email")
    role = payload.get("role")

    if not user_id or not role:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    return {
        "id": user_id,
        "email": email,
        "role": role,
    }


# ============================================================
# INVESTIGATOR ONLY
# ============================================================

def get_current_investigator(
    current_user: dict = Depends(
        get_current_user
    ),
) -> dict:

    if current_user["role"] != "INVESTIGATOR":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Investigator access required."
            ),
        )

    return current_user

# ============================================================
# PROVIDER ONLY
# ============================================================

def get_current_provider(
    current_user: dict = Depends(
        get_current_user
    ),
) -> dict:

    if current_user["role"] != "PROVIDER":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Provider access required."
            ),
        )

    return {
        **current_user,
        "provider_id": current_user["id"],
    }
def get_current_admin(
    current_user: dict = Depends(
        get_current_user
    ),
) -> dict:

    if current_user["role"] != "ADMIN":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )

    return current_user

__all__ = [
    "get_current_user",
    "get_current_investigator",
    "get_current_provider",
    "get_current_admin",

]
