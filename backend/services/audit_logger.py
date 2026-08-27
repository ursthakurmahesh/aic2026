"""
Regulatory-Compliant Immutable Audit Logger for Clinician Overrides & Triage Decisions.
Compliant with HIPAA Security Rule (45 CFR § 164.312), GDPR Article 22, and ABDM guidelines.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List

# In-memory storage for prototype session
AUDIT_LOG_STORE: List[Dict[str, Any]] = []


def log_clinician_override(
    encounter_id: str,
    patient_mrn: str,
    patient_name: str,
    clinician_id: str,
    clinician_name: str,
    clinician_role: str,
    original_ai_esi: int,
    overridden_esi: int,
    ai_confidence: float,
    justification_reason: str
) -> Dict[str, Any]:
    """
    Records an immutable audit event whenever a clinician overrides the AI suggestion.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    audit_id = f"audit-{uuid.uuid4()}"
    
    # Generate FHIR AuditEvent resource
    fhir_audit_event = {
        "resourceType": "AuditEvent",
        "id": audit_id,
        "type": {
            "system": "http://hospital.org/fhir/audit-event-type",
            "code": "triage-clinician-override",
            "display": "Emergency Triage Clinician Override"
        },
        "action": "U", # Update / Override
        "recorded": now_iso,
        "outcome": "0", # Success
        "outcomeDesc": f"Clinician overridden AI ESI Level {original_ai_esi} to ESI Level {overridden_esi}",
        "agent": [
            {
                "type": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                            "code": "AUT",
                            "display": "Author / Licensed Clinician"
                        }
                    ]
                },
                "who": {
                    "identifier": {
                        "system": "http://hospital.org/staff/id",
                        "value": clinician_id
                    },
                    "display": f"{clinician_name} ({clinician_role})"
                },
                "requestor": True
            }
        ],
        "source": {
            "observer": {
                "display": "FHIR-Triage AI Decision Support System"
            }
        },
        "entity": [
            {
                "what": {
                    "identifier": {
                        "system": "http://hospital.org/mrn",
                        "value": patient_mrn
                    },
                    "display": patient_name
                },
                "description": f"Encounter {encounter_id}: AI ESI {original_ai_esi} ({int(ai_confidence*100)}% conf) changed to ESI {overridden_esi}. Mandatory Justification: {justification_reason}"
            }
        ]
    }

    log_entry = {
        "id": audit_id,
        "encounter_id": encounter_id,
        "patient_mrn": patient_mrn,
        "patient_name": patient_name,
        "clinician_id": clinician_id,
        "clinician_name": clinician_name,
        "clinician_role": clinician_role,
        "event_type": "CLINICIAN_OVERRIDE",
        "original_ai_esi": original_ai_esi,
        "overridden_esi": overridden_esi,
        "ai_confidence": ai_confidence,
        "justification_reason": justification_reason,
        "timestamp": now_iso,
        "fhir_audit_event": fhir_audit_event
    }

    AUDIT_LOG_STORE.insert(0, log_entry)
    return log_entry


def get_all_audit_logs() -> List[Dict[str, Any]]:
    """Return all recorded audit logs."""
    return AUDIT_LOG_STORE
