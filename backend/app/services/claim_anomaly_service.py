"""
ClaimGuard AI
Claim-Level Anomaly Detection Service
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from app.services.supabase_service import (
    supabase_service,
)


class ClaimAnomalyService:

    SERVICE_NAME = "claim_anomaly_service"

    # ========================================================
    # EXACT MODEL FEATURES
    # ========================================================

    MODEL_FEATURES = [
        "ClaimDurationDays",
        "ClaimReimbursement",
        "ClaimDeductible",
        "TotalClaimCost",
        "ReimbursementPerClaimDay",
        "BeneficiaryAge",
        "ChronicConditionCount",
        "DiagnosisCodeCount",
        "ProcedureCodeCount",
        "PhysicianCount",
        "Log_ClaimReimbursement_vs_ProviderMean",
        "Log_ClaimReimbursement_vs_ProviderMedian",
        "Log_ReimbursementPerClaimDay_vs_ProviderMean",
        "Log_ClaimDuration_vs_ProviderMean",
        "Log_DiagnosisCount_vs_ProviderMean",
        "Log_PhysicianCount_vs_ProviderMean",
        "Abs_BeneficiaryAge_vs_ProviderMean",
        "Abs_ChronicConditions_vs_ProviderMean",
    ]

    # ========================================================
    # MODEL PATH
    # ========================================================

    MODEL_PATH = Path(
        os.getenv(
            "CLAIM_ISOLATION_FOREST_PATH",
            str(
                Path(__file__).resolve().parents[2]
                / "models"
                / "claim_isolation_forest.pkl"
            ),
        )
    )

    # ========================================================
    # MINIMUM HISTORY
    # ========================================================

    MINIMUM_CLAIMS = 2

    # ========================================================
    # RISK THRESHOLDS
    #
    # These are application-level thresholds.
    # They are NOT medical/legal thresholds.
    # ========================================================

    LOW_MAX = 30
    MEDIUM_MAX = 60
    HIGH_MAX = 80

    # ========================================================
    # LOAD MODEL
    # ========================================================

    _model = None

    @classmethod
    def _get_model(cls):

        if cls._model is None:

            if not cls.MODEL_PATH.exists():

                raise FileNotFoundError(
                    "Claim Isolation Forest model "
                    f"not found at: {cls.MODEL_PATH}"
                )

            cls._model = joblib.load(
                cls.MODEL_PATH
            )

        return cls._model

    # ========================================================
    # SAFE NUMBER
    # ========================================================

    @staticmethod
    def _number(
        value: Any,
        default: float = 0.0,
    ) -> float:

        if value is None:
            return default

        try:

            number = float(value)

            if not np.isfinite(number):
                return default

            return number

        except (
            TypeError,
            ValueError,
        ):

            return default

    # ========================================================
    # MEAN
    # ========================================================

    @classmethod
    def _mean(
        cls,
        values: list[Any],
    ) -> float:

        numbers = [
            cls._number(value)
            for value in values
            if value is not None
        ]

        if not numbers:
            return 0.0

        return sum(numbers) / len(numbers)

    # ========================================================
    # MEDIAN
    # ========================================================

    @classmethod
    def _median(
        cls,
        values: list[Any],
    ) -> float:

        numbers = sorted(
            [
                cls._number(value)
                for value in values
                if value is not None
            ]
        )

        if not numbers:
            return 0.0

        count = len(numbers)
        middle = count // 2

        if count % 2 == 1:
            return numbers[middle]

        return (
            numbers[middle - 1]
            + numbers[middle]
        ) / 2

    # ========================================================
    # ANOMALY SCORE -> 0-100
    #
    # IMPORTANT:
    #
    # IsolationForest.decision_function():
    #
    # higher score = more normal
    # lower score  = more anomalous
    #
    # We first negate it:
    #
    # claim_anomaly_score = -isolation_score
    #
    # Therefore:
    #
    # higher anomaly score = more suspicious
    #
    # The 0-100 score below is an application display score.
    # It does NOT change the trained model.
    # ========================================================

    @staticmethod
    def _score_to_100(
        claim_anomaly_score: float,
    ) -> float:

        score = float(
            claim_anomaly_score
        )

        # ----------------------------------------------------
        # Isolation Forest scores normally occur around
        # a relatively small numerical range.
        #
        # We clamp the raw anomaly score to a practical
        # display range before converting to 0-100.
        # ----------------------------------------------------

        MIN_SCORE = -0.50
        MAX_SCORE = 0.50

        score = max(
            MIN_SCORE,
            min(
                MAX_SCORE,
                score,
            ),
        )

        normalized = (
            (score - MIN_SCORE)
            / (MAX_SCORE - MIN_SCORE)
        )

        score_100 = (
            normalized * 100.0
        )

        return round(
            score_100,
            2,
        )

    # ========================================================
    # RISK TIER
    # ========================================================

    @classmethod
    def _risk_tier(
        cls,
        score_100: float,
    ) -> str:
        if score_100 <= cls.LOW_MAX:
            return "Low Risk"
        if score_100 <= cls.MEDIUM_MAX:
            return "Medium Risk"
        if score_100 <= cls.HIGH_MAX:
            return "High Risk"
        return "Very High Risk"
    # ========================================================
    # FETCH PROVIDER CLAIMS
    # ========================================================

    def _get_provider_claims(
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
                claim_reimbursement,
                claim_deductible,
                total_claim_cost,
                claim_duration,
                beneficiary_age,
                chronic_condition_count,
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

    # ========================================================
    # GET TARGET CLAIM
    # ========================================================

    def _get_claim(
        self,
        claim_id: str,
        provider_id: str,
    ) -> dict:

        result = (
            supabase_service.client
            .table("claims")
            .select(
                """
                claim_id,
                provider_id,
                claim_type,
                claim_reimbursement,
                claim_deductible,
                total_claim_cost,
                claim_duration,
                beneficiary_age,
                chronic_condition_count,
                diagnosis_count,
                procedure_count,
                physician_count
                """
            )
            .eq(
                "claim_id",
                claim_id,
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
                "Claim not found for provider."
            )

        return result.data[0]

    # ========================================================
    # BUILD PROVIDER BASELINE
    #
    # Matches the existing notebook baseline.
    # ========================================================

    def _build_provider_baseline(
        self,
        claims: list[dict],
    ) -> dict:

        reimbursements = [
            self._number(
                claim.get(
                    "claim_reimbursement"
                )
            )
            for claim in claims
        ]

        durations = [
            self._number(
                claim.get(
                    "claim_duration"
                )
            )
            for claim in claims
        ]

        diagnosis_counts = [
            self._number(
                claim.get(
                    "diagnosis_count"
                )
            )
            for claim in claims
        ]

        procedure_counts = [
            self._number(
                claim.get(
                    "procedure_count"
                )
            )
            for claim in claims
        ]

        physician_counts = [
            self._number(
                claim.get(
                    "physician_count"
                )
            )
            for claim in claims
        ]

        beneficiary_ages = [
            self._number(
                claim.get(
                    "beneficiary_age"
                )
            )
            for claim in claims
        ]

        chronic_conditions = [
            self._number(
                claim.get(
                    "chronic_condition_count"
                )
            )
            for claim in claims
        ]

        # ====================================================
        # Reimbursement per claim day
        #
        # Formula:
        #
        # ClaimReimbursement /
        # (ClaimDurationDays + 1)
        # ====================================================

        reimbursement_per_claim_day = [

            self._number(
                claim.get(
                    "claim_reimbursement"
                )
            )
            /
            (
                self._number(
                    claim.get(
                        "claim_duration"
                    )
                )
                + 1
            )

            for claim in claims
        ]

        return {

            "AverageClaimReimbursement":
                self._mean(
                    reimbursements
                ),

            "MedianClaimReimbursement":
                self._median(
                    reimbursements
                ),

            "AverageClaimDuration":
                self._mean(
                    durations
                ),

            "AverageReimbursementPerClaimDay":
                self._mean(
                    reimbursement_per_claim_day
                ),

            "AverageDiagnosisCount":
                self._mean(
                    diagnosis_counts
                ),

            "AverageProcedureCount":
                self._mean(
                    procedure_counts
                ),

            "AveragePhysicianCount":
                self._mean(
                    physician_counts
                ),

            "AverageBeneficiaryAge":
                self._mean(
                    beneficiary_ages
                ),

            "AverageChronicConditions":
                self._mean(
                    chronic_conditions
                ),
        }

    # ========================================================
    # BUILD CLAIM MODEL FEATURES
    # ========================================================

    def _build_model_features(
        self,
        claim: dict,
        baseline: dict,
    ) -> dict:

        # ====================================================
        # RAW CLAIM FEATURES
        # ====================================================

        claim_duration = self._number(
            claim.get(
                "claim_duration"
            )
        )

        claim_reimbursement = self._number(
            claim.get(
                "claim_reimbursement"
            )
        )

        claim_deductible = self._number(
            claim.get(
                "claim_deductible"
            )
        )

        total_claim_cost = self._number(
            claim.get(
                "total_claim_cost"
            )
        )

        beneficiary_age = self._number(
            claim.get(
                "beneficiary_age"
            )
        )

        chronic_conditions = self._number(
            claim.get(
                "chronic_condition_count"
            )
        )

        diagnosis_count = self._number(
            claim.get(
                "diagnosis_count"
            )
        )

        procedure_count = self._number(
            claim.get(
                "procedure_count"
            )
        )

        physician_count = self._number(
            claim.get(
                "physician_count"
            )
        )

        # ====================================================
        # REIMBURSEMENT PER CLAIM DAY
        # ====================================================

        reimbursement_per_claim_day = (
            claim_reimbursement
            / (claim_duration + 1)
        )

        # ====================================================
        # PROVIDER BASELINES
        # ====================================================

        reimbursement_mean = self._number(
            baseline.get(
                "AverageClaimReimbursement"
            )
        )

        reimbursement_median = self._number(
            baseline.get(
                "MedianClaimReimbursement"
            )
        )

        duration_mean = self._number(
            baseline.get(
                "AverageClaimDuration"
            )
        )

        reimbursement_day_mean = self._number(
            baseline.get(
                "AverageReimbursementPerClaimDay"
            )
        )

        diagnosis_mean = self._number(
            baseline.get(
                "AverageDiagnosisCount"
            )
        )

        physician_mean = self._number(
            baseline.get(
                "AveragePhysicianCount"
            )
        )

        beneficiary_age_mean = self._number(
            baseline.get(
                "AverageBeneficiaryAge"
            )
        )

        chronic_conditions_mean = self._number(
            baseline.get(
                "AverageChronicConditions"
            )
        )

        # ====================================================
        # RELATIVE FEATURES
        # ====================================================

        reimbursement_vs_mean = (

            claim_reimbursement
            / reimbursement_mean

            if reimbursement_mean != 0
            else 0.0
        )

        reimbursement_vs_median = (

            claim_reimbursement
            / reimbursement_median

            if reimbursement_median != 0
            else 0.0
        )

        reimbursement_day_vs_mean = (

            reimbursement_per_claim_day
            / reimbursement_day_mean

            if reimbursement_day_mean != 0
            else 0.0
        )

        duration_vs_mean = (

            claim_duration
            / duration_mean

            if duration_mean != 0
            else 0.0
        )

        diagnosis_vs_mean = (

            diagnosis_count
            / diagnosis_mean

            if diagnosis_mean != 0
            else 0.0
        )

        physician_vs_mean = (

            physician_count
            / physician_mean

            if physician_mean != 0
            else 0.0
        )

        beneficiary_age_vs_mean = (
            beneficiary_age
            - beneficiary_age_mean
        )

        chronic_conditions_vs_mean = (
            chronic_conditions
            - chronic_conditions_mean
        )

        # ====================================================
        # MODEL FEATURES
        # ====================================================

        features = {

            "ClaimDurationDays":
                claim_duration,

            "ClaimReimbursement":
                claim_reimbursement,

            "ClaimDeductible":
                claim_deductible,

            "TotalClaimCost":
                total_claim_cost,

            "ReimbursementPerClaimDay":
                reimbursement_per_claim_day,

            "BeneficiaryAge":
                beneficiary_age,

            "ChronicConditionCount":
                chronic_conditions,

            "DiagnosisCodeCount":
                diagnosis_count,

            "ProcedureCodeCount":
                procedure_count,

            "PhysicianCount":
                physician_count,

            "Log_ClaimReimbursement_vs_ProviderMean":
                float(
                    np.log1p(
                        reimbursement_vs_mean
                    )
                ),

            "Log_ClaimReimbursement_vs_ProviderMedian":
                float(
                    np.log1p(
                        reimbursement_vs_median
                    )
                ),

            "Log_ReimbursementPerClaimDay_vs_ProviderMean":
                float(
                    np.log1p(
                        reimbursement_day_vs_mean
                    )
                ),

            "Log_ClaimDuration_vs_ProviderMean":
                float(
                    np.log1p(
                        duration_vs_mean
                    )
                ),

            "Log_DiagnosisCount_vs_ProviderMean":
                float(
                    np.log1p(
                        diagnosis_vs_mean
                    )
                ),

            "Log_PhysicianCount_vs_ProviderMean":
                float(
                    np.log1p(
                        physician_vs_mean
                    )
                ),

            "Abs_BeneficiaryAge_vs_ProviderMean":
                abs(
                    beneficiary_age_vs_mean
                ),

            "Abs_ChronicConditions_vs_ProviderMean":
                abs(
                    chronic_conditions_vs_mean
                ),
        }

        return features

    # ========================================================
    # PREDICT CLAIM ANOMALY
    # ========================================================

    def predict_claim(
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
        # GET TARGET CLAIM
        # ====================================================

        claim = self._get_claim(
            claim_id=claim_id,
            provider_id=provider_id,
        )

        # ====================================================
        # GET PROVIDER HISTORY
        # ====================================================

        provider_claims = (
            self._get_provider_claims(
                provider_id
            )
        )

        claim_count = len(
            provider_claims
        )

        # ====================================================
        # COLD START
        # ====================================================

        if claim_count < self.MINIMUM_CLAIMS:

            return {

                "provider_id":
                    provider_id,

                "claim_id":
                    claim_id,

                "claim_count":
                    claim_count,

                "status":
                    "COLD_START",

                "model_used":
                    False,

                "prediction":
                    None,

                "is_anomalous":
                    None,

                "isolation_score":
                    None,

                "claim_anomaly_score":
                    None,

                "claim_anomaly_score_100":
                    None,

                "claim_risk_tier":
                    "COLD_START",

                "message":
                    (
                        "Insufficient provider history "
                        "for claim-level anomaly "
                        "assessment."
                    ),
            }

        # ====================================================
        # BUILD PROVIDER BASELINE
        # ====================================================

        baseline = (
            self._build_provider_baseline(
                provider_claims
            )
        )

        # ====================================================
        # BUILD MODEL FEATURES
        # ====================================================

        features = (
            self._build_model_features(
                claim=claim,
                baseline=baseline,
            )
        )

        # ====================================================
        # VALIDATE FEATURES
        # ====================================================

        missing_features = [

            feature

            for feature
            in self.MODEL_FEATURES

            if feature not in features
        ]

        if missing_features:

            raise ValueError(
                "Missing Isolation Forest features: "
                + ", ".join(
                    missing_features
                )
            )

        # ====================================================
        # MODEL MATRIX
        # ====================================================

        X = np.array(
            [
                [
                    features[
                        feature
                    ]

                    for feature
                    in self.MODEL_FEATURES
                ]
            ],
            dtype=float,
        )

        # ====================================================
        # LOAD MODEL
        # ====================================================

        model = self._get_model()

        # ====================================================
        # MODEL PREDICTION
        #
        # sklearn:
        #
        # +1 = normal
        # -1 = anomaly
        # ====================================================

        prediction = int(
            model.predict(X)[0]
        )

        # ====================================================
        # ISOLATION SCORE
        #
        # Higher = more normal
        # Lower  = more anomalous
        # ====================================================

        isolation_score = float(
            model.decision_function(X)[0]
        )

        # ====================================================
        # RAW ANOMALY SCORE
        #
        # Higher = more suspicious
        #
        # Matches existing notebook logic:
        #
        # ClaimAnomalyScore = -IsolationScore
        # ====================================================

        claim_anomaly_score = (
            -isolation_score
        )

        # ====================================================
        # ANOMALY FLAG
        # ====================================================

        is_anomalous = (
            prediction == -1
        )

        # ====================================================
        # 0-100 DISPLAY RISK SCORE
        # ====================================================

        claim_anomaly_score_100 = (
            self._score_to_100(
                claim_anomaly_score
            )
        )

        # ====================================================
        # RISK TIER
        # ====================================================

        claim_risk_tier = (
            self._risk_tier(
                claim_anomaly_score_100
            )
        )

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        return {

            "provider_id":
                provider_id,

            "claim_id":
                claim_id,

            "claim_count":
                claim_count,

            "status":
                "ASSESSED",

            "model_used":
                True,

            "prediction":
                prediction,

            "is_anomalous":
                is_anomalous,

            "isolation_score":
                isolation_score,

            "claim_anomaly_score":
                round(
                    claim_anomaly_score,
                    6,
                ),

            "claim_anomaly_score_100":
                claim_anomaly_score_100,

            "claim_risk_tier":
                claim_risk_tier,

            "features":
                features,
        }


# ============================================================
# SINGLETON
# ============================================================

claim_anomaly_service = (
    ClaimAnomalyService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ClaimAnomalyService",
    "claim_anomaly_service",
]