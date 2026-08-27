"""
FHIR-Triage AI: FastAPI Main Application.
Emergency Department Patient Triage, Real-time Queue Intelligence, and Regulatory Audit API.
"""

import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.triage_rules import (
    get_age_category,
    calculate_pews,
    calculate_mews_qsofa,
    evaluate_geriatric_risk,
    evaluate_asymmetric_escalation,
    determine_ed_zone
)
from services.gemini_triage import run_gemini_triage_assessment
from services.fhir_triage_mapper import generate_fhir_triage_bundle
from services.audit_logger import log_clinician_override, get_all_audit_logs

# Load simulated patients database
SIM_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "simulated_patients.json")
try:
    with open(SIM_DATA_PATH, "r", encoding="utf-8") as f:
        SIMULATED_PATIENTS_DB = json.load(f)
except Exception:
    SIMULATED_PATIENTS_DB = []

# Target SLA in minutes mapped by ESI Level
SLA_MINUTES_MAP = {
    1: 0,    # Immediate
    2: 15,   # 15 minutes
    3: 30,   # 30 minutes
    4: 60,   # 60 minutes
    5: 120   # 120 minutes
}

# Live ED Queue In-Memory Store
LIVE_ED_QUEUE: List[Dict[str, Any]] = []

# FastAPI Application Initialization
app = FastAPI(
    title="FHIR-Triage AI Emergency Department Assistant",
    description="PS-1 Round 2: Real-time Age-Stratified Clinical Triage, Asymmetric Escalation & FHIR R4 API",
    version="2.0.0"
)

# CORS Configuration
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Pydantic Request Models
# ------------------------------------------------------------------------------
class VitalSignsInput(BaseModel):
    hr: Optional[int] = 75
    bp_sys: Optional[int] = 120
    bp_dia: Optional[int] = 80
    rr: Optional[int] = 16
    spo2: Optional[int] = 98
    temp_c: Optional[float] = 37.0


class PatientIntakeInput(BaseModel):
    id: Optional[str] = None
    mrn: Optional[str] = None
    name: str = "Anonymous Patient"
    age: float = 35.0
    gender: str = "Other"
    is_zero_history: bool = False
    chronic_conditions: List[str] = Field(default_factory=list)
    current_medications: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    chief_complaint: str = ""
    hpi_narrative: Optional[str] = ""
    pain_score: int = 0
    vitals: VitalSignsInput = Field(default_factory=VitalSignsInput)
    voice_transcript: Optional[str] = None


class ClinicianOverrideInput(BaseModel):
    encounter_id: str
    patient_mrn: str
    patient_name: str
    clinician_id: str = "RN-8842"
    clinician_name: str = "Jessica Miller, RN"
    clinician_role: str = "Senior Triage Nurse"
    original_ai_esi: int
    overridden_esi: int
    ai_confidence: float
    justification_reason: str


class VitalsReassessmentInput(BaseModel):
    encounter_id: str
    updated_vitals: VitalSignsInput
    updated_pain_score: Optional[int] = None


# ------------------------------------------------------------------------------
# Helper: Initialize Queue with a few starting cases
# ------------------------------------------------------------------------------
def _seed_initial_queue():
    if not LIVE_ED_QUEUE and SIMULATED_PATIENTS_DB:
        for p in SIMULATED_PATIENTS_DB[:5]:
            # Run assessment
            ass = _evaluate_patient_full(p)
            LIVE_ED_QUEUE.append({
                "encounter_id": f"ENC-{uuid.uuid4().hex[:8].upper()}",
                "patient": p,
                "assessment": ass,
                "status": "waiting",
                "arrival_time": (datetime.now(timezone.utc) - timedelta(minutes=5 * (p['expected_esi']))).isoformat(),
                "wait_time_minutes": 5 * p['expected_esi'],
                "sla_breached": False,
                "is_overridden": False
            })

_seed_initial_queue()


def _evaluate_patient_full(patient_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Execute complete triage pipeline for a patient dictionary."""
    age = float(patient_dict.get("age", 30))
    age_category = get_age_category(age)
    vitals = patient_dict.get("vitals", {})
    if hasattr(vitals, "model_dump"):
        vitals = vitals.model_dump()
    symptoms = patient_dict.get("chief_complaint", "") + " " + patient_dict.get("hpi_narrative", "")
    chronic_conditions = patient_dict.get("chronic_conditions", [])
    meds = patient_dict.get("current_medications", [])

    # 1. Deterministic Age-Stratified Rules
    pews_score, pews_flags = 0, []
    mews_score, qsofa_score, adult_flags = 0, 0, []
    geriatric_score, geriatric_flags = 0, []
    all_flags = []

    if age_category == "pediatric":
        pews_score, pews_flags = calculate_pews(age, vitals, symptoms)
        all_flags.extend(pews_flags)
    elif age_category == "adult":
        mews_score, qsofa_score, adult_flags = calculate_mews_qsofa(vitals, symptoms)
        all_flags.extend(adult_flags)
    else: # Geriatric
        mews_score, qsofa_score, adult_flags = calculate_mews_qsofa(vitals, symptoms)
        geriatric_score, geriatric_flags = evaluate_geriatric_risk(vitals, symptoms, chronic_conditions, meds)
        all_flags.extend(adult_flags + geriatric_flags)

    # 2. LLM / Clinical Reasoning
    ai_result = run_gemini_triage_assessment(patient_dict, age_category, all_flags)
    base_esi = ai_result.get("suggested_esi", 3)
    base_conf = ai_result.get("confidence", 0.85)

    # 3. Asymmetric Safety-First Escalation Layer
    final_esi, was_escalated, escalation_reason, final_conf = evaluate_asymmetric_escalation(
        age=age,
        vitals=vitals,
        symptoms=symptoms,
        base_esi=base_esi,
        confidence=base_conf,
        flags=all_flags
    )

    assigned_zone = determine_ed_zone(final_esi, age, symptoms)
    target_sla = SLA_MINUTES_MAP.get(final_esi, 30)

    assessment_payload = {
        "age_category": age_category,
        "base_esi": base_esi,
        "final_esi": final_esi,
        "confidence": final_conf,
        "target_sla_minutes": target_sla,
        "escalation_applied": was_escalated,
        "escalation_reason": escalation_reason if was_escalated else None,
        "assigned_zone": assigned_zone,
        "clinical_rationale": ai_result.get("clinical_rationale", ""),
        "uncertainty_factors": ai_result.get("uncertainty_factors", []),
        "key_risk_factors": ai_result.get("key_risk_factors", []) + all_flags,
        "immediate_actions": ai_result.get("immediate_actions", []),
        "scores": {
            "pews": pews_score if age_category == "pediatric" else None,
            "mews": mews_score if age_category in ["adult", "geriatric"] else None,
            "qsofa": qsofa_score if age_category in ["adult", "geriatric"] else None,
            "geriatric_risk": geriatric_score if age_category == "geriatric" else None
        }
    }

    # 4. Generate HL7 FHIR R4 Bundle
    fhir_bundle = generate_fhir_triage_bundle(patient_dict, assessment_payload, vitals)
    assessment_payload["fhir_bundle"] = fhir_bundle

    return assessment_payload


# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------
@app.get("/health")
def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "service": "FHIR-Triage AI Emergency Assistant",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_queue_count": len(LIVE_ED_QUEUE)
    }


@app.get("/api/simulated-patients")
def get_simulated_patients():
    """Fetch 20 pre-configured realistic simulated clinical patient cases."""
    return SIMULATED_PATIENTS_DB


@app.post("/api/triage/assess")
def assess_patient(intake: PatientIntakeInput):
    """
    Core Triage Assessment Engine:
    Executes age-stratified scoring, Gemini AI reasoning, asymmetric escalation,
    and HL7 FHIR R4 Bundle generation.
    """
    patient_dict = intake.model_dump()
    if not patient_dict.get("mrn"):
        patient_dict["mrn"] = f"MRN-{uuid.uuid4().hex[:6].upper()}"

    assessment = _evaluate_patient_full(patient_dict)
    return {
        "patient": patient_dict,
        "assessment": assessment
    }


@app.post("/api/triage/override")
def record_clinician_override(override_data: ClinicianOverrideInput):
    """
    Records an immutable clinician override with mandatory clinical justification.
    Updates active queue and creates regulatory FHIR AuditEvent.
    """
    if not override_data.justification_reason or len(override_data.justification_reason.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Regulatory Error: Clinical override requires a mandatory justification rationale."
        )

    log_entry = log_clinician_override(
        encounter_id=override_data.encounter_id,
        patient_mrn=override_data.patient_mrn,
        patient_name=override_data.patient_name,
        clinician_id=override_data.clinician_id,
        clinician_name=override_data.clinician_name,
        clinician_role=override_data.clinician_role,
        original_ai_esi=override_data.original_ai_esi,
        overridden_esi=override_data.overridden_esi,
        ai_confidence=override_data.ai_confidence,
        justification_reason=override_data.justification_reason
    )

    # Update Live Queue item if present
    for item in LIVE_ED_QUEUE:
        if item.get("encounter_id") == override_data.encounter_id:
            item["is_overridden"] = True
            item["assessment"]["final_esi"] = override_data.overridden_esi
            item["assessment"]["target_sla_minutes"] = SLA_MINUTES_MAP.get(override_data.overridden_esi, 30)
            item["override_log"] = log_entry
            break

    return {
        "status": "success",
        "message": "Clinician override successfully logged in compliance with HIPAA/GDPR/ABDM.",
        "audit_log": log_entry
    }


@app.get("/api/triage/queue")
def get_triage_queue():
    """
    Returns real-time Emergency Department queue with dynamic SLA countdowns
    and auto-deterioration breach flags.
    """
    now = datetime.now(timezone.utc)
    for item in LIVE_ED_QUEUE:
        try:
            arr_time = datetime.fromisoformat(item["arrival_time"].replace("Z", "+00:00"))
            mins_waiting = int((now - arr_time).total_seconds() / 60)
            item["wait_time_minutes"] = max(0, mins_waiting)
            sla = item["assessment"]["target_sla_minutes"]
            if sla > 0 and mins_waiting > sla:
                item["sla_breached"] = True
            else:
                item["sla_breached"] = False
        except Exception:
            pass

    # Sort queue by Severity Acuity (ESI 1 first), then by Wait Time descending
    sorted_queue = sorted(
        LIVE_ED_QUEUE,
        key=lambda x: (x["assessment"]["final_esi"], -x.get("wait_time_minutes", 0))
    )
    return sorted_queue


@app.post("/api/triage/queue/add")
def add_to_queue(intake: PatientIntakeInput):
    """Add newly assessed patient to live queue."""
    patient_dict = intake.model_dump()
    if not patient_dict.get("mrn"):
        patient_dict["mrn"] = f"MRN-{uuid.uuid4().hex[:6].upper()}"

    assessment = _evaluate_patient_full(patient_dict)
    enc_id = f"ENC-{uuid.uuid4().hex[:8].upper()}"
    queue_item = {
        "encounter_id": enc_id,
        "patient": patient_dict,
        "assessment": assessment,
        "status": "waiting",
        "arrival_time": datetime.now(timezone.utc).isoformat(),
        "wait_time_minutes": 0,
        "sla_breached": False,
        "is_overridden": False
    }
    LIVE_ED_QUEUE.insert(0, queue_item)
    return queue_item


@app.post("/api/surge/simulate")
def simulate_surge():
    """
    Simulates a 3x Volume Surge in the Emergency Room:
    Instantly loads all 20 simulated patients with varied arrival times.
    """
    global LIVE_ED_QUEUE
    LIVE_ED_QUEUE = []
    
    for i, p in enumerate(SIMULATED_PATIENTS_DB):
        ass = _evaluate_patient_full(p)
        # Stagger simulated wait times
        wait_mins = (i * 7) % 65
        LIVE_ED_QUEUE.append({
            "encounter_id": f"ENC-SURGE-{i+1:03d}",
            "patient": p,
            "assessment": ass,
            "status": "waiting",
            "arrival_time": (datetime.now(timezone.utc) - timedelta(minutes=wait_mins)).isoformat(),
            "wait_time_minutes": wait_mins,
            "sla_breached": (wait_mins > ass["target_sla_minutes"] if ass["target_sla_minutes"] > 0 else False),
            "is_overridden": False
        })

    return {
        "status": "surge_active",
        "message": f"🚨 ED Surge Mode Active: Ingested {len(LIVE_ED_QUEUE)} simultaneous patient arrivals.",
        "queue_count": len(LIVE_ED_QUEUE)
    }


@app.get("/api/audit-logs")
def get_audit_logs():
    """Fetch immutable regulatory audit logs."""
    return get_all_audit_logs()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
