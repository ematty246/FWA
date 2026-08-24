"""
ClaimGuard AI
Main FastAPI Application
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import (
    APP_NAME,
    APP_VERSION,
    validate_config,
)

from app.api.auth import (
    router as auth_router,
)
from app.api.provider_registration import (
    router as provider_registration_router,
)
from app.api.admin_provider import (
    router as admin_provider_router,
)
from app.api.investigator_registration import (
    router as investigator_registration_router,
)
from app.api.admin_investigator_approval import (
    router as admin_investigator_approval_router,
)
from app.api.investigator_queue import (
    router as investigator_queue_router,
)
from app.api.investigator_assignment import (
    router as investigator_assignment_router,
)
from app.api.provider_risk import (
    router as provider_risk_router,
)
from app.api.provider_claims import (
    router as provider_claims_router,
)
from app.api.provider_claim_details import (
    router as provider_claim_details_router,
)
from app.api.peer_comparison import (
    router as peer_comparison_router,
)
from app.api.peer_comparison_detail import (
    router as peer_comparison_detail_router,
)

from app.api.new_provider_claims import (
    router as new_provider_claims_router
)
from app.api.investigation_records import router as investigation_records_router
# ============================================================
# VALIDATE CONFIGURATION
# ============================================================

validate_config()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "ClaimGuard AI "
        "Authentication Service"
    ),
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# AUTH ROUTER
# ============================================================

app.include_router(
    auth_router
)
app.include_router(
    provider_registration_router
)
app.include_router(
    admin_provider_router
)
# ============================================================
# ROUTERS
# ============================================================

app.include_router(
    auth_router
)

app.include_router(
    provider_registration_router
)

app.include_router(
    admin_provider_router
)

app.include_router(
    investigator_registration_router
)
app.include_router(
    admin_investigator_approval_router
)
app.include_router(
    investigator_queue_router
)
app.include_router(
    investigator_assignment_router
)
app.include_router(
    provider_risk_router
)
app.include_router(
    provider_claims_router
)
app.include_router(
    provider_claim_details_router
)
app.include_router(
    peer_comparison_router
)
app.include_router(
    peer_comparison_detail_router
)
app.include_router(
    new_provider_claims_router
)
app.include_router(
    investigation_records_router
)
# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "application": APP_NAME,
        "version": APP_VERSION,
        "status": "running",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": APP_NAME,
        "version": APP_VERSION,
    }