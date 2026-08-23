"""
ClaimGuard AI
Geocoding Service

Converts hospital addresses into latitude/longitude
using OpenCage.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

import requests

from app.core.config import OPENCAGE_API_KEY


logger = logging.getLogger(__name__)


class GeocodingService:

    SERVICE_NAME = "geocoding_service"

    BASE_URL = (
        "https://api.opencagedata.com/geocode/v1/json"
    )

    def geocode(
        self,
        address: str,
    ) -> Dict[str, Any]:

        address = str(
            address or ""
        ).strip()

        if not address:

            raise ValueError(
                "Hospital address is required."
            )

        if not OPENCAGE_API_KEY:

            raise RuntimeError(
                "OpenCage API key is not configured."
            )

        try:

            response = requests.get(
                self.BASE_URL,
                params={
                    "q": address,
                    "key": OPENCAGE_API_KEY,
                    "limit": 1,
                    "no_annotations": 1,
                },
                timeout=10,
            )

            response.raise_for_status()

            data = response.json()

        except requests.RequestException as exc:

            logger.exception(
                "OpenCage request failed."
            )

            raise RuntimeError(
                "Address geocoding service is unavailable."
            ) from exc

        results = (
            data.get("results")
            or []
        )

        if not results:

            raise ValueError(
                "The hospital address could not be located."
            )

        result = results[0]

        geometry = (
            result.get("geometry")
            or {}
        )

        latitude = geometry.get("lat")
        longitude = geometry.get("lng")

        if (
            latitude is None
            or longitude is None
        ):

            raise ValueError(
                "Geocoding did not return valid coordinates."
            )

        return {

            "latitude":
                float(latitude),

            "longitude":
                float(longitude),

            "formatted_address":
                result.get(
                    "formatted"
                ),

            "confidence":
                result.get(
                    "confidence"
                ),
        }

    def health_check(self):

        return {

            "service":
                self.SERVICE_NAME,

            "status":
                (
                    "healthy"
                    if OPENCAGE_API_KEY
                    else "degraded"
                ),
        }


geocoding_service = GeocodingService()


__all__ = [
    "GeocodingService",
    "geocoding_service",
]