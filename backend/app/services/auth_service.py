"""
ClaimGuard AI
Authentication Service
"""

from __future__ import annotations

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from jose import jwt

from passlib.context import CryptContext

from app.core.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

from app.services.supabase_service import (
    supabase_service,
)


class AuthService:

    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
    )

    # ========================================================
    # PASSWORD HASH
    # ========================================================

    @staticmethod
    def hash_password(
        password: str,
    ) -> str:

        if not password:

            raise ValueError(
                "Password cannot be empty."
            )

        return AuthService.pwd_context.hash(
            password
        )

    # ========================================================
    # PASSWORD VERIFY
    # ========================================================

    @staticmethod
    def verify_password(
        password: str,
        password_hash: str,
    ) -> bool:

        return AuthService.pwd_context.verify(
            password,
            password_hash,
        )

    # ========================================================
    # CREATE ACCESS TOKEN
    # ========================================================

    @staticmethod
    def create_access_token(
        user_id: str,
        email: str,
        role: str,
    ) -> str:

        expire = (
            datetime.now(timezone.utc)
            + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "exp": expire,
        }

        return jwt.encode(
            payload,
            JWT_SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )

    # ========================================================
    # ADMIN LOGIN
    # ========================================================

    def login_admin(
        self,
        email: str,
        password: str,
    ):

        email = email.strip().lower()

        # ----------------------------------------------------
        # FIND ADMIN
        # ----------------------------------------------------

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

            raise ValueError(
                "Invalid admin email or password."
            )

        admin = result.data[0]

        # ----------------------------------------------------
        # CHECK ACTIVE
        # ----------------------------------------------------

        if not admin["is_active"]:

            raise ValueError(
                "Admin account is inactive."
            )

        # ----------------------------------------------------
        # CHECK PASSWORD HASH
        # ----------------------------------------------------

        if not admin.get("password_hash"):

            raise ValueError(
                "Admin account does not have a password."
            )

        # ----------------------------------------------------
        # VERIFY PASSWORD
        # ----------------------------------------------------

        if not self.verify_password(
            password,
            admin["password_hash"],
        ):

            raise ValueError(
                "Invalid admin email or password."
            )

        # ----------------------------------------------------
        # CREATE JWT
        # ----------------------------------------------------

        access_token = (
            self.create_access_token(
                user_id=admin["id"],
                email=admin["email"],
                role=admin["role"],
            )
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {

            "message":
                "Admin login successful",

            "access_token":
                access_token,

            "token_type":
                "bearer",

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

    # ========================================================
    # PROVIDER LOGIN
    # ========================================================

    def login_provider(
        self,
        provider_id: str,
        password: str,
    ):

        provider_id = provider_id.strip()

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        if not provider_id:

            raise ValueError(
                "Provider ID is required."
            )

        if not password:

            raise ValueError(
                "Password is required."
            )

        # ----------------------------------------------------
        # FIND PROVIDER
        # ----------------------------------------------------

        result = (
            supabase_service.client
            .table("providers")
            .select(
                """
                provider_id,
                provider_name,
                email,
                password_hash,
                is_active
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        if not result.data:

            raise ValueError(
                "Invalid provider ID or password."
            )

        provider = result.data[0]

        # ----------------------------------------------------
        # CHECK ACTIVE
        # ----------------------------------------------------

        if not provider.get("is_active"):

            raise ValueError(
                "Provider account is not active."
            )

        # ----------------------------------------------------
        # CHECK PASSWORD
        # ----------------------------------------------------

        if not provider.get("password_hash"):

            raise ValueError(
                "Provider account does not have a password."
            )

        # ----------------------------------------------------
        # VERIFY PASSWORD
        # ----------------------------------------------------

        if not self.verify_password(
            password,
            provider["password_hash"],
        ):
            supabase_service.client \
    .table("providers") \
    .update({
        "last_login_at": datetime.now(
            timezone.utc
        ).isoformat()
    }) \
    .eq(
        "provider_id",
        provider_id,
    ) \
    .execute()

            raise ValueError(
                "Invalid provider ID or password."
            )

        # ----------------------------------------------------
        # CREATE JWT
        # ----------------------------------------------------

        access_token = (
            self.create_access_token(
                user_id=provider["provider_id"],
                email=provider["email"],
                role="PROVIDER",
            )
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {

            "message":
                "Provider login successful",

            "access_token":
                access_token,

            "token_type":
                "bearer",

            "user": {

                "provider_id":
                    provider["provider_id"],

                "email":
                    provider["email"],

                "provider_name":
                    provider["provider_name"],

                "role":
                    "PROVIDER",

                "is_active":
                    provider["is_active"],
            },
        }


# ============================================================
# SINGLETON
# ============================================================

auth_service = AuthService()


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "AuthService",
    "auth_service",
]