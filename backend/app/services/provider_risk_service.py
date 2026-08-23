"""
ClaimGuard AI
Provider Risk Profile Service
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from app.services.supabase_service import (
    supabase_service,
)


logger = logging.getLogger(__name__)


class ProviderRiskService:

    SERVICE_NAME = "provider_risk_service"

    # ============================================================
    # NORMALIZE RISK TIER
    # ============================================================

    @staticmethod
    def _normalize_risk_tier(
        value: Any,
    ) -> str:

        if value is None:
            return "Low Risk"

        value = str(value).strip().lower()

        if value in {
            "very high risk",
            "very_high_risk",
            "very-high-risk",
        }:
            return "Very High Risk"

        if value in {
            "high risk",
            "high_risk",
            "high-risk",
        }:
            return "High Risk"

        if value in {
            "medium risk",
            "medium_risk",
            "medium-risk",
        }:
            return "Medium Risk"

        if value in {
            "low risk",
            "low_risk",
            "low-risk",
        }:
            return "Low Risk"

        return "Low Risk"

    # ============================================================
    # GET PROVIDER
    # ============================================================

    def _get_provider(
        self,
        provider_id: str,
    ) -> dict:

        result = (
            supabase_service.client
            .table("providers")
            .select("*")
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        if not result.data:
            raise ValueError(
                "Provider not found."
            )

        return result.data[0]

    # ============================================================
    # GET HISTORICAL CLAIM SUMMARY
    #
    # SOURCE:
    #     provider_claim_summary
    #
    # USED FOR:
    #     total_claims
    #     very_high_risk_claims
    #     high_risk_claims
    #     medium_risk_claims
    #     low_risk_claims
    # ============================================================

    def _get_historical_claim_summary(
        self,
        provider_id: str,
    ) -> Optional[dict]:

        result = (
            supabase_service.client
            .table("provider_claim_summary")
            .select(
                """
                provider_id,
                total_claims,
                very_high_risk_claims,
                high_risk_claims,
                medium_risk_claims,
                low_risk_claims
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
            return None

        return result.data[0]

    # ============================================================
    # GET HISTORICAL PROVIDER FEATURES
    #
    # SOURCE:
    #     provider_features
    #
    # USED FOR:
    #     total_beneficiaries
    #     average_claim_reimbursement
    # ============================================================

    def _get_historical_provider_features(
        self,
        provider_id: str,
    ) -> Optional[dict]:

        result = (
            supabase_service.client
            .table("provider_features")
            .select(
                """
                provider_id,
                total_beneficiaries,
                average_claim_reimbursement
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
            return None

        return result.data[0]

    # ============================================================
    # GET HISTORICAL PROVIDER RISK
    #
    # SOURCE:
    #     provider_risk
    #
    # USED FOR:
    #     fraud_risk_score
    #     waste_risk_score
    #     abuse_risk_score
    #     overall_fwa_score
    # ============================================================

    def _get_historical_provider_risk(
        self,
        provider_id: str,
    ) -> Optional[dict]:

        result = (
            supabase_service.client
            .table("provider_risk")
            .select(
                """
                provider_id,
                fraud_risk_score,
                waste_risk_score,
                abuse_risk_score,
                overall_fwa_score,
                fwa_risk_level,
                anomalous_claims,
                maximum_claim_anomaly_score,
                investigation_priority_score,
                investigation_priority
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
            return None

        return result.data[0]

    # ============================================================
    # GET HISTORICAL CLAIMS
    #
    # SOURCE:
    #     provider_claims
    #
    # IMPORTANT:
    #     This table is ONLY historical data.
    #
    #     The claims table is NOT used here.
    # ============================================================

    def _get_historical_claims(
        self,
        provider_id: str,
    ) -> list[dict]:

        result = (
            supabase_service.client
            .table("provider_claims")
            .select(
                """
                claim_id,
                provider_id,
                claim_type,
                claim_start_dt,
                total_claim_cost,
                claim_duration,
                beneficiary_age,
                claim_risk_tier,
                claim_anomaly_score,
                diagnosis_count,
                procedure_count,
                physician_count
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        return result.data or []

    # ============================================================
    # GET NEW PROVIDER CLAIMS
    #
    # SOURCE:
    #     claims
    #
    # Used only when provider has no historical summary.
    # ============================================================

    def _get_new_provider_claims(
        self,
        provider_id: str,
    ) -> list[dict]:

        result = (
            supabase_service.client
            .table("claims")
            .select(
                """
                claim_id,
                provider_id,
                claim_type,
                claim_start_date,
                total_claim_cost,
                claim_reimbursement,
                claim_duration,
                beneficiary_age,
                beneficiary_id,
                claim_risk_tier,
                claim_anomaly_score
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        return result.data or []

    # ============================================================
    # CALCULATE NEW PROVIDER RISK DISTRIBUTION
    # ============================================================

    @classmethod
    def _calculate_new_provider_risk_distribution(
        cls,
        claims: list[dict],
    ) -> dict:

        distribution = {
            "very_high_risk_claims": 0,
            "high_risk_claims": 0,
            "medium_risk_claims": 0,
            "low_risk_claims": 0,
        }

        for claim in claims:

            risk_tier = cls._normalize_risk_tier(
                claim.get(
                    "claim_risk_tier"
                )
            )

            if risk_tier == "Very High Risk":

                distribution[
                    "very_high_risk_claims"
                ] += 1

            elif risk_tier == "High Risk":

                distribution[
                    "high_risk_claims"
                ] += 1

            elif risk_tier == "Medium Risk":

                distribution[
                    "medium_risk_claims"
                ] += 1

            else:

                distribution[
                    "low_risk_claims"
                ] += 1

        return distribution

    # ============================================================
    # CALCULATE NEW PROVIDER BENEFICIARIES
    # ============================================================

    @staticmethod
    def _calculate_new_provider_beneficiaries(
        claims: list[dict],
    ) -> int:

        beneficiary_ids = set()

        for claim in claims:

            beneficiary_id = claim.get(
                "beneficiary_id"
            )

            if beneficiary_id is None:
                continue

            beneficiary_id = str(
                beneficiary_id
            ).strip()

            if beneficiary_id:
                beneficiary_ids.add(
                    beneficiary_id
                )

        return len(
            beneficiary_ids
        )

    # ============================================================
    # CALCULATE NEW PROVIDER AVERAGE REIMBURSEMENT
    # ============================================================

    @staticmethod
    def _calculate_new_provider_average_reimbursement(
        claims: list[dict],
    ) -> Optional[float]:

        values = []

        for claim in claims:

            value = claim.get(
                "claim_reimbursement"
            )

            if value is None:
                continue

            try:

                values.append(
                    float(value)
                )

            except (
                TypeError,
                ValueError,
            ):
                continue

        if not values:
            return None

        return round(
            sum(values) / len(values),
            2,
        )

    # ============================================================
    # GET PROVIDER RISK PROFILE
    # ============================================================

    def get_provider_risk_profile(
        self,
        provider_id: str,
    ) -> dict:

        # ========================================================
        # NORMALIZE PROVIDER ID
        # ========================================================

        provider_id = (
            provider_id
            .strip()
            .upper()
        )

        if not provider_id:

            raise ValueError(
                "Provider ID is required."
            )

        # ========================================================
        # VERIFY PROVIDER
        # ========================================================

        provider = self._get_provider(
            provider_id
        )

        # ========================================================
        # CHECK HISTORICAL SUMMARY
        #
        # IMPORTANT:
        #
        # If provider_claim_summary exists,
        # this is an EXISTING/HISTORICAL provider.
        #
        # Therefore we MUST NOT calculate the historical
        # profile from the claims table.
        # ========================================================

        historical_summary = (
            self._get_historical_claim_summary(
                provider_id
            )
        )

        # ========================================================
        # EXISTING / HISTORICAL PROVIDER
        # ========================================================

        if historical_summary:

            logger.info(
                "Loading historical risk profile "
                "for provider %s",
                provider_id,
            )

            # ====================================================
            # PROVIDER FEATURES
            # ====================================================

            provider_features = (
                self._get_historical_provider_features(
                    provider_id
                )
            )

            if provider_features is None:

                provider_features = {}

                logger.warning(
                    "No provider_features record found "
                    "for historical provider %s",
                    provider_id,
                )

            # ====================================================
            # PROVIDER RISK
            # ====================================================

            provider_risk = (
                self._get_historical_provider_risk(
                    provider_id
                )
            )

            if provider_risk is None:

                provider_risk = {}

                logger.warning(
                    "No provider_risk record found "
                    "for historical provider %s",
                    provider_id,
                )

            # ====================================================
            # HISTORICAL CLAIMS
            #
            # Fetching this verifies that the provider has
            # historical claim records available.
            #
            # The Risk Profile counts themselves still come
            # from provider_claim_summary.
            # ====================================================

            historical_claims = (
                self._get_historical_claims(
                    provider_id
                )
            )

            logger.info(
                "Historical provider %s: "
                "summary claims=%s, provider_claims rows=%s",
                provider_id,
                historical_summary.get(
                    "total_claims"
                ),
                len(historical_claims),
            )

            # ====================================================
            # TOTAL CLAIMS
            #
            # SOURCE:
            #     provider_claim_summary
            # ====================================================

            total_claims = int(
                historical_summary.get(
                    "total_claims"
                ) or 0
            )

            # ====================================================
            # RISK DISTRIBUTION
            #
            # SOURCE:
            #     provider_claim_summary
            # ====================================================

            very_high_risk_claims = int(
                historical_summary.get(
                    "very_high_risk_claims"
                ) or 0
            )

            high_risk_claims = int(
                historical_summary.get(
                    "high_risk_claims"
                ) or 0
            )

            medium_risk_claims = int(
                historical_summary.get(
                    "medium_risk_claims"
                ) or 0
            )

            low_risk_claims = int(
                historical_summary.get(
                    "low_risk_claims"
                ) or 0
            )

            # ====================================================
            # TOTAL BENEFICIARIES
            #
            # SOURCE:
            #     provider_features
            # ====================================================

            total_beneficiaries = int(
                provider_features.get(
                    "total_beneficiaries"
                ) or 0
            )

            # ====================================================
            # AVERAGE CLAIM REIMBURSEMENT
            #
            # SOURCE:
            #     provider_features
            # ====================================================

            average_claim_reimbursement = (
                provider_features.get(
                    "average_claim_reimbursement"
                )
            )

            if (
                average_claim_reimbursement
                is not None
            ):

                try:

                    average_claim_reimbursement = round(
                        float(
                            average_claim_reimbursement
                        ),
                        2,
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    average_claim_reimbursement = None

            # ====================================================
            # RISK SCORES
            #
            # SOURCE:
            #     provider_risk
            # ====================================================

            fraud_risk_score = (
                provider_risk.get(
                    "fraud_risk_score"
                )
            )

            waste_risk_score = (
                provider_risk.get(
                    "waste_risk_score"
                )
            )

            abuse_risk_score = (
                provider_risk.get(
                    "abuse_risk_score"
                )
            )

            overall_fwa_score = (
                provider_risk.get(
                    "overall_fwa_score"
                )
            )

            # ====================================================
            # FINAL HISTORICAL PROFILE
            # ====================================================

            return {

                "provider_id":
                    provider_id,

                "provider_name":
                    (
                        provider.get(
                            "provider_name"
                        )
                        or provider.get(
                            "name"
                        )
                    ),

                "location": {

                    "latitude":
                        provider.get(
                            "latitude"
                        ),

                    "longitude":
                        provider.get(
                            "longitude"
                        ),

                    "google_maps_url":
                        provider.get(
                            "google_maps_url"
                        ),
                },

                # ----------------------------------------------
                # provider_claim_summary
                # ----------------------------------------------

                "total_claims":
                    total_claims,

                "very_high_risk_claims":
                    very_high_risk_claims,

                "high_risk_claims":
                    high_risk_claims,

                "medium_risk_claims":
                    medium_risk_claims,

                "low_risk_claims":
                    low_risk_claims,

                # ----------------------------------------------
                # provider_features
                # ----------------------------------------------

                "total_beneficiaries":
                    total_beneficiaries,

                "average_claim_reimbursement":
                    average_claim_reimbursement,

                # ----------------------------------------------
                # provider_risk
                # ----------------------------------------------

                "fraud_risk_score":
                    fraud_risk_score,

                "waste_risk_score":
                    waste_risk_score,

                "abuse_risk_score":
                    abuse_risk_score,

                "overall_fwa_score":
                    overall_fwa_score,
            }

        # ========================================================
        # NEW PROVIDER
        #
        # No provider_claim_summary exists.
        #
        # Therefore use claims.
        # ========================================================

        logger.info(
            "Loading new provider risk profile "
            "for provider %s",
            provider_id,
        )

        new_claims = (
            self._get_new_provider_claims(
                provider_id
            )
        )

        # ========================================================
        # TOTAL CLAIMS
        # ========================================================

        total_claims = len(
            new_claims
        )

        # ========================================================
        # RISK DISTRIBUTION
        # ========================================================

        risk_distribution = (
            self._calculate_new_provider_risk_distribution(
                new_claims
            )
        )

        # ========================================================
        # BENEFICIARIES
        # ========================================================

        total_beneficiaries = (
            self._calculate_new_provider_beneficiaries(
                new_claims
            )
        )

        # ========================================================
        # AVERAGE REIMBURSEMENT
        # ========================================================

        average_claim_reimbursement = (
            self._calculate_new_provider_average_reimbursement(
                new_claims
            )
        )

        # ========================================================
        # PROVIDER RISK
        #
        # If provider_risk already exists, use it.
        # ========================================================

        provider_risk = (
            self._get_historical_provider_risk(
                provider_id
            )
        )

        provider_risk = (
            provider_risk
            if provider_risk
            else {}
        )

        # ========================================================
        # FINAL NEW PROVIDER PROFILE
        # ========================================================

        return {

            "provider_id":
                provider_id,

            "provider_name":
                (
                    provider.get(
                        "provider_name"
                    )
                    or provider.get(
                        "name"
                    )
                ),

            "location": {

                "latitude":
                    provider.get(
                        "latitude"
                    ),

                "longitude":
                    provider.get(
                        "longitude"
                    ),

                "google_maps_url":
                    provider.get(
                        "google_maps_url"
                    ),
            },

            "total_claims":
                total_claims,

            "total_beneficiaries":
                total_beneficiaries,

            "average_claim_reimbursement":
                average_claim_reimbursement,

            "very_high_risk_claims":
                risk_distribution[
                    "very_high_risk_claims"
                ],

            "high_risk_claims":
                risk_distribution[
                    "high_risk_claims"
                ],

            "medium_risk_claims":
                risk_distribution[
                    "medium_risk_claims"
                ],

            "low_risk_claims":
                risk_distribution[
                    "low_risk_claims"
                ],

            "fraud_risk_score":
                provider_risk.get(
                    "fraud_risk_score"
                ),

            "waste_risk_score":
                provider_risk.get(
                    "waste_risk_score"
                ),

            "abuse_risk_score":
                provider_risk.get(
                    "abuse_risk_score"
                ),

            "overall_fwa_score":
                provider_risk.get(
                    "overall_fwa_score"
                ),
        }


# ============================================================
# SINGLETON
# ============================================================

provider_risk_service = (
    ProviderRiskService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ProviderRiskService",
    "provider_risk_service",
]