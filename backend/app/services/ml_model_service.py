"""
ClaimGuard AI
ML Model Loading Service
"""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_DIR = BASE_DIR / "models"


PROVIDER_MODEL_PATH = (
    MODEL_DIR / "xgboost_provider_model.pkl"
)

CLAIM_MODEL_PATH = (
    MODEL_DIR / "claim_isolation_forest.pkl"
)


class MLModelService:

    SERVICE_NAME = "ml_model_service"

    def __init__(self):

        self.provider_model = None
        self.claim_model = None

        self._load_models()

    # ========================================================
    # LOAD MODELS
    # ========================================================

    def _load_models(self):

        if not PROVIDER_MODEL_PATH.exists():

            raise FileNotFoundError(
                f"Provider model not found: "
                f"{PROVIDER_MODEL_PATH}"
            )

        if not CLAIM_MODEL_PATH.exists():

            raise FileNotFoundError(
                f"Claim model not found: "
                f"{CLAIM_MODEL_PATH}"
            )

        self.provider_model = joblib.load(
            PROVIDER_MODEL_PATH
        )

        self.claim_model = joblib.load(
            CLAIM_MODEL_PATH
        )

    # ========================================================
    # PROVIDER PREDICTION
    # ========================================================

    def predict_provider(
        self,
        features: pd.DataFrame,
    ) -> float:

        probability = (
            self.provider_model
            .predict_proba(features)[0][1]
        )

        return float(probability)

    # ========================================================
    # CLAIM ANOMALY
    # ========================================================

    def predict_claim_anomaly(
        self,
        features: pd.DataFrame,
    ) -> float:

        # This is the same Isolation Forest
        # decision-function style score used
        # by the historical pipeline.

        score = (
            self.claim_model
            .decision_function(features)[0]
        )

        return float(score)


# ============================================================
# SINGLETON
# ============================================================

ml_model_service = MLModelService()


__all__ = [
    "MLModelService",
    "ml_model_service",
]