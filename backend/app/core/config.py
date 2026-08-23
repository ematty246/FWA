"""
ClaimGuard AI
Application Configuration
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


# ============================================================
# BASE DIRECTORY
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]


# ============================================================
# ENVIRONMENT
# ============================================================

ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)


# ============================================================
# APPLICATION
# ============================================================

APP_NAME = "ClaimGuard AI"

APP_VERSION = "1.0.0"


# ============================================================
# SUPABASE
# ============================================================

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "",
).strip()

SUPABASE_KEY = os.getenv(
    "SUPABASE_KEY",
    "",
).strip()


# ============================================================
# JWT
# ============================================================

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "",
).strip()

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
).strip()


# ============================================================
# ACCESS TOKEN
# ============================================================

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "30",
    )
)


# ============================================================
# REFRESH TOKEN
# ============================================================

REFRESH_TOKEN_EXPIRE_DAYS = int(
    os.getenv(
        "REFRESH_TOKEN_EXPIRE_DAYS",
        "7",
    )
)


# ============================================================
# PASSWORD RESET
# ============================================================

PASSWORD_RESET_EXPIRE_MINUTES = int(
    os.getenv(
        "PASSWORD_RESET_EXPIRE_MINUTES",
        "30",
    )
)

FRONTEND_BASE_URL = os.getenv(
    "FRONTEND_BASE_URL",
    "http://localhost:5173",
).strip()


# ============================================================
# SMTP EMAIL
# ============================================================

SMTP_HOST = os.getenv(
    "SMTP_HOST",
    "smtp.gmail.com",
).strip()

SMTP_PORT = int(
    os.getenv(
        "SMTP_PORT",
        "587",
    )
)

SMTP_USERNAME = os.getenv(
    "SMTP_USERNAME",
    "",
).strip()

SMTP_PASSWORD = os.getenv(
    "SMTP_PASSWORD",
    "",
).strip()

SMTP_FROM_EMAIL = os.getenv(
    "SMTP_FROM_EMAIL",
    SMTP_USERNAME,
).strip()

SMTP_FROM_NAME = os.getenv(
    "SMTP_FROM_NAME",
    "ClaimGuard AI",
).strip()


# ============================================================
# ADMIN
# ============================================================

ADMIN_EMAIL = os.getenv(
    "ADMIN_EMAIL",
    "",
).strip()

ADMIN_PASSWORD = os.getenv(
    "ADMIN_PASSWORD",
    "",
).strip()


# ============================================================
# OPENCAGE
# ============================================================

OPENCAGE_API_KEY = os.getenv(
    "OPENCAGE_API_KEY",
    "",
).strip()


# ============================================================
# VALIDATION
# ============================================================

def validate_supabase_config() -> None:

    missing = []

    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")

    if not SUPABASE_KEY:
        missing.append("SUPABASE_KEY")

    if missing:

        raise RuntimeError(
            "Missing required Supabase configuration: "
            + ", ".join(missing)
        )


def validate_jwt_config() -> None:

    if not JWT_SECRET_KEY:

        raise RuntimeError(
            "JWT_SECRET_KEY is not configured."
        )

    if not JWT_ALGORITHM:

        raise RuntimeError(
            "JWT_ALGORITHM is not configured."
        )

    if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:

        raise RuntimeError(
            "ACCESS_TOKEN_EXPIRE_MINUTES "
            "must be greater than 0."
        )

    if REFRESH_TOKEN_EXPIRE_DAYS <= 0:

        raise RuntimeError(
            "REFRESH_TOKEN_EXPIRE_DAYS "
            "must be greater than 0."
        )


def validate_password_reset_config() -> None:

    if PASSWORD_RESET_EXPIRE_MINUTES <= 0:

        raise RuntimeError(
            "PASSWORD_RESET_EXPIRE_MINUTES "
            "must be greater than 0."
        )

    if not FRONTEND_BASE_URL:

        raise RuntimeError(
            "FRONTEND_BASE_URL is not configured."
        )


def validate_email_config() -> None:

    if not SMTP_USERNAME:

        raise RuntimeError(
            "SMTP_USERNAME is not configured."
        )

    if not SMTP_PASSWORD:

        raise RuntimeError(
            "SMTP_PASSWORD is not configured."
        )

    if SMTP_PORT <= 0:

        raise RuntimeError(
            "SMTP_PORT must be greater than 0."
        )


def validate_config() -> None:

    validate_supabase_config()

    validate_jwt_config()

    validate_password_reset_config()


# ============================================================
# EXPORTS
# ============================================================

__all__ = [

    "BASE_DIR",
    "ENV_FILE",

    "APP_NAME",
    "APP_VERSION",

    "SUPABASE_URL",
    "SUPABASE_KEY",

    "JWT_SECRET_KEY",
    "JWT_ALGORITHM",

    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "REFRESH_TOKEN_EXPIRE_DAYS",

    "PASSWORD_RESET_EXPIRE_MINUTES",
    "FRONTEND_BASE_URL",

    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "SMTP_FROM_NAME",

    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",

    "OPENCAGE_API_KEY",

    "validate_supabase_config",
    "validate_jwt_config",
    "validate_password_reset_config",
    "validate_email_config",
    "validate_config",
]