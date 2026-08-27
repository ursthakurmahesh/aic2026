"""
HL7 FHIR R4 Interoperability Mapper for Emergency Department Triage Encounters.
Constructs valid FHIR R4 Bundles containing Patient, Encounter, Observation (LOINC),
Condition (SNOMED-CT), RiskAssessment, and AuditEvent resources.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List


def generate_fhir_triage_bundle(
    patient: Dict[str, Any],
    assessment: Dict[str, Any],
    vitals: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Builds a standard HL7 FHIR R4 Bundle for an ED Triage Encounter.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    bundle_id = f"bundle-triage-{uuid.uuid4()}"
    patient_id = patient.get("mrn", f"pat-{uuid.uuid4()}")
    encounter_id = f"enc-{uuid.uuid4()}"
    
    entries = []

    # 1. Patient Resource
    patient_resource = {
        "fullUrl": f"urn:uuid:{patient_id}",
        "resource": {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [
                {
                    "system": "http://hospital.org/mrn",
                    "value": patient.get("mrn", "MRN-UNKNOWN")
                }
            ],
            "name": [
                {
                    "use": "official",
                    "text": patient.get("name", "Unknown Patient")
                }
            ],
            "gender": str(patient.get("gender", "unknown")).lower(),
            "extension": [
                {
                    "url": "http://hospital.org/fhir/StructureDefinition/age-category",
                    "valueString": patient.get("age_category", "adult")
                },
                {
                    "url": "http://hospital.org/fhir/StructureDefinition/zero-history-flag",
                    "valueBoolean": patient.get("is_zero_history", False)
                }
            ]
        }
    }
    entries.append(patient_resource)

    # 2. Encounter Resource with ESI Priority
    esi_level = assessment.get("final_esi", 3)
    target_sla = assessment.get("target_sla_minutes", 30)
    
    encounter_resource = {
        "fullUrl": f"urn:uuid:{encounter_id}",
        "resource": {
            "resourceType": "Encounter",
            "id": encounter_id,
            "status": "in-progress",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "EMER",
                "display": "Emergency"
            },
            "priority": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActPriority",
                        "code": f"ESI-{esi_level}",
                        "display": f"Emergency Severity Index Level {esi_level}"
                    }
                ],
                "text": f"ESI Level {esi_level} (Target SLA: {target_sla} mins)"
            },
            "subject": {
                "reference": f"urn:uuid:{patient_id}",
                "display": patient.get("name", "Patient")
            },
            "period": {
                "start": now_iso
            },
            "serviceType": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/service-type",
                        "code": "57",
                        "display": "Emergency Medicine"
                    }
                ],
                "text": assessment.get("assigned_zone", "Main ED Acute Care")
            }
        }
    }
    entries.append(encounter_resource)

    # 3. LOINC Vital Sign Observations
    loinc_map = [
        ("Heart Rate", "8867-4", vitals.get("hr"), "/min", "bpm"),
        ("Systolic Blood Pressure", "8480-6", vitals.get("bp_sys"), "mm[Hg]", "mmHg"),
        ("Diastolic Blood Pressure", "8462-4", vitals.get("bp_dia"), "mm[Hg]", "mmHg"),
        ("Respiratory Rate", "9279-1", vitals.get("rr"), "/min", "breaths/min"),
        ("Oxygen Saturation", "2708-6", vitals.get("spo2"), "%", "%"),
        ("Body Temperature", "8310-5", vitals.get("temp_c"), "Cel", "°C")
    ]

    for name, loinc_code, val, ucum_code, unit_text in loinc_map:
        if val is not None:
            obs_id = f"obs-{uuid.uuid4()}"
            entries.append({
                "fullUrl": f"urn:uuid:{obs_id}",
                "resource": {
                    "resourceType": "Observation",
                    "id": obs_id,
                    "status": "final",
                    "category": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                    "code": "vital-signs",
                                    "display": "Vital Signs"
                                }
                            ]
                        }
                    ],
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": loinc_code,
                                "display": name
                            }
                        ],
                        "text": name
                    },
                    "subject": { "reference": f"urn:uuid:{patient_id}" },
                    "encounter": { "reference": f"urn:uuid:{encounter_id}" },
                    "effectiveDateTime": now_iso,
                    "valueQuantity": {
                        "value": float(val),
                        "unit": unit_text,
                        "system": "http://unitsofmeasure.org",
                        "code": ucum_code
                    }
                }
            })

    # 4. Condition Resource (Chief Complaint)
    cond_id = f"cond-{uuid.uuid4()}"
    entries.append({
        "fullUrl": f"urn:uuid:{cond_id}",
        "resource": {
            "resourceType": "Condition",
            "id": cond_id,
            "clinicalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active"
                    }
                ]
            },
            "verificationStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": "provisional"
                    }
                ]
            },
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                            "code": "encounter-diagnosis",
                            "display": "Encounter Diagnosis"
                        }
                    ]
                }
            ],
            "code": {
                "text": patient.get("chief_complaint", "Undifferentiated Emergency Presentation")
            },
            "subject": { "reference": f"urn:uuid:{patient_id}" },
            "encounter": { "reference": f"urn:uuid:{encounter_id}" },
            "onsetDateTime": now_iso
        }
    })

    # 5. RiskAssessment Resource (AI Triage Prediction & Confidence)
    risk_id = f"risk-{uuid.uuid4()}"
    entries.append({
        "fullUrl": f"urn:uuid:{risk_id}",
        "resource": {
            "resourceType": "RiskAssessment",
            "id": risk_id,
            "status": "final",
            "subject": { "reference": f"urn:uuid:{patient_id}" },
            "encounter": { "reference": f"urn:uuid:{encounter_id}" },
            "occurrenceDateTime": now_iso,
            "method": {
                "coding": [
                    {
                        "system": "http://hospital.org/fhir/triage-method",
                        "code": "HYBRID-AI-RULES",
                        "display": "Hybrid Rules + Gemini AI Clinical Engine"
                    }
                ]
            },
            "prediction": [
                {
                    "outcome": {
                        "text": f"ESI Level {esi_level} Acuity Recommendation"
                    },
                    "probabilityDecimal": float(assessment.get("confidence", 0.85)),
                    "qualitativeRisk": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/risk-probability",
                                "code": "high" if esi_level <= 2 else "moderate" if esi_level == 3 else "low",
                                "display": "High Risk" if esi_level <= 2 else "Moderate Risk" if esi_level == 3 else "Low Risk"
                            }
                        ]
                    },
                    "rationale": assessment.get("clinical_rationale", "")
                }
            ],
            "note": [
                {
                    "text": f"Safety Escalation Applied: {assessment.get('escalation_applied', False)}. Reason: {assessment.get('escalation_reason', 'N/A')}"
                }
            ]
        }
    })

    return {
        "resourceType": "Bundle",
        "id": bundle_id,
        "type": "collection",
        "timestamp": now_iso,
        "entry": entries
    }
