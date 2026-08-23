"""
ClaimGuard AI
FWA Risk Calculation Service

Reproduces the FWA calculations from the FWA notebook:

    Fraud Risk
    Waste Risk
    Abuse Risk
    Overall FWA Risk
    Claim anomaly evidence
    Investigation Priority

IMPORTANT:
- Waste risk uses training-only peer statistics.
- Abuse percentile scores require the historical provider population.
- No new formulas are invented here.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.services.supabase_service import supabase_service


logger = logging.getLogger(__name__)


class FWARiskService:

    SERVICE_NAME = "fwa_risk_service"

    # ========================================================
    # FWA WEIGHTS FROM NOTEBOOK
    # ========================================================

    FRAUD_WEIGHT = 0.50
    WASTE_WEIGHT = 0.25
    ABUSE_WEIGHT = 0.25

    # ========================================================
    # INVESTIGATION PRIORITY WEIGHTS
    # ========================================================

    FWA_PRIORITY_WEIGHT = 0.70
    CLAIM_ANOMALY_RATE_WEIGHT = 0.20
    MAX_CLAIM_ANOMALY_WEIGHT = 0.10

    # ========================================================
    # RISK SCORE BOUNDARIES
    # ========================================================

    LOW_MAX = 30.0
    MEDIUM_MAX = 60.0
    HIGH_MAX = 80.0

    # ========================================================
    # HISTORICAL PROVIDER REFERENCE
    # ========================================================

    BASE_DIR = Path(__file__).resolve().parents[2]

    REFERENCE_PATH = (
        BASE_DIR
        / "models"
        / "provider_fwa_reference.csv"
    )

    def __init__(self) -> None:

        self.reference_df: pd.DataFrame | None = None

        self._load_reference_data()

    # ========================================================
    # LOAD HISTORICAL REFERENCE DATA
    # ========================================================

    def _load_reference_data(self) -> None:
        """
        Load the historical provider population used for
        percentile-based Abuse Risk calculations.

        This must contain the historical provider-level
        values from the notebook.
        """

        if not self.REFERENCE_PATH.exists():

            logger.warning(
                "FWA reference file not found: %s",
                self.REFERENCE_PATH,
            )

            self.reference_df = None

            return

        try:

            df = pd.read_csv(
                self.REFERENCE_PATH
            )

            required_columns = [
                "ClaimsPerUniquePhysician",
                "ClaimsPerBeneficiary",
                "ClaimAnomalyRate",
            ]

            missing = [
                column
                for column in required_columns
                if column not in df.columns
            ]

            if missing:

                raise ValueError(
                    "FWA reference file is missing "
                    f"columns: {missing}"
                )

            self.reference_df = df

            logger.info(
                "Loaded FWA reference data: %s rows",
                len(df),
            )

        except Exception:

            logger.exception(
                "Unable to load FWA reference data."
            )

            raise

    # ========================================================
    # GENERIC SCORE TIER
    # ========================================================

    @classmethod
    def _risk_tier(
        cls,
        score: float,
    ) -> str:

        score = float(score)

        if score <= cls.LOW_MAX:
            return "Low"

        if score <= cls.MEDIUM_MAX:
            return "Medium"

        if score <= cls.HIGH_MAX:
            return "High"

        return "Critical"

    # ========================================================
    # PERCENTILE
    # ========================================================

    def _historical_percentile(
        self,
        column: str,
        value: float,
    ) -> float:
        """
        Reproduce pandas:

            series.rank(pct=True) * 100

        using the historical provider population.

        For a new provider, the provider itself is not added
        to the reference population.
        """

        if self.reference_df is None:

            raise RuntimeError(
                "Historical FWA reference data is not loaded. "
                f"Expected file: {self.REFERENCE_PATH}"
            )

        series = pd.to_numeric(
            self.reference_df[column],
            errors="coerce",
        ).dropna()

        if series.empty:

            return 0.0

        value = float(value)

        # Equivalent percentile based on the historical
        # population. We use average-rank semantics.
        combined = pd.concat(
            [
                series.reset_index(drop=True),
                pd.Series([value]),
            ],
            ignore_index=True,
        )

        percentile = (
            combined.rank(
                pct=True,
                method="average",
            ).iloc[-1]
            * 100
        )

        return float(percentile)

    # ========================================================
    # WASTE RISK
    # ========================================================

    def calculate_waste_risk(
        self,
        *,
        peer_group: str,
        average_claim_reimbursement: float,
        claims_per_beneficiary: float,
        reimbursement_per_beneficiary: float,
    ) -> dict[str, Any]:
        """
        Reproduce notebook STEP 28B–28H.

        Peer statistics come from provider_peer_stats.
        """

        peer_group = (
            peer_group
            .strip()
        )

        result = (
            supabase_service.client
            .table("provider_peer_stats")
            .select(
                """
                peer_group,
                average_claim_reimbursement_mean,
                average_claim_reimbursement_std,
                claims_per_beneficiary_mean,
                claims_per_beneficiary_std,
                reimbursement_per_beneficiary_mean,
                reimbursement_per_beneficiary_std
                """
            )
            .eq(
                "peer_group",
                peer_group,
            )
            .limit(1)
            .execute()
        )

        if not result.data:

            raise ValueError(
                f"No peer statistics found for "
                f"peer group '{peer_group}'."
            )

        peer = result.data[0]

        avg_reimbursement_mean = float(
            peer[
                "average_claim_reimbursement_mean"
            ]
        )

        avg_reimbursement_std = float(
            peer[
                "average_claim_reimbursement_std"
            ]
        )

        claims_per_beneficiary_mean = float(
            peer[
                "claims_per_beneficiary_mean"
            ]
        )

        claims_per_beneficiary_std = float(
            peer[
                "claims_per_beneficiary_std"
            ]
        )

        reimbursement_per_beneficiary_mean = float(
            peer[
                "reimbursement_per_beneficiary_mean"
            ]
        )

        reimbursement_per_beneficiary_std = float(
            peer[
                "reimbursement_per_beneficiary_std"
            ]
        )

        # ----------------------------------------------------
        # Protect against zero standard deviation
        # ----------------------------------------------------

        avg_reimbursement_std = (
            avg_reimbursement_std
            if avg_reimbursement_std != 0
            else 1.0
        )

        claims_per_beneficiary_std = (
            claims_per_beneficiary_std
            if claims_per_beneficiary_std != 0
            else 1.0
        )

        reimbursement_per_beneficiary_std = (
            reimbursement_per_beneficiary_std
            if reimbursement_per_beneficiary_std != 0
            else 1.0
        )

        # ----------------------------------------------------
        # NOTEBOOK Z-SCORES
        # ----------------------------------------------------

        avg_reimbursement_z = (
            float(average_claim_reimbursement)
            - avg_reimbursement_mean
        ) / avg_reimbursement_std

        claims_per_beneficiary_z = (
            float(claims_per_beneficiary)
            - claims_per_beneficiary_mean
        ) / claims_per_beneficiary_std

        reimbursement_per_beneficiary_z = (
            float(reimbursement_per_beneficiary)
            - reimbursement_per_beneficiary_mean
        ) / reimbursement_per_beneficiary_std

        # ----------------------------------------------------
        # NOTEBOOK positive_z_to_100()
        # ----------------------------------------------------

        def positive_z_to_100(
            value: float,
        ) -> float:

            return (
                np.clip(
                    value,
                    0,
                    3,
                )
                / 3
                * 100
            )

        reimbursement_score = (
            positive_z_to_100(
                avg_reimbursement_z
            )
        )

        claims_per_beneficiary_score = (
            positive_z_to_100(
                claims_per_beneficiary_z
            )
        )

        reimbursement_per_beneficiary_score = (
            positive_z_to_100(
                reimbursement_per_beneficiary_z
            )
        )

        # ----------------------------------------------------
        # NOTEBOOK WASTE RISK SCORE
        # ----------------------------------------------------

        waste_risk_score = (
            0.40
            * reimbursement_score

            + 0.25
            * claims_per_beneficiary_score

            + 0.35
            * reimbursement_per_beneficiary_score
        )

        waste_risk_score = float(
            np.clip(
                waste_risk_score,
                0,
                100,
            )
        )

        waste_risk_score = round(
            waste_risk_score,
            2,
        )

        return {

            "peer_group":
                peer_group,

            "waste_avg_claim_reimbursement_z":
                float(avg_reimbursement_z),

            "waste_claims_per_beneficiary_z":
                float(claims_per_beneficiary_z),

            "waste_reimbursement_per_beneficiary_z":
                float(
                    reimbursement_per_beneficiary_z
                ),

            "waste_reimbursement_score":
                round(
                    float(
                        reimbursement_score
                    ),
                    2,
                ),

            "waste_claims_per_beneficiary_score":
                round(
                    float(
                        claims_per_beneficiary_score
                    ),
                    2,
                ),

            "waste_reimbursement_per_beneficiary_score":
                round(
                    float(
                        reimbursement_per_beneficiary_score
                    ),
                    2,
                ),

            "waste_risk_score":
                waste_risk_score,

            "waste_risk_tier":
                self._risk_tier(
                    waste_risk_score
                ),
        }

    # ========================================================
    # ABUSE RISK
    # ========================================================

    def calculate_abuse_risk(
        self,
        *,
        claims_per_unique_physician: float,
        repeat_beneficiary_rate: float,
        claims_per_beneficiary: float,
        claim_anomaly_rate: float,
    ) -> dict[str, Any]:
        """
        Reproduce notebook STEP 29D–29L.
        """

        physician_score = (
            self._historical_percentile(
                "ClaimsPerUniquePhysician",
                claims_per_unique_physician,
            )
        )

        claims_per_beneficiary_score = (
            self._historical_percentile(
                "ClaimsPerBeneficiary",
                claims_per_beneficiary,
            )
        )

        claim_anomaly_score = (
            self._historical_percentile(
                "ClaimAnomalyRate",
                claim_anomaly_rate,
            )
        )

        repeat_beneficiary_score = (
            np.clip(
                float(repeat_beneficiary_rate),
                0,
                1,
            )
            * 100
        )

        # ----------------------------------------------------
        # NOTEBOOK ABUSE SCORE
        # ----------------------------------------------------

        abuse_risk_score = (
            0.30
            * physician_score

            + 0.25
            * repeat_beneficiary_score

            + 0.20
            * claims_per_beneficiary_score

            + 0.25
            * claim_anomaly_score
        )

        abuse_risk_score = float(
            np.clip(
                abuse_risk_score,
                0,
                100,
            )
        )

        abuse_risk_score = round(
            abuse_risk_score,
            2,
        )

        return {

            "abuse_physician_concentration_score":
                round(
                    float(
                        physician_score
                    ),
                    2,
                ),

            "abuse_repeat_beneficiary_score":
                round(
                    float(
                        repeat_beneficiary_score
                    ),
                    2,
                ),

            "abuse_claims_per_beneficiary_score":
                round(
                    float(
                        claims_per_beneficiary_score
                    ),
                    2,
                ),

            "abuse_claim_anomaly_score":
                round(
                    float(
                        claim_anomaly_score
                    ),
                    2,
                ),

            "abuse_risk_score":
                abuse_risk_score,

            "abuse_risk_tier":
                self._risk_tier(
                    abuse_risk_score
                ),
        }

    # ========================================================
    # OVERALL FWA
    # ========================================================

    def calculate_overall_fwa(
        self,
        *,
        fraud_probability: float,
        waste_risk_score: float,
        abuse_risk_score: float,
    ) -> dict[str, Any]:
        """
        Reproduce notebook STEP 30A–30D.
        """

        fraud_risk_score = (
            float(fraud_probability)
            * 100
        )

        overall_fwa_score = (
            self.FRAUD_WEIGHT
            * fraud_risk_score

            + self.WASTE_WEIGHT
            * float(waste_risk_score)

            + self.ABUSE_WEIGHT
            * float(abuse_risk_score)
        )

        overall_fwa_score = float(
            np.clip(
                overall_fwa_score,
                0,
                100,
            )
        )

        overall_fwa_score = round(
            overall_fwa_score,
            2,
        )

        return {

            "fraud_risk_score":
                round(
                    fraud_risk_score,
                    2,
                ),

            "overall_fwa_score":
                overall_fwa_score,

            "overall_fwa_tier":
                self._risk_tier(
                    overall_fwa_score
                ),
        }

    # ========================================================
    # INVESTIGATION PRIORITY
    # ========================================================

    def calculate_investigation_priority(
        self,
        *,
        overall_fwa_score: float,
        anomalous_claims: int,
        total_claims: int,
        maximum_claim_anomaly_score: float,
    ) -> dict[str, Any]:
        """
        Reproduce notebook STEP 31A–31D.
        """

        total_claims = int(total_claims)

        if total_claims > 0:

            claim_anomaly_rate = (
                float(anomalous_claims)
                / float(total_claims)
            )

        else:

            claim_anomaly_rate = 0.0

        investigation_priority_score = (
            self.FWA_PRIORITY_WEIGHT
            * float(overall_fwa_score)

            + self.CLAIM_ANOMALY_RATE_WEIGHT
            * (
                np.clip(
                    claim_anomaly_rate,
                    0,
                    1,
                )
                * 100
            )

            + self.MAX_CLAIM_ANOMALY_WEIGHT
            * float(maximum_claim_anomaly_score)
        )

        investigation_priority_score = float(
            np.clip(
                investigation_priority_score,
                0,
                100,
            )
        )

        investigation_priority_score = round(
            investigation_priority_score,
            2,
        )

        return {

            "anomalous_claims":
                int(anomalous_claims),

            "total_claims":
                total_claims,

            "claim_anomaly_rate":
                round(
                    claim_anomaly_rate,
                    4,
                ),

            "maximum_claim_anomaly_score":
                round(
                    float(
                        maximum_claim_anomaly_score
                    ),
                    2,
                ),

            "investigation_priority_score":
                investigation_priority_score,

            "investigation_priority":
                self._risk_tier(
                    investigation_priority_score
                ),
        }

    # ========================================================
    # COMPLETE FWA ASSESSMENT
    # ========================================================

    def assess_provider_fwa(
        self,
        *,
        fraud_probability: float,
        peer_group: str,
        average_claim_reimbursement: float,
        claims_per_beneficiary: float,
        reimbursement_per_beneficiary: float,
        claims_per_unique_physician: float,
        repeat_beneficiary_rate: float,
        claim_anomaly_rate: float,
        anomalous_claims: int,
        total_claims: int,
        maximum_claim_anomaly_score: float,
    ) -> dict[str, Any]:
        """
        Execute the complete notebook-equivalent FWA pipeline.
        """

        # ----------------------------------------------------
        # WASTE
        # ----------------------------------------------------

        waste = self.calculate_waste_risk(
            peer_group=peer_group,
            average_claim_reimbursement=(
                average_claim_reimbursement
            ),
            claims_per_beneficiary=(
                claims_per_beneficiary
            ),
            reimbursement_per_beneficiary=(
                reimbursement_per_beneficiary
            ),
        )

        # ----------------------------------------------------
        # ABUSE
        # ----------------------------------------------------

        abuse = self.calculate_abuse_risk(
            claims_per_unique_physician=(
                claims_per_unique_physician
            ),
            repeat_beneficiary_rate=(
                repeat_beneficiary_rate
            ),
            claims_per_beneficiary=(
                claims_per_beneficiary
            ),
            claim_anomaly_rate=(
                claim_anomaly_rate
            ),
        )

        # ----------------------------------------------------
        # OVERALL FWA
        # ----------------------------------------------------

        overall = self.calculate_overall_fwa(
            fraud_probability=fraud_probability,
            waste_risk_score=(
                waste["waste_risk_score"]
            ),
            abuse_risk_score=(
                abuse["abuse_risk_score"]
            ),
        )

        # ----------------------------------------------------
        # INVESTIGATION PRIORITY
        # ----------------------------------------------------

        priority = (
            self.calculate_investigation_priority(
                overall_fwa_score=(
                    overall["overall_fwa_score"]
                ),
                anomalous_claims=(
                    anomalous_claims
                ),
                total_claims=(
                    total_claims
                ),
                maximum_claim_anomaly_score=(
                    maximum_claim_anomaly_score
                ),
            )
        )

        return {

            # Fraud
            "fraud_probability":
                float(fraud_probability),

            "fraud_risk_score":
                overall["fraud_risk_score"],

            # Waste
            "waste_risk_score":
                waste["waste_risk_score"],

            "waste_risk_tier":
                waste["waste_risk_tier"],

            "waste_peer_group":
                waste["peer_group"],

            "waste_avg_claim_reimbursement_z":
                waste[
                    "waste_avg_claim_reimbursement_z"
                ],

            "waste_claims_per_beneficiary_z":
                waste[
                    "waste_claims_per_beneficiary_z"
                ],

            "waste_reimbursement_per_beneficiary_z":
                waste[
                    "waste_reimbursement_per_beneficiary_z"
                ],

            # Abuse
            "abuse_risk_score":
                abuse["abuse_risk_score"],

            "abuse_risk_tier":
                abuse["abuse_risk_tier"],

            "abuse_physician_concentration_score":
                abuse[
                    "abuse_physician_concentration_score"
                ],

            "abuse_repeat_beneficiary_score":
                abuse[
                    "abuse_repeat_beneficiary_score"
                ],

            "abuse_claims_per_beneficiary_score":
                abuse[
                    "abuse_claims_per_beneficiary_score"
                ],

            "abuse_claim_anomaly_score":
                abuse[
                    "abuse_claim_anomaly_score"
                ],

            # Overall FWA
            "overall_fwa_score":
                overall["overall_fwa_score"],

            "overall_fwa_tier":
                overall["overall_fwa_tier"],

            # Claim evidence
            "anomalous_claims":
                priority["anomalous_claims"],

            "total_claims":
                priority["total_claims"],

            "claim_anomaly_rate":
                priority["claim_anomaly_rate"],

            "maximum_claim_anomaly_score":
                priority[
                    "maximum_claim_anomaly_score"
                ],

            # Investigation
            "investigation_priority_score":
                priority[
                    "investigation_priority_score"
                ],

            "investigation_priority":
                priority[
                    "investigation_priority"
                ],
        }


# ============================================================
# SINGLETON
# ============================================================

fwa_risk_service = FWARiskService()


__all__ = [
    "FWARiskService",
    "fwa_risk_service",
]