"""
ClaimGuard AI
Provider Claims Service
"""

from __future__ import annotations

import logging
from statistics import median
from typing import Optional

from app.services.supabase_service import (
    supabase_service,
)


logger = logging.getLogger(__name__)


class ProviderClaimsService:

    SERVICE_NAME = "provider_claims_service"

    # ========================================================
    # CALCULATE RATIO
    # ========================================================

    @staticmethod
    def _calculate_ratio(
        claim_value,
        median_value,
    ) -> Optional[float]:

        if (
            claim_value is None
            or median_value is None
            or median_value == 0
        ):
            return None

        try:
            return round(
                float(claim_value)
                / float(median_value),
                2,
            )

        except (
            TypeError,
            ValueError,
            ZeroDivisionError,
        ):
            return None

    # ========================================================
    # CLASSIFY COMPARISON
    # ========================================================

    @staticmethod
    def _classify_comparison(
        claim_value,
        median_value,
        ratio,
    ) -> str:

        if (
            claim_value is None
            or median_value is None
        ):
            return "NOT_AVAILABLE"

        try:
            claim_value = float(
                claim_value
            )

            median_value = float(
                median_value
            )

        except (
            TypeError,
            ValueError,
        ):
            return "NOT_AVAILABLE"

        if (
            claim_value == 0
            and median_value == 0
        ):
            return "NO_VARIATION"

        if ratio is None:

            if claim_value > 0:
                return "HIGHER_THAN_TYPICAL"

            return "NO_VARIATION"

        if claim_value == median_value:
            return "TYPICAL"

        if claim_value > median_value:
            return "HIGHER_THAN_TYPICAL"

        return "LOWER_THAN_TYPICAL"

    # ========================================================
    # CALCULATE UNUSUALNESS
    # ========================================================

    @staticmethod
    def _calculate_unusualness(
        claim_value,
        median_value,
    ) -> float:

        if (
            claim_value is None
            or median_value is None
        ):
            return 0.0

        try:
            claim_value = float(
                claim_value
            )

            median_value = float(
                median_value
            )

        except (
            TypeError,
            ValueError,
        ):
            return 0.0

        if (
            claim_value == 0
            and median_value == 0
        ):
            return 0.0

        if median_value == 0:

            if claim_value > 0:
                return 1.0

            return 0.0

        deviation = (
            abs(
                claim_value
                - median_value
            )
            / abs(median_value)
        )

        return round(
            deviation,
            4,
        )

    # ========================================================
    # NORMALIZE RISK TIER
    #
    # Frontend values:
    #
    # All
    # Very High Risk
    # High Risk
    # Medium Risk
    # Low Risk
    # ========================================================

    @staticmethod
    def _normalize_risk_tier(
        value,
    ) -> str:

        if value is None:
            return "Low Risk"

        value = str(
            value
        ).strip()

        allowed_values = {
            "Very High Risk",
            "High Risk",
            "Medium Risk",
            "Low Risk",
        }

        if value in allowed_values:
            return value

        normalized = (
            value
            .lower()
            .replace("_", " ")
            .replace("-", " ")
        )

        normalized = " ".join(
            normalized.split()
        )

        if normalized == "very high risk":
            return "Very High Risk"

        if normalized == "high risk":
            return "High Risk"

        if normalized == "medium risk":
            return "Medium Risk"

        if normalized == "low risk":
            return "Low Risk"

        return "Low Risk"

    # ========================================================
    # NORMALIZE DATE
    #
    # provider_claims:
    #     claim_start_dt
    #
    # claims:
    #     claim_start_date
    #
    # API:
    #     claim_start_date
    # ========================================================

    @staticmethod
    def _normalize_claim_date(
        claim: dict,
    ):

        claim_start_date = claim.get(
            "claim_start_date"
        )

        if claim_start_date is not None:
            return claim_start_date

        return claim.get(
            "claim_start_dt"
        )

    # ========================================================
    # GET ALL HISTORICAL CLAIMS
    #
    # IMPORTANT:
    #
    # Supabase/PostgREST commonly limits responses
    # to 1000 rows.
    #
    # Therefore we explicitly paginate.
    #
    # IMPORTANT FIX:
    #
    # diagnosis_count
    # procedure_count
    # physician_count
    #
    # are included here because they are required
    # to calculate provider historical medians.
    # ========================================================

    def _get_all_historical_claims(
        self,
        provider_id: str,
    ) -> list[dict]:

        all_claims: list[dict] = []

        page_size = 1000
        page = 0

        while True:

            start = (
                page * page_size
            )

            end = (
                start
                + page_size
                - 1
            )

            logger.info(
                "Loading historical claims: "
                "provider=%s start=%s end=%s",
                provider_id,
                start,
                end,
            )

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
                .range(
                    start,
                    end,
                )
                .execute()
            )

            batch = (
                result.data
                or []
            )

            logger.info(
                "Historical claims batch loaded: "
                "provider=%s page=%s count=%s",
                provider_id,
                page,
                len(batch),
            )

            if not batch:
                break

            all_claims.extend(
                batch
            )

            if len(batch) < page_size:
                break

            page += 1

        logger.info(
            "TOTAL historical claims loaded: "
            "provider=%s total=%s",
            provider_id,
            len(all_claims),
        )

        return all_claims

    # ========================================================
    # GET PROVIDER HISTORICAL CLAIMS
    #
    # IMPORTANT:
    #
    # This method reads ONLY provider_claims.
    #
    # It does NOT merge claims from the claims table.
    #
    # Therefore the Historical Claims section contains
    # historical records only.
    # ========================================================

    def get_provider_claims(
        self,
        provider_id: str,
    ) -> dict:

        provider_id = (
            provider_id
            .strip()
            .upper()
        )

        # ====================================================
        # VERIFY PROVIDER
        # ====================================================

        provider_result = (
            supabase_service.client
            .table("providers")
            .select(
                "provider_id"
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        if not provider_result.data:

            raise ValueError(
                "Provider not found."
            )

        # ====================================================
        # LOAD ALL HISTORICAL CLAIMS
        # ====================================================

        historical_claims = (
            self._get_all_historical_claims(
                provider_id
            )
        )

        # ====================================================
        # SORT BY CLAIM DATE
        # ====================================================

        historical_claims.sort(
            key=lambda claim: (
                claim.get(
                    "claim_start_dt"
                )
                or ""
            ),
            reverse=True,
        )

        # ====================================================
        # RISK DISTRIBUTION
        # ====================================================

        risk_distribution = {

            "very_high_risk_claims":
                0,

            "high_risk_claims":
                0,

            "medium_risk_claims":
                0,

            "low_risk_claims":
                0,
        }

        # ====================================================
        # FORMATTED CLAIMS
        # ====================================================

        formatted_claims = []

        # ====================================================
        # FORMAT EACH CLAIM
        # ====================================================

        for claim in historical_claims:

            # ------------------------------------------------
            # BENEFICIARY AGE
            # ------------------------------------------------

            beneficiary_age = (
                claim.get(
                    "beneficiary_age"
                )
            )

            if beneficiary_age is not None:

                try:

                    beneficiary_age = round(
                        float(
                            beneficiary_age
                        )
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    beneficiary_age = None

            # ------------------------------------------------
            # RISK
            # ------------------------------------------------

            risk_tier = (
                self._normalize_risk_tier(
                    claim.get(
                        "claim_risk_tier"
                    )
                )
            )

            # ------------------------------------------------
            # RISK COUNTERS
            # ------------------------------------------------

            if risk_tier == "Very High Risk":

                risk_distribution[
                    "very_high_risk_claims"
                ] += 1

            elif risk_tier == "High Risk":

                risk_distribution[
                    "high_risk_claims"
                ] += 1

            elif risk_tier == "Medium Risk":

                risk_distribution[
                    "medium_risk_claims"
                ] += 1

            else:

                risk_distribution[
                    "low_risk_claims"
                ] += 1

            # ------------------------------------------------
            # DATE
            # ------------------------------------------------

            claim_start_date = (
                claim.get(
                    "claim_start_dt"
                )
            )

            # ------------------------------------------------
            # FORMATTED CLAIM
            # ------------------------------------------------

            formatted_claims.append({

                "claim_id":
                    claim.get(
                        "claim_id"
                    ),

                "claim_type":
                    claim.get(
                        "claim_type"
                    ),

                "claim_start_date":
                    claim_start_date,

                "total_claim_cost":
                    claim.get(
                        "total_claim_cost"
                    ),

                "claim_duration":
                    claim.get(
                        "claim_duration"
                    ),

                "beneficiary_age":
                    beneficiary_age,

                "status":
                    risk_tier,

                "claim_risk_tier":
                    risk_tier,

                "claim_anomaly_score":
                    claim.get(
                        "claim_anomaly_score"
                    ),

                "source":
                    "HISTORICAL",
            })

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        return {

            "provider_id":
                provider_id,

            "total_claims":
                len(
                    formatted_claims
                ),

            "risk_distribution":
                risk_distribution,

            "claims":
                formatted_claims,
        }

    # ========================================================
    # GET SINGLE CLAIM DETAILS
    #
    # SEARCH ORDER:
    #
    # 1. claims
    # 2. provider_claims
    #
    # This allows both new and historical claims
    # to be opened.
    # ========================================================

    def get_claim_details(
        self,
        provider_id: str,
        claim_id: str,
    ) -> dict:

        provider_id = (
            provider_id
            .strip()
            .upper()
        )

        claim_id = (
            claim_id
            .strip()
            .upper()
        )

        # ====================================================
        # SEARCH NEW CLAIMS
        # ====================================================

        claim_result = (
            supabase_service.client
            .table("claims")
            .select(
                """
                claim_id,
                provider_id,
                claim_type,
                claim_start_date,
                claim_duration,
                claim_reimbursement,
                total_claim_cost,
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
            .eq(
                "claim_id",
                claim_id,
            )
            .limit(1)
            .execute()
        )

        claim_source = (
            "NEW_SUBMISSION"
        )

        # ====================================================
        # FALLBACK TO HISTORICAL
        # ====================================================

        if not claim_result.data:

            claim_result = (
                supabase_service.client
                .table("provider_claims")
                .select(
                    """
                    claim_id,
                    provider_id,
                    claim_type,
                    claim_start_dt,
                    claim_duration,
                    total_claim_cost,
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
                .eq(
                    "claim_id",
                    claim_id,
                )
                .limit(1)
                .execute()
            )

            claim_source = (
                "HISTORICAL"
            )

        # ====================================================
        # CLAIM NOT FOUND
        # ====================================================

        if not claim_result.data:

            raise ValueError(
                "Claim not found "
                "for this provider."
            )

        claim = dict(
            claim_result.data[0]
        )

        # ====================================================
        # NORMALIZE DATE
        # ====================================================

        claim["claim_start_date"] = (
            self._normalize_claim_date(
                claim
            )
        )

        # ====================================================
        # NORMALIZE RISK
        # ====================================================

        claim["claim_risk_tier"] = (
            self._normalize_risk_tier(
                claim.get(
                    "claim_risk_tier"
                )
            )
        )

        # ====================================================
        # LOAD ALL HISTORICAL CLAIMS
        #
        # This now includes:
        #
        # diagnosis_count
        # procedure_count
        # physician_count
        #
        # and is paginated beyond 1000 rows.
        # ====================================================

        historical_claims = (
            self._get_all_historical_claims(
                provider_id
            )
        )

        # ====================================================
        # EXCLUDE CURRENT HISTORICAL CLAIM
        #
        # When viewing a historical claim, we don't want
        # that claim itself to affect its provider median.
        #
        # For NEW_SUBMISSION, all historical claims are
        # retained in the baseline.
        # ====================================================

        if claim_source == "HISTORICAL":

            historical_claims = [

                row

                for row in historical_claims

                if row.get(
                    "claim_id"
                ) != claim_id
            ]

        # ====================================================
        # NUMERIC VALUE HELPER
        # ====================================================

        def numeric_values(
            field_name: str,
        ) -> list[float]:

            values: list[float] = []

            for row in historical_claims:

                value = row.get(
                    field_name
                )

                if value is None:
                    continue

                try:

                    values.append(
                        float(
                            value
                        )
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue

            return values

        # ====================================================
        # HISTORICAL FEATURE VALUES
        # ====================================================

        diagnosis_values = (
            numeric_values(
                "diagnosis_count"
            )
        )

        procedure_values = (
            numeric_values(
                "procedure_count"
            )
        )

        physician_values = (
            numeric_values(
                "physician_count"
            )
        )

        claim_cost_values = (
            numeric_values(
                "total_claim_cost"
            )
        )

        duration_values = (
            numeric_values(
                "claim_duration"
            )
        )

        # ====================================================
        # PROVIDER MEDIANS
        # ====================================================

        provider_medians = {

            "diagnosis_count":
                (
                    median(
                        diagnosis_values
                    )
                    if diagnosis_values
                    else None
                ),

            "procedure_count":
                (
                    median(
                        procedure_values
                    )
                    if procedure_values
                    else None
                ),

            "physician_count":
                (
                    median(
                        physician_values
                    )
                    if physician_values
                    else None
                ),

            "total_claim_cost":
                (
                    median(
                        claim_cost_values
                    )
                    if claim_cost_values
                    else None
                ),

            "claim_duration":
                (
                    median(
                        duration_values
                    )
                    if duration_values
                    else None
                ),
        }

        # ====================================================
        # LOG MEDIAN SOURCE COUNTS
        # ====================================================

        logger.info(
            "Historical baseline for provider=%s: "
            "claims=%s diagnosis=%s procedure=%s "
            "physician=%s cost=%s duration=%s",
            provider_id,
            len(historical_claims),
            len(diagnosis_values),
            len(procedure_values),
            len(physician_values),
            len(claim_cost_values),
            len(duration_values),
        )

        # ====================================================
        # BUILD COMPARISON
        # ====================================================

        def build_comparison(
            field_name: str,
        ) -> dict:

            claim_value = claim.get(
                field_name
            )

            median_value = (
                provider_medians[
                    field_name
                ]
            )

            ratio = (
                self._calculate_ratio(
                    claim_value,
                    median_value,
                )
            )

            comparison = (
                self._classify_comparison(
                    claim_value,
                    median_value,
                    ratio,
                )
            )

            unusualness = (
                self._calculate_unusualness(
                    claim_value,
                    median_value,
                )
            )

            return {

                "claim_value":
                    claim_value,

                "provider_median":
                    median_value,

                "ratio":
                    ratio,

                "comparison":
                    comparison,

                "unusualness":
                    unusualness,
            }

        # ====================================================
        # ALL COMPARISONS
        # ====================================================

        comparisons = {

            "diagnosis_count":
                build_comparison(
                    "diagnosis_count"
                ),

            "procedure_count":
                build_comparison(
                    "procedure_count"
                ),

            "physician_count":
                build_comparison(
                    "physician_count"
                ),

            "total_claim_cost":
                build_comparison(
                    "total_claim_cost"
                ),

            "claim_duration":
                build_comparison(
                    "claim_duration"
                ),
        }

        # ====================================================
        # FEATURE NAMES
        # ====================================================

        feature_names = {

            "diagnosis_count":
                "Diagnosis Count",

            "procedure_count":
                "Procedure Count",

            "physician_count":
                "Physician Count",

            "total_claim_cost":
                "Total Claim Cost",

            "claim_duration":
                "Claim Duration",
        }

        # ====================================================
        # TOP UNUSUAL FACTORS
        #
        # Only higher-than-typical values are treated as
        # suspicious indicators here.
        # ====================================================

        unusual_factors = []

        for (
            field_name,
            comparison,
        ) in comparisons.items():

            if (
                comparison[
                    "comparison"
                ]
                != "HIGHER_THAN_TYPICAL"
            ):
                continue

            unusual_factors.append({

                "feature":
                    feature_names[
                        field_name
                    ],

                "field":
                    field_name,

                "claim_value":
                    comparison[
                        "claim_value"
                    ],

                "provider_median":
                    comparison[
                        "provider_median"
                    ],

                "ratio":
                    comparison[
                        "ratio"
                    ],

                "unusualness":
                    comparison[
                        "unusualness"
                    ],
            })

        unusual_factors.sort(
            key=lambda item: (
                item[
                    "unusualness"
                ]
            ),
            reverse=True,
        )

        top_unusual_factors = (
            unusual_factors[:3]
        )

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        return {

            "claim_id":
                claim.get(
                    "claim_id"
                ),

            "provider_id":
                claim.get(
                    "provider_id"
                ),

            "claim_type":
                claim.get(
                    "claim_type"
                ),

            "claim_start_date":
                claim.get(
                    "claim_start_date"
                ),

            "total_claim_cost":
                claim.get(
                    "total_claim_cost"
                ),

            "claim_duration":
                claim.get(
                    "claim_duration"
                ),

            "beneficiary_age":
                claim.get(
                    "beneficiary_age"
                ),

            "claim_risk_tier":
                claim.get(
                    "claim_risk_tier"
                ),

            "claim_anomaly_score":
                claim.get(
                    "claim_anomaly_score"
                ),

            "diagnosis_count":
                claim.get(
                    "diagnosis_count"
                ),

            "procedure_count":
                claim.get(
                    "procedure_count"
                ),

            "physician_count":
                claim.get(
                    "physician_count"
                ),

            "source":
                claim_source,

            "historical_claim_count":
                len(
                    historical_claims
                ),

            "provider_medians":
                provider_medians,

            "comparisons":
                comparisons,

            "top_unusual_factors":
                top_unusual_factors,
        }


# ============================================================
# SINGLETON
# ============================================================

provider_claims_service = (
    ProviderClaimsService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ProviderClaimsService",
    "provider_claims_service",
]