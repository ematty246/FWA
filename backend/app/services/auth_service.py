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

from jose import (
    jwt,
    JWTError,
)

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
    # TOKEN EXPIRY
    # ========================================================

    REFRESH_TOKEN_EXPIRE_DAYS = 7

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
            "type": "access",
            "exp": expire,
        }

        return jwt.encode(
            payload,
            JWT_SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )

    # ========================================================
    # CREATE REFRESH TOKEN
    # ========================================================

    @staticmethod
    def create_refresh_token(
        user_id: str,
        email: str,
        role: str,
    ) -> str:

        expire = (
            datetime.now(timezone.utc)
            + timedelta(
                days=AuthService.REFRESH_TOKEN_EXPIRE_DAYS
            )
        )

        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "type": "refresh",
            "exp": expire,
        }

        return jwt.encode(
            payload,
            JWT_SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )

    # ========================================================
    # REFRESH ACCESS TOKEN
    # ========================================================

    @staticmethod
    def refresh_access_token(
        refresh_token: str,
    ) -> dict:

        if not refresh_token:
            raise ValueError(
                "Refresh token is required."
            )

        try:
            payload = jwt.decode(
                refresh_token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM],
            )

            # ====================================================
            # VERIFY TOKEN TYPE
            # ====================================================

            if payload.get("type") != "refresh":
                raise ValueError(
                    "Invalid refresh token."
                )

            # ====================================================
            # GET USER INFORMATION
            # ====================================================

            user_id = payload.get("sub")
            email = payload.get("email")
            role = payload.get("role")

            if not user_id or not email or not role:
                raise ValueError(
                    "Invalid refresh token payload."
                )

            # ====================================================
            # VERIFY ACCOUNT IS STILL ACTIVE
            # ====================================================

            if role == "ADMIN":

                result = (
                    supabase_service.client
                    .table("profiles")
                    .select(
                        "id, email, is_active, role"
                    )
                    .eq(
                        "id",
                        user_id,
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
                        "Admin account no longer exists."
                    )

                user = result.data[0]

                if not user.get("is_active"):
                    raise ValueError(
                        "Admin account is inactive."
                    )

            elif role == "INVESTIGATOR":

                result = (
                    supabase_service.client
                    .table("investigators")
                    .select(
                        """
                        investigator_id,
                        email,
                        is_active,
                        role
                        """
                    )
                    .eq(
                        "investigator_id",
                        user_id,
                    )
                    .eq(
                        "role",
                        "INVESTIGATOR",
                    )
                    .limit(1)
                    .execute()
                )

                if not result.data:
                    raise ValueError(
                        "Investigator account no longer exists."
                    )

                user = result.data[0]

                if not user.get("is_active"):
                    raise ValueError(
                        "Investigator account is inactive."
                    )

            elif role == "PROVIDER":

                result = (
                    supabase_service.client
                    .table("providers")
                    .select(
                        """
                        provider_id,
                        email,
                        is_active
                        """
                    )
                    .eq(
                        "provider_id",
                        user_id,
                    )
                    .limit(1)
                    .execute()
                )

                if not result.data:
                    raise ValueError(
                        "Provider account no longer exists."
                    )

                user = result.data[0]

                if not user.get("is_active"):
                    raise ValueError(
                        "Provider account is inactive."
                    )

            else:
                raise ValueError(
                    "Invalid user role."
                )

            # ====================================================
            # CREATE NEW ACCESS TOKEN
            # ====================================================

            new_access_token = (
                AuthService.create_access_token(
                    user_id=user_id,
                    email=email,
                    role=role,
                )
            )

            # ====================================================
            # RESPONSE
            # ====================================================

            return {

                "access_token":
                    new_access_token,

                "token_type":
                    "bearer",

                "expires_in":
                    ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            }

        except JWTError as exc:

            raise ValueError(
                "Refresh token is invalid or expired."
            ) from exc

    # ========================================================
    # ADMIN LOGIN
    # ========================================================

    def login_admin(
        self,
        email: str,
        password: str,
    ):

        email = email.strip().lower()

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

        if not admin["is_active"]:

            raise ValueError(
                "Admin account is inactive."
            )

        if not admin.get("password_hash"):

            raise ValueError(
                "Admin account does not have a password."
            )

        if not self.verify_password(
            password,
            admin["password_hash"],
        ):

            raise ValueError(
                "Invalid admin email or password."
            )

        access_token = (
            self.create_access_token(
                user_id=admin["id"],
                email=admin["email"],
                role=admin["role"],
            )
        )

        refresh_token = (
            self.create_refresh_token(
                user_id=admin["id"],
                email=admin["email"],
                role=admin["role"],
            )
        )

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
                self.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,

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

        if not provider_id:
            raise ValueError(
                "Provider ID is required."
            )

        if not password:
            raise ValueError(
                "Password is required."
            )

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

        if not provider.get("is_active"):

            raise ValueError(
                "Provider account is not active."
            )

        if not provider.get("password_hash"):

            raise ValueError(
                "Provider account does not have a password."
            )

        if not self.verify_password(
            password,
            provider["password_hash"],
        ):

            raise ValueError(
                "Invalid provider ID or password."
            )

        # ----------------------------------------------------
        # UPDATE LAST LOGIN
        # ----------------------------------------------------

        (
            supabase_service.client
            .table("providers")
            .update({
                "last_login_at":
                    datetime.now(
                        timezone.utc
                    ).isoformat()
            })
            .eq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        # ----------------------------------------------------
        # CREATE TOKENS
        # ----------------------------------------------------

        access_token = (
            self.create_access_token(
                user_id=provider["provider_id"],
                email=provider["email"],
                role="PROVIDER",
            )
        )

        refresh_token = (
            self.create_refresh_token(
                user_id=provider["provider_id"],
                email=provider["email"],
                role="PROVIDER",
            )
        )

        return {

            "message":
                "Provider login successful",

            "access_token":
                access_token,

            "refresh_token":
                refresh_token,

            "token_type":
                "bearer",

            "expires_in":
                ACCESS_TOKEN_EXPIRE_MINUTES * 60,

            "refresh_expires_in":
                self.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,

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


__all__ = [
    "AuthService",
    "auth_service",
]