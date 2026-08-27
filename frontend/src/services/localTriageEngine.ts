import { PatientRecord, TriageAssessment, ESILevel, AgeCategory } from '../types/triage';

export function runLocalTriageAssessment(patient: PatientRecord): TriageAssessment {
  const age = Number(patient.age) || 30;
  const ageCategory: AgeCategory = age < 16 ? 'pediatric' : age >= 65 ? 'geriatric' : 'adult';
  const vitals = patient.vitals || { hr: 75, bp_sys: 120, bp_dia: 80, rr: 16, spo2: 98, temp_c: 37.0 };
  const text = ((patient.chief_complaint || "") + " " + (patient.hpi_narrative || "")).toLowerCase();
  const chronic = (patient.chronic_conditions || []).join(" ").toLowerCase();
  const meds = (patient.current_medications || []).join(" ").toLowerCase();

  let baseEsi: ESILevel = 3;
  let confidence = 0.90;
  const uncertaintyFactors: string[] = [];
  const keyRiskFactors: string[] = [];
  const immediateActions: string[] = [];
  const rulesFlags: string[] = [];

  let pewsScore: number | null = null;
  let mewsScore: number | null = null;
  let qsofaScore: number | null = null;
  let geriatricRisk: number | null = null;

  if (patient.is_zero_history) {
    confidence -= 0.15;
    uncertaintyFactors.push("First-time walk-in with zero prior hospital records on file");
  }

  // -------------------------------------------------------------
  // Age-Stratified Rules
  // -------------------------------------------------------------
  if (ageCategory === 'pediatric') {
    pewsScore = 0;
    if (vitals.hr > 160 || vitals.hr < 70) {
      pewsScore += 2;
      rulesFlags.push(`Pediatric high tachycardia/bradycardia HR ${vitals.hr} bpm`);
    }
    if (vitals.rr > 40) {
      pewsScore += 2;
      rulesFlags.push(`Pediatric marked tachypnea RR ${vitals.rr}`);
    }
    if (vitals.spo2 < 93) {
      pewsScore += 3;
      rulesFlags.push(`Pediatric hypoxia SpO2 ${vitals.spo2}%`);
    }
    if (text.includes('lethargic') || text.includes('poor feeding') || text.includes('retractions')) {
      pewsScore += 2;
      rulesFlags.push("Pediatric lethargy and increased work of breathing");
    }
  } else {
    // Adult / Geriatric MEWS & qSOFA
    mewsScore = 0;
    qsofaScore = 0;
    if (vitals.hr >= 110 || vitals.hr <= 50) mewsScore += 2;
    if (vitals.bp_sys <= 100) {
      mewsScore += 1;
      qsofaScore += 1;
      rulesFlags.push(`Borderline hypotension SBP ${vitals.bp_sys} mmHg (qSOFA +1)`);
    }
    if (vitals.rr >= 22) {
      mewsScore += 1;
      qsofaScore += 1;
      rulesFlags.push(`Tachypnea RR ${vitals.rr} (qSOFA +1)`);
    }
    if (text.includes('confus') || text.includes('somnolent') || text.includes('delirium')) {
      mewsScore += 2;
      qsofaScore += 1;
      rulesFlags.push("Altered mental status (qSOFA +1)");
    }
    if (vitals.spo2 <= 92) {
      rulesFlags.push(`Severe hypoxia SpO2 ${vitals.spo2}%`);
    }

    if (ageCategory === 'geriatric') {
      geriatricRisk = 0;
      if ((meds.includes('apixaban') || meds.includes('warfarin') || meds.includes('blood thinner')) && text.includes('fall')) {
        geriatricRisk += 3;
        rulesFlags.push("🚨 Geriatric Alert: Head trauma on active anticoagulation");
      }
      if (chronic.includes('diabetes') && (text.includes('epigastric') || text.includes('sweat') || text.includes('fatigue'))) {
        geriatricRisk += 3;
        rulesFlags.push("🚨 Geriatric Alert: Atypical silent myocardial ischemia presentation in diabetic patient");
      }
      if (vitals.temp_c < 37.0 && qsofaScore >= 2) {
        geriatricRisk += 2;
        rulesFlags.push(`🚨 Geriatric Alert: Blunted febrile response (${vitals.temp_c}°C) with suspected urosepsis`);
      }
    }
  }

  // -------------------------------------------------------------
  // ESI Acuity Assignment
  // -------------------------------------------------------------
  let rationale = "Stable vital signs with anticipated need for standard multi-resource diagnostic evaluation.";
  
  // ESI 1 (Resuscitation)
  if (text.includes('stridor at rest') || text.includes('anaphylaxis') || text.includes('code stroke') || text.includes('elephant sitting') || text.includes('unresponsive')) {
    baseEsi = 1;
    confidence = 0.95;
    keyRiskFactors.push("Immediate threat to airway, breathing, circulation, or acute stroke thrombolytic window");
    immediateActions.push("Immediate Trauma/Resus Bay assignment", "STAT Bedside Physician Evaluation", "Continuous Cardiac & O2 Monitoring");
    rationale = "Immediate life-threatening presentation requiring zero-delay resuscitation team activation.";
  }
  // ESI 2 (Emergent / High Risk)
  else if (
    (ageCategory === 'pediatric' && (pewsScore || 0) >= 4) ||
    (ageCategory === 'geriatric' && (geriatricRisk || 0) >= 3) ||
    (qsofaScore || 0) >= 2 ||
    vitals.spo2 <= 91 ||
    text.includes('ectopic') ||
    text.includes('appendicitis') ||
    text.includes('rebound')
  ) {
    baseEsi = 2;
    if (ageCategory === 'geriatric' && text.includes('epigastric')) {
      confidence = 0.68; // Ambiguous presentation
      uncertaintyFactors.push("Atypical diabetic coronary syndrome presentation without classic substernal pain");
    } else {
      confidence = 0.85;
    }
    keyRiskFactors.push(...rulesFlags);
    immediateActions.push("Urgent Acute Bed Placement", "STAT 12-Lead ECG / Bedside Ultrasound", "Continuous Vital Sign Monitoring");
    rationale = "High-risk acute presentation with potential for rapid physiological decompensation or occult emergency.";
  }
  // ESI 4 / 5 (Low Acuity)
  else if (patient.pain_score <= 3 && vitals.hr <= 85 && vitals.bp_sys <= 135 && vitals.rr <= 18 && vitals.spo2 >= 98) {
    if (text.includes('papercut') || text.includes('sore throat') || text.includes('prescription') || text.includes('cut')) {
      baseEsi = 5;
      confidence = 0.95;
      keyRiskFactors.push("Benign self-limiting complaint with completely normal physiology");
      immediateActions.push("Direct to Fast-Track Minor Injury Clinic / Outpatient Divert");
      rationale = "Completely stable vital signs requiring zero hospital-level diagnostic resources.";
    } else if (text.includes('ankle') || text.includes('sprain') || text.includes('twist')) {
      baseEsi = 4;
      confidence = 0.92;
      keyRiskFactors.push("Isolated extremity trauma requiring single diagnostic modality");
      immediateActions.push("Single Plain Radiography (X-ray)", "Temporary Splint / Compression Bandage");
      rationale = "Stable patient with isolated extremity injury requiring a single diagnostic resource.";
    }
  } else {
    // ESI 3 (Urgent)
    baseEsi = 3;
    keyRiskFactors.push("Requires multiple ED resources (IV labs, imaging, IV medications)");
    immediateActions.push("Place in Urgent Observation Bay", "Draw Baseline Blood Work", "Administer Analgesia/Hydration");
  }

  // -------------------------------------------------------------
  // Asymmetric Escalation (Safety-First Bias)
  // -------------------------------------------------------------
  let finalEsi = baseEsi;
  let escalationApplied = false;
  let escalationReason: string | null = null;

  if (confidence < 0.75 && baseEsi > 2) {
    finalEsi = (baseEsi - 1) as ESILevel;
    escalationApplied = true;
    escalationReason = `Safety-First Fail-Safe: High uncertainty (${Math.round(confidence * 100)}% confidence) in presenting symptoms. Escalated from ESI ${baseEsi} to ESI ${finalEsi} to prevent under-triage.`;
  } else if (ageCategory === 'geriatric' && (geriatricRisk || 0) >= 3 && baseEsi > 2) {
    finalEsi = 2;
    escalationApplied = true;
    escalationReason = "Geriatric Safety Rule: High-risk occult presentation (atypical ischemia / anticoagulated head strike). Escalated to ESI 2 for STAT diagnostics.";
  }

  const slaMinutesMap: Record<ESILevel, number> = { 1: 0, 2: 15, 3: 30, 4: 60, 5: 120 };
  const targetSla = slaMinutesMap[finalEsi] || 30;

  // Determine Zone
  let assignedZone = "Main ED Acute Care";
  if (finalEsi === 1) assignedZone = "Resuscitation Bay / Trauma Code";
  else if (finalEsi === 2) assignedZone = ageCategory === 'pediatric' ? "Pediatric Acute Care" : "Acute Treatment Area";
  else if (finalEsi === 3) assignedZone = ageCategory === 'pediatric' ? "Pediatric Observation Area" : "Main ED Urgent Observation";
  else if (finalEsi === 4) assignedZone = "Sub-Acute / Single Resource Area";
  else assignedZone = "Fast-Track Minor Injury / Outpatient Divert";

  // Build FHIR Bundle
  const fhirBundle = {
    resourceType: "Bundle",
    id: `bundle-triage-${Math.random().toString(36).substring(2, 9)}`,
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: patient.mrn,
          name: [{ text: patient.name }],
          gender: patient.gender.toLowerCase(),
          extension: [{ url: "http://hospital.org/age-category", valueString: ageCategory }]
        }
      },
      {
        resource: {
          resourceType: "Encounter",
          status: "in-progress",
          class: { code: "EMER", display: "Emergency" },
          priority: { text: `ESI Level ${finalEsi} (Target SLA: ${targetSla} mins)` },
          serviceType: { text: assignedZone }
        }
      },
      {
        resource: {
          resourceType: "RiskAssessment",
          status: "final",
          prediction: [{
            outcome: { text: `ESI Level ${finalEsi} Acuity Recommendation` },
            probabilityDecimal: Number(confidence.toFixed(2)),
            rationale
          }]
        }
      }
    ]
  };

  return {
    age_category: ageCategory,
    base_esi: baseEsi,
    final_esi: finalEsi,
    confidence: Number(confidence.toFixed(2)),
    target_sla_minutes: targetSla,
    escalation_applied: escalationApplied,
    escalation_reason: escalationReason,
    assigned_zone: assignedZone,
    clinical_rationale: rationale,
    uncertainty_factors: uncertaintyFactors,
    key_risk_factors: [...keyRiskFactors, ...rulesFlags],
    immediate_actions: immediateActions,
    scores: {
      pews: pewsScore,
      mews: mewsScore,
      qsofa: qsofaScore,
      geriatric_risk: geriatricRisk
    },
    fhir_bundle: fhirBundle
  };
}
