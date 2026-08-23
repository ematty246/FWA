"""
ClaimGuard AI
Create Initial Admin Account
"""

from uuid import uuid4

from app.core.config import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
)

from app.services.supabase_service import (
    supabase_service,
)

from app.services.auth_service import (
    AuthService,
)


def create_admin():

    # ========================================================
    # VALIDATE CONFIGURATION
    # ========================================================

    if not ADMIN_EMAIL:
        raise RuntimeError(
            "ADMIN_EMAIL is not configured in .env"
        )

    if not ADMIN_PASSWORD:
        raise RuntimeError(
            "ADMIN_PASSWORD is not configured in .env"
        )

    email = ADMIN_EMAIL.strip().lower()

    # ========================================================
    # CHECK WHETHER ADMIN ALREADY EXISTS
    # ========================================================

    existing = (
        supabase_service.client
        .table("profiles")
        .select(
            "id,email,role,is_active"
        )
        .eq("email", email)
        .eq("role", "ADMIN")
        .limit(1)
        .execute()
    )

    if existing.data:

        print("=" * 60)
        print("ADMIN ALREADY EXISTS")
        print("=" * 60)

        print(existing.data[0])

        return

    # ========================================================
    # HASH PASSWORD
    # ========================================================

    password_hash = AuthService.hash_password(
        ADMIN_PASSWORD
    )

    # ========================================================
    # CREATE ADMIN PROFILE
    # ========================================================

    admin_id = str(uuid4())

    admin_data = {
        "id": admin_id,
        "email": email,
        "provider_id": None,
        "full_name": "System Administrator",
        "role": "ADMIN",
        "is_active": True,
        "password_hash": password_hash,
    }

    # ========================================================
    # INSERT INTO SUPABASE
    # ========================================================

    result = (
        supabase_service.client
        .table("profiles")
        .insert(admin_data)
        .execute()
    )

    if not result.data:

        raise RuntimeError(
            "Failed to create admin account."
        )

    print()
    print("=" * 60)
    print("ADMIN CREATED SUCCESSFULLY")
    print("=" * 60)

    print("Admin ID :", admin_id)
    print("Email    :", email)
    print("Role     : ADMIN")
    print("Active   : True")
    print("=" * 60)


if __name__ == "__main__":
    create_admin()