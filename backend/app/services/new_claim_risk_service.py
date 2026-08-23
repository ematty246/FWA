"""
ClaimGuard AI
New Claim Cold-Start Risk Service
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.services.ml_model_service import (
    ml_model_service,
)


class NewClaimRiskService:

    SERVICE_NAME = "new_claim_risk_service"

    # ========================================================
    # PATHS
    # ========================================================

    BASE_DIR = Path(__file__).resolve().parents[2]

    DATA_DIR = BASE_DIR / "data"

    CLAIM_RISK_PATH = (
        DATA_DIR / "claim_risk.csv"
    )

    # ========================================================
    # EXACT 44 XGBOOST FEATURES
    # ========================================================

    PROVIDER_FEATURES = [

        "TotalClaims",
        "TotalBeneficiaries",
        "TotalReimbursement",
        "TotalDeductible",

        "AverageClaimReimbursement",
        "MedianClaimReimbursement",
        "AverageClaimDuration",
        "AverageReimbursementPerClaimDay",

        "AverageBeneficiaryAge",
        "AverageChronicConditions",

        "ClaimsPerBeneficiary",
        "ReimbursementPerBeneficiary",

        "RepeatBeneficiaries",
        "RepeatBeneficiaryRate",

        "AverageDiagnosisCount",
        "AverageProcedureCount",
        "AveragePhysicianCount",

        "InpatientClaims",
        "OutpatientClaims",

        "InpatientClaimRatio",
        "OutpatientClaimRatio",

        "InpatientTotalReimbursement",
        "InpatientAverageReimbursement",
        "InpatientAverageDuration",
        "InpatientAverageDiagnosisCount",
        "InpatientAverageProcedureCount",
        "InpatientBeneficiaries",
        "InpatientReimbursementShare",

        "OutpatientTotalReimbursement",
        "OutpatientAverageReimbursement",
        "OutpatientAverageDuration",
        "OutpatientAverageDiagnosisCount",
        "OutpatientAverageProcedureCount",
        "OutpatientBeneficiaries",
        "OutpatientReimbursementShare",

        "UniquePhysicians",
        "ClaimsPerUniquePhysician",
        "PhysicianDiversityRatio",

        "AverageClaimReimbursement_PeerDeviation_clean",
        "ClaimsPerBeneficiary_PeerDeviation_clean",
        "ReimbursementPerBeneficiary_PeerDeviation_clean",

        "AverageClaimReimbursement_PeerZScore_clean",
        "ClaimsPerBeneficiary_PeerZScore_clean",
        "ReimbursementPerBeneficiary_PeerZScore_clean",
    ]

    # ========================================================
    # EXACT 18 ISOLATION FOREST FEATURES
    # ========================================================

    CLAIM_FEATURES = [

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
    # INITIALIZE
    # ========================================================

    def __init__(self):

        if not self.CLAIM_RISK_PATH.exists():

            raise FileNotFoundError(
                "Historical claim-risk dataset not found: "
                f"{self.CLAIM_RISK_PATH}"
            )

        self.claim_risk = pd.read_csv(
            self.CLAIM_RISK_PATH
        )

        self._normalize_columns()

        self._prepare_reference_scores()

    # ========================================================
    # NORMALIZE DATASET
    # ========================================================

    def _normalize_columns(self):

        self.claim_risk["Provider"] = (
            self.claim_risk["Provider"]
            .astype(str)
            .str.strip()
            .str.upper()
        )

        self.claim_risk["ClaimType"] = (
            self.claim_risk["ClaimType"]
            .astype(str)
            .str.strip()
        )

        # ----------------------------------------------------
        # Numeric conversion
        # ----------------------------------------------------

        numeric_columns = [

            "ClaimReimbursement",
            "ClaimDeductible",
            "TotalClaimCost",
            "ClaimDurationDays",
            "BeneficiaryAge",
            "ChronicConditionCount",
            "DiagnosisCodeCount",
            "ProcedureCodeCount",
            "PhysicianCount",

            "FraudProbability",
            "ClaimAnomalyScore",
            "CombinedRiskScore",
        ]

        for column in numeric_columns:

            if column in self.claim_risk.columns:

                self.claim_risk[column] = pd.to_numeric(
                    self.claim_risk[column],
                    errors="coerce",
                )

    # ========================================================
    # HISTORICAL ANOMALY REFERENCE
    # ========================================================

    def _prepare_reference_scores(self):

        scores = pd.to_numeric(
            self.claim_risk[
                "ClaimAnomalyScore"
            ],
            errors="coerce",
        ).dropna()

        if scores.empty:

            raise ValueError(
                "Historical ClaimAnomalyScore "
                "reference data is empty."
            )

        self.historical_anomaly_scores = (
            scores
            .sort_values()
            .to_numpy(
                dtype=float
            )
        )

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

            value = float(value)

            if not np.isfinite(value):
                return default

            return value

        except (
            TypeError,
            ValueError,
        ):

            return default

    # ========================================================
    # SAFE MEAN
    # ========================================================

    @classmethod
    def _mean(
        cls,
        values,
    ) -> float:

        numbers = [
            cls._number(value)
            for value in values
            if value is not None
        ]

        if not numbers:
            return 0.0

        return float(
            np.mean(numbers)
        )

    # ========================================================
    # SAFE MEDIAN
    # ========================================================

    @classmethod
    def _median(
        cls,
        values,
    ) -> float:

        numbers = [
            cls._number(value)
            for value in values
            if value is not None
        ]

        if not numbers:
            return 0.0

        return float(
            np.median(numbers)
        )

    # ========================================================
    # SAFE RATIO
    # ========================================================

    @classmethod
    def _ratio(
        cls,
        numerator,
        denominator,
    ) -> float:

        numerator = cls._number(
            numerator
        )

        denominator = cls._number(
            denominator
        )

        if denominator == 0:
            return 0.0

        return (
            numerator
            / denominator
        )

    # ========================================================
    # PROVIDER PEER GROUP
    #
    # Training notebook:
    #
    # <= 15     Small
    # 16–61     Medium
    # > 61      Large
    #
    # Inpatient ratio:
    #
    # <= .25     Mostly_Outpatient
    # .25-.75    Mixed
    # > .75      Mostly_Inpatient
    # ========================================================

    @staticmethod
    def _provider_size(
        total_claims: int,
    ) -> str:

        if total_claims <= 15:
            return "Small"

        if total_claims <= 61:
            return "Medium"

        return "Large"

    @staticmethod
    def _service_mix(
        inpatient_ratio: float,
    ) -> str:

        if inpatient_ratio <= 0.25:

            return "Mostly_Outpatient"

        if inpatient_ratio <= 0.75:

            return "Mixed"

        return "Mostly_Inpatient"

    def _peer_group(
        self,
        total_claims: int,
        inpatient_ratio: float,
    ) -> str:

        return (
            self._provider_size(
                total_claims
            )
            + "_"
            + self._service_mix(
                inpatient_ratio
            )
        )

    # ========================================================
    # GET HISTORICAL PEERS
    # ========================================================

    def _get_peer_providers(
        self,
        peer_group: str,
    ) -> pd.DataFrame:

        # provider_features data is represented inside
        # claim_risk through provider-level repeated rows.
        #
        # Build provider-level statistics from historical
        # claims rather than using the new provider itself.

        df = self.claim_risk.copy()

        # ----------------------------------------------------
        # Provider aggregation
        # ----------------------------------------------------

        provider_rows = []

        for provider_id, group in (
            df.groupby("Provider")
        ):

            total_claims = len(group)

            total_beneficiaries = (
                group[
                    "Provider"
                ].count()
            )

            total_reimbursement = (
                group[
                    "ClaimReimbursement"
                ].sum()
            )

            total_deductible = (
                group[
                    "ClaimDeductible"
                ].sum()
            )

            average_reimbursement = (
                self._mean(
                    group[
                        "ClaimReimbursement"
                    ]
                )
            )

            claims_per_beneficiary = (
                self._ratio(
                    total_claims,
                    total_beneficiaries,
                )
            )

            reimbursement_per_beneficiary = (
                self._ratio(
                    total_reimbursement,
                    total_beneficiaries,
                )
            )

            inpatient_count = (
                group["ClaimType"]
                .str.lower()
                .eq("inpatient")
                .sum()
            )

            inpatient_ratio = (
                self._ratio(
                    inpatient_count,
                    total_claims,
                )
            )

            peer = self._peer_group(
                total_claims,
                inpatient_ratio,
            )

            provider_rows.append({

                "Provider":
                    provider_id,

                "TotalClaims":
                    total_claims,

                "TotalBeneficiaries":
                    total_beneficiaries,

                "TotalReimbursement":
                    total_reimbursement,

                "TotalDeductible":
                    total_deductible,

                "AverageClaimReimbursement":
                    average_reimbursement,

                "ClaimsPerBeneficiary":
                    claims_per_beneficiary,

                "ReimbursementPerBeneficiary":
                    reimbursement_per_beneficiary,

                "PeerGroup":
                    peer,
            })

        providers = pd.DataFrame(
            provider_rows
        )

        peers = providers[
            providers["PeerGroup"]
            == peer_group
        ].copy()

        if peers.empty:

            # Fall back to all providers if a very
            # specific peer group has no members.

            peers = providers.copy()

        return peers

    # ========================================================
    # BUILD PROVIDER FEATURES
    # ========================================================

    def _build_provider_features(
        self,
        *,
        claim_type: str,
        claim_duration: int,
        claim_reimbursement: float,
        claim_deductible: float,
        total_claim_cost: float,
        beneficiary_age: int,
        chronic_condition_count: int,
        diagnosis_count: int,
        procedure_count: int,
        physician_count: int,
    ) -> tuple[pd.DataFrame, str]:

        claim_type = (
            claim_type
            .strip()
            .lower()
        )

        is_inpatient = (
            claim_type == "inpatient"
        )

        is_outpatient = (
            claim_type == "outpatient"
        )

        total_claims = 1
        total_beneficiaries = 1

        inpatient_claims = (
            1 if is_inpatient else 0
        )

        outpatient_claims = (
            1 if is_outpatient else 0
        )

        inpatient_ratio = (
            float(inpatient_claims)
        )

        outpatient_ratio = (
            float(outpatient_claims)
        )

        total_reimbursement = (
            claim_reimbursement
        )

        total_deductible = (
            claim_deductible
        )

        reimbursement_per_day = (
            claim_reimbursement
            / max(
                claim_duration,
                1,
            )
        )

        # ----------------------------------------------------
        # Peer group
        # ----------------------------------------------------

        peer_group = self._peer_group(
            total_claims,
            inpatient_ratio,
        )

        peers = self._get_peer_providers(
            peer_group
        )

        # ----------------------------------------------------
        # Peer statistics
        # ----------------------------------------------------

        peer_reimbursement_mean = (
            self._mean(
                peers[
                    "AverageClaimReimbursement"
                ]
            )
        )

        peer_claims_per_beneficiary_mean = (
            self._mean(
                peers[
                    "ClaimsPerBeneficiary"
                ]
            )
        )

        peer_reimbursement_per_beneficiary_mean = (
            self._mean(
                peers[
                    "ReimbursementPerBeneficiary"
                ]
            )
        )

        peer_reimbursement_std = (
            float(
                pd.to_numeric(
                    peers[
                        "AverageClaimReimbursement"
                    ],
                    errors="coerce",
                )
                .dropna()
                .std()
                or 0
            )
        )

        peer_claims_per_beneficiary_std = (
            float(
                pd.to_numeric(
                    peers[
                        "ClaimsPerBeneficiary"
                    ],
                    errors="coerce",
                )
                .dropna()
                .std()
                or 0
            )
        )

        peer_reimbursement_per_beneficiary_std = (
            float(
                pd.to_numeric(
                    peers[
                        "ReimbursementPerBeneficiary"
                    ],
                    errors="coerce",
                )
                .dropna()
                .std()
                or 0
            )
        )

        # ----------------------------------------------------
        # Clean peer deviation
        # ----------------------------------------------------

        average_reimbursement_deviation = (
            self._ratio(
                claim_reimbursement
                - peer_reimbursement_mean,
                peer_reimbursement_mean,
            )
        )

        claims_per_beneficiary_deviation = (
            self._ratio(
                1.0
                - peer_claims_per_beneficiary_mean,
                peer_claims_per_beneficiary_mean,
            )
        )

        reimbursement_per_beneficiary_deviation = (
            self._ratio(
                claim_reimbursement
                - peer_reimbursement_per_beneficiary_mean,
                peer_reimbursement_per_beneficiary_mean,
            )
        )

        # ----------------------------------------------------
        # Clean peer z-scores
        # ----------------------------------------------------

        if peer_reimbursement_std:

            average_reimbursement_zscore = (
                (
                    claim_reimbursement
                    - peer_reimbursement_mean
                )
                / peer_reimbursement_std
            )

        else:

            average_reimbursement_zscore = 0.0

        if peer_claims_per_beneficiary_std:

            claims_per_beneficiary_zscore = (
                (
                    1.0
                    - peer_claims_per_beneficiary_mean
                )
                / peer_claims_per_beneficiary_std
            )

        else:

            claims_per_beneficiary_zscore = 0.0

        if peer_reimbursement_per_beneficiary_std:

            reimbursement_per_beneficiary_zscore = (
                (
                    claim_reimbursement
                    - peer_reimbursement_per_beneficiary_mean
                )
                / peer_reimbursement_per_beneficiary_std
            )

        else:

            reimbursement_per_beneficiary_zscore = 0.0

        # ----------------------------------------------------
        # Feature vector
        # ----------------------------------------------------

        features = {

            "TotalClaims":
                total_claims,

            "TotalBeneficiaries":
                total_beneficiaries,

            "TotalReimbursement":
                total_reimbursement,

            "TotalDeductible":
                total_deductible,

            "AverageClaimReimbursement":
                claim_reimbursement,

            "MedianClaimReimbursement":
                claim_reimbursement,

            "AverageClaimDuration":
                claim_duration,

            "AverageReimbursementPerClaimDay":
                reimbursement_per_day,

            "AverageBeneficiaryAge":
                beneficiary_age,

            "AverageChronicConditions":
                chronic_condition_count,

            "ClaimsPerBeneficiary":
                1.0,

            "ReimbursementPerBeneficiary":
                claim_reimbursement,

            "RepeatBeneficiaries":
                0.0,

            "RepeatBeneficiaryRate":
                0.0,

            "AverageDiagnosisCount":
                diagnosis_count,

            "AverageProcedureCount":
                procedure_count,

            "AveragePhysicianCount":
                physician_count,

            "InpatientClaims":
                inpatient_claims,

            "OutpatientClaims":
                outpatient_claims,

            "InpatientClaimRatio":
                inpatient_ratio,

            "OutpatientClaimRatio":
                outpatient_ratio,

            "InpatientTotalReimbursement":
                (
                    claim_reimbursement
                    if is_inpatient
                    else 0.0
                ),

            "InpatientAverageReimbursement":
                (
                    claim_reimbursement
                    if is_inpatient
                    else 0.0
                ),

            "InpatientAverageDuration":
                (
                    claim_duration
                    if is_inpatient
                    else 0.0
                ),

            "InpatientAverageDiagnosisCount":
                (
                    diagnosis_count
                    if is_inpatient
                    else 0.0
                ),

            "InpatientAverageProcedureCount":
                (
                    procedure_count
                    if is_inpatient
                    else 0.0
                ),

            "InpatientBeneficiaries":
                (
                    1.0
                    if is_inpatient
                    else 0.0
                ),

            "InpatientReimbursementShare":
                (
                    1.0
                    if is_inpatient
                    else 0.0
                ),

            "OutpatientTotalReimbursement":
                (
                    claim_reimbursement
                    if is_outpatient
                    else 0.0
                ),

            "OutpatientAverageReimbursement":
                (
                    claim_reimbursement
                    if is_outpatient
                    else 0.0
                ),

            "OutpatientAverageDuration":
                (
                    claim_duration
                    if is_outpatient
                    else 0.0
                ),

            "OutpatientAverageDiagnosisCount":
                (
                    diagnosis_count
                    if is_outpatient
                    else 0.0
                ),

            "OutpatientAverageProcedureCount":
                (
                    procedure_count
                    if is_outpatient
                    else 0.0
                ),

            "OutpatientBeneficiaries":
                (
                    1.0
                    if is_outpatient
                    else 0.0
                ),

            "OutpatientReimbursementShare":
                (
                    1.0
                    if is_outpatient
                    else 0.0
                ),

            "UniquePhysicians":
                physician_count,

            "ClaimsPerUniquePhysician":
                self._ratio(
                    1,
                    physician_count,
                ),

            "PhysicianDiversityRatio":
                float(
                    physician_count
                ),

            "AverageClaimReimbursement_PeerDeviation_clean":
                average_reimbursement_deviation,

            "ClaimsPerBeneficiary_PeerDeviation_clean":
                claims_per_beneficiary_deviation,

            "ReimbursementPerBeneficiary_PeerDeviation_clean":
                reimbursement_per_beneficiary_deviation,

            "AverageClaimReimbursement_PeerZScore_clean":
                average_reimbursement_zscore,

            "ClaimsPerBeneficiary_PeerZScore_clean":
                claims_per_beneficiary_zscore,

            "ReimbursementPerBeneficiary_PeerZScore_clean":
                reimbursement_per_beneficiary_zscore,
        }

        missing = [
            feature
            for feature in self.PROVIDER_FEATURES
            if feature not in features
        ]

        if missing:

            raise ValueError(
                "Missing XGBoost features: "
                + ", ".join(missing)
            )

        X = pd.DataFrame(
            [[
                features[feature]
                for feature in self.PROVIDER_FEATURES
            ]],
            columns=self.PROVIDER_FEATURES,
        )

        return (
            X,
            peer_group,
        )

    # ========================================================
    # BUILD CLAIM FEATURES
    # ========================================================

    def _build_claim_features(
        self,
        *,
        claim_type: str,
        claim_duration: int,
        claim_reimbursement: float,
        claim_deductible: float,
        total_claim_cost: float,
        beneficiary_age: int,
        chronic_condition_count: int,
        diagnosis_count: int,
        procedure_count: int,
        physician_count: int,
        peer_group: str,
    ) -> pd.DataFrame:

        # ----------------------------------------------------
        # Get peer claims
        # ----------------------------------------------------

        peers = self._get_peer_providers(
            peer_group
        )

        peer_provider_ids = set(
            peers["Provider"]
        )

        peer_claims = self.claim_risk[
            self.claim_risk["Provider"]
            .isin(peer_provider_ids)
        ].copy()

        # ----------------------------------------------------
        # Provider baselines
        # ----------------------------------------------------

        reimbursement_mean = (
            self._mean(
                peer_claims[
                    "ClaimReimbursement"
                ]
            )
        )

        reimbursement_median = (
            self._median(
                peer_claims[
                    "ClaimReimbursement"
                ]
            )
        )

        peer_durations = pd.to_numeric(
            peer_claims[
                "ClaimDurationDays"
            ],
            errors="coerce",
        )

        peer_reimbursement = pd.to_numeric(
            peer_claims[
                "ClaimReimbursement"
            ],
            errors="coerce",
        )

        reimbursement_per_day_history = (
            peer_reimbursement
            / (
                peer_durations
                + 1
            )
        ).replace(
            [np.inf, -np.inf],
            np.nan,
        )

        reimbursement_day_mean = (
            float(
                reimbursement_per_day_history
                .dropna()
                .mean()
            )
            if not reimbursement_per_day_history
            .dropna()
            .empty
            else 0.0
        )

        duration_mean = (
            self._mean(
                peer_claims[
                    "ClaimDurationDays"
                ]
            )
        )

        diagnosis_mean = (
            self._mean(
                peer_claims[
                    "DiagnosisCodeCount"
                ]
            )
        )

        physician_mean = (
            self._mean(
                peer_claims[
                    "PhysicianCount"
                ]
            )
        )

        beneficiary_age_mean = (
            self._mean(
                peer_claims[
                    "BeneficiaryAge"
                ]
            )
        )

        chronic_mean = (
            self._mean(
                peer_claims[
                    "ChronicConditionCount"
                ]
            )
        )

        # ----------------------------------------------------
        # NOTEBOOK FORMULA
        #
        # reimbursement / (duration + 1)
        # ----------------------------------------------------

        reimbursement_per_day = (
            claim_reimbursement
            / (
                claim_duration
                + 1
            )
        )

        # ----------------------------------------------------
        # Relative ratios
        # ----------------------------------------------------

        reimbursement_vs_mean = (
            self._ratio(
                claim_reimbursement,
                reimbursement_mean,
            )
        )

        reimbursement_vs_median = (
            self._ratio(
                claim_reimbursement,
                reimbursement_median,
            )
        )

        reimbursement_day_vs_mean = (
            self._ratio(
                reimbursement_per_day,
                reimbursement_day_mean,
            )
        )

        duration_vs_mean = (
            self._ratio(
                claim_duration,
                duration_mean,
            )
        )

        diagnosis_vs_mean = (
            self._ratio(
                diagnosis_count,
                diagnosis_mean,
            )
        )

        physician_vs_mean = (
            self._ratio(
                physician_count,
                physician_mean,
            )
        )

        age_difference = (
            beneficiary_age
            - beneficiary_age_mean
        )

        chronic_difference = (
            chronic_condition_count
            - chronic_mean
        )

        # ----------------------------------------------------
        # EXACT 18 FEATURES
        # ----------------------------------------------------

        row = {

            "ClaimDurationDays":
                claim_duration,

            "ClaimReimbursement":
                claim_reimbursement,

            "ClaimDeductible":
                claim_deductible,

            "TotalClaimCost":
                total_claim_cost,

            "ReimbursementPerClaimDay":
                reimbursement_per_day,

            "BeneficiaryAge":
                beneficiary_age,

            "ChronicConditionCount":
                chronic_condition_count,

            "DiagnosisCodeCount":
                diagnosis_count,

            "ProcedureCodeCount":
                procedure_count,

            "PhysicianCount":
                physician_count,

            "Log_ClaimReimbursement_vs_ProviderMean":
                np.log1p(
                    reimbursement_vs_mean
                ),

            "Log_ClaimReimbursement_vs_ProviderMedian":
                np.log1p(
                    reimbursement_vs_median
                ),

            "Log_ReimbursementPerClaimDay_vs_ProviderMean":
                np.log1p(
                    reimbursement_day_vs_mean
                ),

            "Log_ClaimDuration_vs_ProviderMean":
                np.log1p(
                    duration_vs_mean
                ),

            "Log_DiagnosisCount_vs_ProviderMean":
                np.log1p(
                    diagnosis_vs_mean
                ),

            "Log_PhysicianCount_vs_ProviderMean":
                np.log1p(
                    physician_vs_mean
                ),

            "Abs_BeneficiaryAge_vs_ProviderMean":
                abs(
                    age_difference
                ),

            "Abs_ChronicConditions_vs_ProviderMean":
                abs(
                    chronic_difference
                ),
        }

        return pd.DataFrame(
            [[
                row[feature]
                for feature in self.CLAIM_FEATURES
            ]],
            columns=self.CLAIM_FEATURES,
        )

    # ========================================================
    # CLAIM ANOMALY PERCENTILE
    # ========================================================

    def _anomaly_percentile(
        self,
        anomaly_score: float,
    ) -> float:

        historical = (
            self.historical_anomaly_scores
        )

        # Empirical percentile against the historical
        # claim anomaly distribution.

        percentile = (
            np.searchsorted(
                historical,
                anomaly_score,
                side="right",
            )
            / len(historical)
        ) * 100.0

        return float(
            np.clip(
                percentile,
                0.0,
                100.0,
            )
        )

    # ========================================================
    # CLAIM RISK TIER
    # ========================================================

    @staticmethod
    def _risk_tier(
        anomaly_score_100: float,
    ) -> str:

        if anomaly_score_100 <= 70:

            return "Low Risk"

        if anomaly_score_100 <= 85:

            return "Medium Risk"

        if anomaly_score_100 <= 95:

            return "High Risk"

        return "Very High Risk"

    # ========================================================
    # COMPLETE COLD-START PREDICTION
    # ========================================================

    def predict_cold_start(
        self,
        *,
        claim_type: str,
        claim_duration: int,
        claim_reimbursement: float,
        claim_deductible: float,
        total_claim_cost: float,
        beneficiary_age: int,
        chronic_condition_count: int,
        diagnosis_count: int,
        procedure_count: int,
        physician_count: int,
    ) -> dict:

        # ====================================================
        # PROVIDER MODEL FEATURES
        # ====================================================

        provider_X, peer_group = (
            self._build_provider_features(
                claim_type=claim_type,
                claim_duration=claim_duration,
                claim_reimbursement=claim_reimbursement,
                claim_deductible=claim_deductible,
                total_claim_cost=total_claim_cost,
                beneficiary_age=beneficiary_age,
                chronic_condition_count=(
                    chronic_condition_count
                ),
                diagnosis_count=diagnosis_count,
                procedure_count=procedure_count,
                physician_count=physician_count,
            )
        )

        # ====================================================
        # XGBOOST
        # ====================================================

        fraud_probability = (
            ml_model_service
            .predict_provider(
                provider_X
            )
        )

        # ====================================================
        # CLAIM MODEL FEATURES
        # ====================================================

        claim_X = (
            self._build_claim_features(
                claim_type=claim_type,
                claim_duration=claim_duration,
                claim_reimbursement=claim_reimbursement,
                claim_deductible=claim_deductible,
                total_claim_cost=total_claim_cost,
                beneficiary_age=beneficiary_age,
                chronic_condition_count=(
                    chronic_condition_count
                ),
                diagnosis_count=diagnosis_count,
                procedure_count=procedure_count,
                physician_count=physician_count,
                peer_group=peer_group,
            )
        )

        # ====================================================
        # ISOLATION FOREST
        # ====================================================

        claim_anomaly_score = (
            ml_model_service
            .predict_claim_anomaly(
                claim_X
            )
        )

        # ====================================================
        # HISTORICAL PERCENTILE
        # ====================================================

        claim_anomaly_score_100 = (
            self._anomaly_percentile(
                claim_anomaly_score
            )
        )

        # ====================================================
        # CLAIM RISK TIER
        # ====================================================

        claim_risk_tier = (
            self._risk_tier(
                claim_anomaly_score_100
            )
        )

        # ====================================================
        # RESPONSE
        #
        # CombinedRiskScore intentionally remains None.
        # The original notebook does not provide its
        # calculation.
        # ====================================================

        return {

            "fraud_probability":
                float(
                    fraud_probability
                ),

            "claim_anomaly_score":
                float(
                    claim_anomaly_score
                ),

            "claim_anomaly_score_100":
                float(
                    claim_anomaly_score_100
                ),

            "combined_risk_score":
                None,

            "claim_risk_tier":
                claim_risk_tier,

            "peer_group":
                peer_group,

            "cold_start":
                True,
        }


# ============================================================
# SINGLETON
# ============================================================

new_claim_risk_service = (
    NewClaimRiskService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "NewClaimRiskService",
    "new_claim_risk_service",
]