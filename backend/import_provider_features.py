"""
ClaimGuard AI
Provider Features Import
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.services.supabase_service import (
    supabase_service,
)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

CSV_FILE = (
    BASE_DIR
    / "data"
    / "provider_features.csv"
)

BATCH_SIZE = 500


# ============================================================
# IMPORT
# ============================================================

def import_provider_features():

    print("=" * 60)
    print("PROVIDER FEATURES IMPORT")
    print("=" * 60)

    if not CSV_FILE.exists():

        raise FileNotFoundError(
            f"CSV file not found: {CSV_FILE}"
        )

    # ========================================================
    # LOAD CSV
    # ========================================================

    df = pd.read_csv(
        CSV_FILE
    )

    print(
        f"CSV rows: {len(df)}"
    )

    # ========================================================
    # REQUIRED COLUMNS
    # ========================================================

    required_columns = [
           "Provider",
    "TotalBeneficiaries",
    "TotalClaims",
    "AverageClaimReimbursement",
    "ClaimsPerBeneficiary",
    "ReimbursementPerBeneficiary",
    "PeerGroup",

    "AverageClaimReimbursement_PeerMean",
    "ClaimsPerBeneficiary_PeerMean",
    "ReimbursementPerBeneficiary_PeerMean",

    "AvgClaimReimbursement_PeerDeviation",
    "ClaimsPerBeneficiary_PeerDeviation",
    "ReimbursementPerBeneficiary_PeerDeviation",

    "AverageClaimReimbursement_PeerZScore",
    "ClaimsPerBeneficiary_PeerZScore",
    "ReimbursementPerBeneficiary_PeerZScore",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            "Missing required columns: "
            f"{missing_columns}"
        )

    # ========================================================
    # SELECT + RENAME
    # ========================================================

    features = df[
        required_columns
    ].copy()

    features = features.rename(
        columns={
        "Provider": "provider_id",
        "TotalBeneficiaries": "total_beneficiaries",
        "TotalClaims": "total_claims",
        "AverageClaimReimbursement":
            "average_claim_reimbursement",

        "ClaimsPerBeneficiary":
            "claims_per_beneficiary",

        "ReimbursementPerBeneficiary":
            "reimbursement_per_beneficiary",

        "PeerGroup":
            "peer_group",

        "AverageClaimReimbursement_PeerMean":
            "average_claim_reimbursement_peer_mean",

        "ClaimsPerBeneficiary_PeerMean":
            "claims_per_beneficiary_peer_mean",

        "ReimbursementPerBeneficiary_PeerMean":
            "reimbursement_per_beneficiary_peer_mean",

        "AvgClaimReimbursement_PeerDeviation":
            "average_claim_reimbursement_peer_deviation",

        "ClaimsPerBeneficiary_PeerDeviation":
            "claims_per_beneficiary_peer_deviation",

        "ReimbursementPerBeneficiary_PeerDeviation":
            "reimbursement_per_beneficiary_peer_deviation",

        "AverageClaimReimbursement_PeerZScore":
            "average_claim_reimbursement_peer_zscore",

        "ClaimsPerBeneficiary_PeerZScore":
            "claims_per_beneficiary_peer_zscore",

        "ReimbursementPerBeneficiary_PeerZScore":
            "reimbursement_per_beneficiary_peer_zscore",
    }
    )

    # ========================================================
    # VALIDATION
    # ========================================================

    if features[
        "provider_id"
    ].isna().any():

        raise ValueError(
            "Provider ID cannot be NULL."
        )

    duplicate_count = (
        features[
            "provider_id"
        ]
        .duplicated()
        .sum()
    )

    if duplicate_count > 0:

        raise ValueError(
            f"Found {duplicate_count} "
            "duplicate provider IDs."
        )

    # ========================================================
    # NUMERIC CONVERSION
    # ========================================================

    features[
        "total_claims"
    ] = pd.to_numeric(
        features[
            "total_claims"
        ],
        errors="coerce",
    )

    features[
        "average_claim_reimbursement"
    ] = pd.to_numeric(
        features[
            "average_claim_reimbursement"
        ],
        errors="coerce",
    )

    # ========================================================
    # INTEGER TOTAL CLAIMS
    # ========================================================

    features[
        "total_claims"
    ] = (
        features[
            "total_claims"
        ]
        .round()
        .astype("Int64")
    )

    # ========================================================
    # CLEAN NULL VALUES
    # ========================================================

    features = features.where(
        pd.notnull(features),
        None,
    )

    # ========================================================
    # RECORDS
    # ========================================================

    records = features.to_dict(
        orient="records"
    )

    total = len(records)

    print(
        f"Providers to import: {total}"
    )

    # ========================================================
    # UPSERT
    # ========================================================

    for start in range(
        0,
        total,
        BATCH_SIZE,
    ):

        batch = records[
            start:
            start + BATCH_SIZE
        ]

        end = min(
            start + BATCH_SIZE,
            total,
        )

        print(
            f"Upserting "
            f"{start + 1}-{end} "
            f"of {total}..."
        )

        result = (
            supabase_service.client
            .table(
                "provider_features"
            )
            .upsert(
                batch,
                on_conflict="provider_id",
            )
            .execute()
        )

        if result.data is None:

            raise RuntimeError(
                "Provider features import failed."
            )

    # ========================================================
    # COMPLETE
    # ========================================================

    print()
    print("=" * 60)
    print("IMPORT COMPLETED")
    print("=" * 60)

    print(
        f"Imported: {total} provider feature records"
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    import_provider_features()