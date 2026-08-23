"""
ClaimGuard AI
Supabase Service
"""

from __future__ import annotations

import httpx

from supabase import Client, create_client

from app.core.config import (
    SUPABASE_KEY,
    SUPABASE_URL,
    validate_supabase_config,
)


class SupabaseService:

    SERVICE_NAME = "supabase_service"

    def __init__(self) -> None:

        # ====================================================
        # VALIDATE CONFIGURATION
        # ====================================================

        validate_supabase_config()

        # ====================================================
        # HTTP/1.1 CLIENT
        #
        # IMPORTANT:
        # Supabase/PostgREST was producing:
        #
        #   httpx.RemoteProtocolError
        #   Server disconnected
        #
        # Force HTTP/1.1 instead of HTTP/2.
        # ====================================================

        self.http_client = httpx.Client(
            http2=False,
            timeout=httpx.Timeout(
                connect=30.0,
                read=60.0,
                write=60.0,
                pool=60.0,
            ),
            limits=httpx.Limits(
                max_connections=20,
                max_keepalive_connections=5,
                keepalive_expiry=5.0,
            ),
        )

        # ====================================================
        # CREATE SUPABASE CLIENT
        # ====================================================

        self.client: Client = create_client(
            SUPABASE_URL,
            SUPABASE_KEY,
        )

        # ====================================================
        # FORCE POSTGREST CLIENT TO USE HTTP/1.1 CLIENT
        #
        # Supabase Python client internally exposes the
        # PostgREST client through .postgrest.
        # ====================================================

        try:

            self.client.postgrest.session = (
                self.http_client
            )

        except Exception:

            # Some versions expose the session through
            # the PostgREST client differently.
            #
            # Do not prevent application startup if the
            # internal structure differs.
            pass

    # ========================================================
    # CONFIGURATION STATUS
    # ========================================================

    @property
    def is_configured(self) -> bool:

        return bool(
            SUPABASE_URL
            and SUPABASE_KEY
        )

    # ========================================================
    # HEALTH CHECK
    # ========================================================

    def health_check(self) -> dict:

        return {
            "service": self.SERVICE_NAME,
            "status": (
                "healthy"
                if self.is_configured
                else "degraded"
            ),
            "provider": "Supabase",
            "http_protocol": "HTTP/1.1",
        }

    # ========================================================
    # CLOSE HTTP CLIENT
    # ========================================================

    def close(self) -> None:

        try:

            self.http_client.close()

        except Exception:

            pass


# ============================================================
# SINGLETON
# ============================================================

supabase_service = SupabaseService()


__all__ = [
    "SupabaseService",
    "supabase_service",
]