import { PatientRecord, TriageAssessment, QueueItem, AuditLogEntry } from '../types/triage';
import { MOCK_SIMULATED_PATIENTS } from '../data/mockPatients';
import { runLocalTriageAssessment } from './localTriageEngine';

const API_BASE_URL = 'http://localhost:8000';

export async function fetchSimulatedPatients(): Promise<PatientRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/simulated-patients`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Backend unreachable, fallback
  }
  return MOCK_SIMULATED_PATIENTS;
}

export async function assessPatient(patient: PatientRecord): Promise<{ patient: PatientRecord; assessment: TriageAssessment }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/triage/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Fallback to internal engine
  }

  const assessment = runLocalTriageAssessment(patient);
  return { patient, assessment };
}

export async function submitClinicianOverride(overrideData: {
  encounter_id: string;
  patient_mrn: string;
  patient_name: string;
  clinician_id: string;
  clinician_name: string;
  clinician_role: string;
  original_ai_esi: number;
  overridden_esi: number;
  ai_confidence: number;
  justification_reason: string;
}): Promise<AuditLogEntry> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/triage/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrideData),
    });
    if (res.ok) {
      const data = await res.json();
      return data.audit_log;
    }
  } catch (e) {
    // Fallback
  }

  // Client-side generated Audit Event
  return {
    id: `audit-${Math.random().toString(36).substring(2, 9)}`,
    encounter_id: overrideData.encounter_id,
    patient_mrn: overrideData.patient_mrn,
    patient_name: overrideData.patient_name,
    clinician_id: overrideData.clinician_id,
    clinician_name: overrideData.clinician_name,
    clinician_role: overrideData.clinician_role,
    event_type: 'CLINICIAN_OVERRIDE',
    original_ai_esi: overrideData.original_ai_esi as any,
    overridden_esi: overrideData.overridden_esi as any,
    ai_confidence: overrideData.ai_confidence,
    justification_reason: overrideData.justification_reason,
    timestamp: new Date().toISOString(),
    fhir_audit_event: {
      resourceType: 'AuditEvent',
      type: { code: 'triage-clinician-override' },
      recorded: new Date().toISOString(),
      agent: [{ who: { display: `${overrideData.clinician_name} (${overrideData.clinician_role})` } }],
      entity: [{ description: `AI ESI ${overrideData.original_ai_esi} -> ESI ${overrideData.overridden_esi}. Reason: ${overrideData.justification_reason}` }]
    }
  };
}
