export type ESILevel = 1 | 2 | 3 | 4 | 5;

export type AgeCategory = 'pediatric' | 'adult' | 'geriatric';

export interface VitalSigns {
  hr: number;
  bp_sys: number;
  bp_dia: number;
  rr: number;
  spo2: number;
  temp_c: number;
}

export interface PatientRecord {
  id?: string;
  mrn: string;
  name: string;
  age: number;
  age_category: AgeCategory;
  gender: string;
  is_zero_history: boolean;
  chronic_conditions: string[];
  current_medications: string[];
  allergies: string[];
  chief_complaint: string;
  hpi_narrative: string;
  pain_score: number;
  vitals: VitalSigns;
  case_type?: string;
  expected_esi?: ESILevel;
  clinical_rationale?: string;
}

export interface TriageAssessment {
  age_category: AgeCategory;
  base_esi: ESILevel;
  final_esi: ESILevel;
  confidence: number; // 0.00 - 1.00
  target_sla_minutes: number;
  escalation_applied: boolean;
  escalation_reason?: string | null;
  assigned_zone: string;
  clinical_rationale: string;
  uncertainty_factors: string[];
  key_risk_factors: string[];
  immediate_actions: string[];
  scores: {
    pews?: number | null;
    mews?: number | null;
    qsofa?: number | null;
    geriatric_risk?: number | null;
  };
  fhir_bundle?: any;
}

export interface QueueItem {
  encounter_id: string;
  patient: PatientRecord;
  assessment: TriageAssessment;
  status: 'waiting' | 'in_treatment' | 'discharged' | 'deteriorated';
  arrival_time: string;
  wait_time_minutes: number;
  sla_breached: boolean;
  is_overridden: boolean;
  override_log?: AuditLogEntry;
}

export interface AuditLogEntry {
  id: string;
  encounter_id: string;
  patient_mrn: string;
  patient_name: string;
  clinician_id: string;
  clinician_name: string;
  clinician_role: string;
  event_type: string;
  original_ai_esi: ESILevel;
  overridden_esi: ESILevel;
  ai_confidence: number;
  justification_reason: string;
  timestamp: string;
  fhir_audit_event: any;
}

export interface SurgeConfig {
  is_surge_active: boolean;
  multiplier: number;
  total_waiting: number;
  fast_track_diverted_count: number;
  critical_count: number;
}
