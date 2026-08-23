"""
ClaimGuard AI
Provider Registration Service
"""

from __future__ import annotations

from app.services.geocoding_service import (
    geocoding_service,
)

from app.services.email_service import (
    email_service,
)

from app.services.supabase_service import (
    supabase_service,
)


class ProviderRegistrationService:

    SERVICE_NAME = "provider_registration_service"

    # ========================================================
    # PROVIDER REGISTRATION
    # ========================================================

    def register_provider(
        self,
        provider_id: str,
        provider_name: str,
        email: str,
        hospital_address: str,
    ):

        # ====================================================
        # NORMALIZE INPUT
        # ====================================================

        provider_id = provider_id.strip().upper()
        provider_name = provider_name.strip()
        email = email.strip().lower()
        hospital_address = hospital_address.strip()

        # ====================================================
        # VALIDATION
        # ====================================================

        if not provider_id:
            raise ValueError("Provider ID is required.")

        if not provider_name:
            raise ValueError("Provider name is required.")

        if not email:
            raise ValueError("Provider email is required.")

        if not hospital_address:
            raise ValueError("Hospital address is required.")

        # ====================================================
        # CHECK PROVIDER IN MASTER TABLE
        # ====================================================

        existing = (
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
            .eq("provider_id", provider_id)
            .limit(1)
            .execute()
        )

        # ----------------------------------------------------
        # CASE 1: Provider does NOT exist → create new record
        # ----------------------------------------------------

        if not existing.data:

            # Insert new provider row with basic info
            new_provider = {
                "provider_id": provider_id,
                "provider_name": provider_name,
                "email": email,
                "hospital_address": hospital_address,
                "is_active": False,
                "password_hash": None,
                "latitude": None,
                "longitude": None,
            }

            insert_result = (
                supabase_service.client
                .table("providers")
                .insert(new_provider)
                .execute()
            )

            if not insert_result.data:
                raise RuntimeError(
                    "Failed to create provider record."
                )

            existing_provider = insert_result.data[0]

        else:
            # -------------------------------------------------
            # CASE 2: Provider exists – check state
            # -------------------------------------------------

            existing_provider = existing.data[0]

            # If already active and has password → already approved
            if (
                existing_provider.get("is_active") is True
                and existing_provider.get("password_hash")
            ):
                raise ValueError(
                    "Provider is already registered and active."
                )

            # Update provider details if they differ
            update_data = {}
            if existing_provider.get("provider_name") != provider_name:
                update_data["provider_name"] = provider_name
            if existing_provider.get("email") != email:
                update_data["email"] = email
            if existing_provider.get("hospital_address") != hospital_address:
                update_data["hospital_address"] = hospital_address

            if update_data:
                supabase_service.client \
                    .table("providers") \
                    .update(update_data) \
                    .eq("provider_id", provider_id) \
                    .execute()

        # ====================================================
        # CHECK PENDING PROVIDER (avoid duplicate pending)
        # ====================================================

        pending = (
            supabase_service.client
            .table("pending_providers")
            .select("provider_id, email")
            .eq("provider_id", provider_id)
            .limit(1)
            .execute()
        )

        if pending.data:
            raise ValueError(
                "Provider registration is already pending."
            )

        # ====================================================
        # GEOCODE HOSPITAL ADDRESS
        # ====================================================

        location = geocoding_service.geocode(hospital_address)

        latitude = location["latitude"]
        longitude = location["longitude"]

        # ====================================================
        # CREATE PENDING REGISTRATION
        # ====================================================

        pending_record = {
            "provider_id": provider_id,
            "provider_name": provider_name,
            "email": email,
            "hospital_address": hospital_address,
            "latitude": latitude,
            "longitude": longitude,
        }

        result = (
            supabase_service.client
            .table("pending_providers")
            .insert(pending_record)
            .execute()
        )

        if not result.data:
            raise RuntimeError(
                "Failed to create pending provider registration."
            )

        # ====================================================
        # NOTIFY ADMIN
        # ====================================================

        email_service.send_provider_registration_to_admin(
            provider_id=provider_id,
            full_name=provider_name,
            email=email,
            hospital_address=hospital_address,
            latitude=latitude,
            longitude=longitude,
        )

        # ====================================================
        # RESPONSE
        # ====================================================

        return {
            "message": (
                "Provider registration submitted successfully. "
                "Awaiting administrator approval."
            ),
            "provider_id": provider_id,
            "status": "PENDING",
        }


# ============================================================
# SINGLETON
# ============================================================

provider_registration_service = ProviderRegistrationService()


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ProviderRegistrationService",
    "provider_registration_service",
]