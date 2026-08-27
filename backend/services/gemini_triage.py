"""
Gemini AI Clinical Reasoning Engine with Fallback Heuristic Synthesizer.
Provides deep medical language understanding, atypical presentation detection,
and explicit uncertainty & confidence scoring.
"""

import os
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger("triage_ai")

# Attempt to configure Gemini if available
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
gemini_model = None

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        logger.info("Google Gemini 2.5 Flash initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize Gemini API: {e}. Using deterministic clinical fallback.")


def run_gemini_triage_assessment(
    patient_data: Dict[str, Any],
    age_category: str,
    rules_flags: List[str]
) -> Dict[str, Any]:
    """
    Runs clinical LLM reasoning over patient intake.
    Returns structured JSON with base_esi, confidence, clinical_rationale, uncertainty_factors, and immediate_actions.
    """
    age = patient_data.get("age", 30)
    gender = patient_data.get("gender", "Unknown")
    chief_complaint = patient_data.get("chief_complaint", "")
    hpi_narrative = patient_data.get("hpi_narrative", "")
    vitals = patient_data.get("vitals", {})
    chronic_conditions = patient_data.get("chronic_conditions", [])
    meds = patient_data.get("current_medications", [])
    is_zero_history = patient_data.get("is_zero_history", False)
    pain_score = patient_data.get("pain_score", 0)

    # If Gemini is configured and online, call the LLM
    if gemini_model:
        prompt = f"""
You are an expert Emergency Medicine Triage Physician. Evaluate the following patient intake presentation for an Emergency Department.
Apply standard Emergency Severity Index (ESI Level 1 to 5):
- ESI 1: Resuscitation / Immediate life-saving intervention needed
- ESI 2: High-risk situation, altered mental status, severe pain/distress, or emergent vitals
- ESI 3: Urgent, stable vitals, multiple ED resources required
- ESI 4: Semi-urgent, stable vitals, single ED resource (e.g. X-ray) required
- ESI 5: Non-urgent, no ED resources needed (e.g. minor suture removal, prescription refill)

PATIENT DATA:
- Age: {age} years ({age_category})
- Gender: {gender}
- Chief Complaint: {chief_complaint}
- History of Present Illness: {hpi_narrative}
- Pain Score: {pain_score}/10
- Vital Signs: HR {vitals.get('hr')} bpm, BP {vitals.get('bp_sys')}/{vitals.get('bp_dia')} mmHg, RR {vitals.get('rr')}, SpO2 {vitals.get('spo2')}%, Temp {vitals.get('temp_c')}°C
- Known Chronic Conditions: {', '.join(chronic_conditions)} (Zero History: {is_zero_history})
- Active Medications: {', '.join(meds)}
- Physiological Alerts Detected by Rules Engine: {', '.join(rules_flags) if rules_flags else 'None'}

Return ONLY a valid JSON object matching this exact schema:
{{
  "suggested_esi": <integer 1 to 5>,
  "confidence": <float between 0.0 and 1.0>,
  "clinical_rationale": "<2-3 sentence clinical justification>",
  "uncertainty_factors": ["<list of any ambiguous symptoms, missing data, or atypical presentations>"],
  "key_risk_factors": ["<key risk factors identified>"],
  "immediate_actions": ["<recommended immediate medical actions>"]
}}
"""
        try:
            response = gemini_model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            return data
        except Exception as err:
            logger.error(f"Gemini API invocation error: {err}. Falling back to internal clinical engine.")

    # High-fidelity Clinical Fallback Synthesizer
    return _synthesize_clinical_assessment(
        age=age,
        age_category=age_category,
        chief_complaint=chief_complaint,
        hpi_narrative=hpi_narrative,
        vitals=vitals,
        chronic_conditions=chronic_conditions,
        meds=meds,
        is_zero_history=is_zero_history,
        pain_score=pain_score,
        rules_flags=rules_flags
    )


def _synthesize_clinical_assessment(
    age: float,
    age_category: str,
    chief_complaint: str,
    hpi_narrative: str,
    vitals: Dict[str, Any],
    chronic_conditions: List[str],
    meds: List[str],
    is_zero_history: bool,
    pain_score: int,
    rules_flags: List[str]
) -> Dict[str, Any]:
    """
    Deterministic clinical reasoning synthesizer mimicking medical expert guidelines.
    Ensures 100% testable, zero-latency execution in all environments.
    """
    text = (chief_complaint + " " + hpi_narrative).lower()
    
    hr = vitals.get("hr", 75)
    sbp = vitals.get("bp_sys", 120)
    rr = vitals.get("rr", 16)
    spo2 = vitals.get("spo2", 98)
    temp = vitals.get("temp_c", 37.0)

    suggested_esi = 3
    confidence = 0.90
    uncertainty_factors = []
    key_risk_factors = []
    immediate_actions = []

    # Check Zero History Penalty
    if is_zero_history:
        confidence -= 0.15
        uncertainty_factors.append("First-time walk-in with zero prior hospital records on file")

    # ESI 1: Immediate Resuscitation Triggers
    if any(k in text for k in ["stridor at rest", "unresponsive", "anaphylaxis", "code stroke", "crushing substernal", "elephant sitting", "impending airway"]):
        suggested_esi = 1
        confidence = 0.95
        key_risk_factors.append("Critical threat to airway, breathing, circulation, or hyperacute stroke window")
        immediate_actions = ["Immediate Trauma/Resus Bay assignment", "STAT Bedside Physician Evaluation", "Continuous Cardiac & O2 Monitoring"]
        rationale = "Immediate life-threatening presentation requiring zero-delay resuscitation team activation."
        return {
            "suggested_esi": suggested_esi,
            "confidence": round(confidence, 2),
            "clinical_rationale": rationale,
            "uncertainty_factors": uncertainty_factors,
            "key_risk_factors": key_risk_factors,
            "immediate_actions": immediate_actions
        }

    # ESI 2: High Risk / Severe Pain / Sepsis / Atypical STEMI
    is_high_risk = False

    # Geriatric Atypical STEMI
    if age >= 65 and ("epigastric" in text or "diaphoresis" in text or "indigestion" in text) and any("diabetes" in c.lower() for c in chronic_conditions):
        suggested_esi = 2
        confidence = 0.68  # Ambiguous presentation triggers lower confidence
        is_high_risk = True
        uncertainty_factors.append("Atypical diabetic coronary syndrome presentation without classic substernal pain")
        key_risk_factors.append("Diabetic autonomic neuropathy masking angina", "High risk of acute inferior/posterior STEMI")
        immediate_actions.append("STAT 12-Lead ECG within 10 minutes", "Serial Troponins & IV access")
        rationale = "Atypical coronary syndrome presentation in diabetic geriatric patient presenting with diaphoresis and epigastric discomfort."

    # Geriatric Normothermic Sepsis
    elif age >= 65 and any(k in text for k in ["confusion", "somnolent", "urine"]) and sbp <= 100:
        suggested_esi = 2
        confidence = 0.70
        is_high_risk = True
        uncertainty_factors.append("Normothermic blunted febrile response masking underlying systemic infection")
        key_risk_factors.append("Altered mental status with borderline hypotension (qSOFA >= 2)", "High mortality sepsis risk")
        immediate_actions.extend(["Blood Cultures x 2 & STAT Lactate", "IV Crystalloid Resuscitation 30mL/kg", "Broad-Spectrum IV Antibiotics"])
        rationale = "Geriatric patient with acute altered mental status and borderline blood pressure concerning for urosepsis."

    # Geriatric Anticoagulated Head Strike
    elif age >= 65 and any(k in text for k in ["fall", "head", "forehead"]) and any(k in " ".join(meds).lower() for k in ["apixaban", "warfarin", "xarelto"]):
        suggested_esi = 2
        confidence = 0.85
        is_high_risk = True
        key_risk_factors.append("Direct oral anticoagulant use with blunt head trauma", "Risk of delayed intracranial hemorrhage")
        immediate_actions.extend(["STAT Non-Contrast Head CT", "Frequent Neurological GCS Checks", "Coagulation Panel"])
        rationale = "Elderly patient on oral anticoagulation presenting post-fall with temporal hematoma requiring emergency CT."

    # Pediatric Lethargy / Severe Respiratory Distress
    elif age < 16 and (rr >= 40 or hr >= 150 or spo2 <= 93 or "lethargic" in text or "rebound" in text):
        suggested_esi = 2
        confidence = 0.88
        is_high_risk = True
        key_risk_factors.append("Pediatric physiological decompensation risk (Elevated PEWS)", "Rapid airway/peritoneal compromise")
        immediate_actions.extend(["Pediatric Emergency Bay Placement", "Humidified Supplemental Oxygen", "STAT Pediatrician / Pediatric Surgery Consult"])
        rationale = f"Pediatric patient presenting with significant physiological derangement (RR {rr}, HR {hr}, SpO2 {spo2}%)."

    # Adult Sepsis / Severe Hypoxia / Ruptured Ectopic
    elif spo2 <= 91 or (sbp <= 95 and hr >= 115) or "ectopic" in text or "pelvic pain" in text:
        suggested_esi = 2
        confidence = 0.82
        is_high_risk = True
        key_risk_factors.append("Significant hemodynamic instability or acute hypoxic respiratory failure")
        immediate_actions.extend(["STAT Bedside Ultrasound / Blood Gas", "High-Flow Oxygen / IV Line Placement"])
        rationale = "Emergent presentation with compromised oxygenation or high risk of intra-abdominal hemorrhage."

    if is_high_risk:
        return {
            "suggested_esi": suggested_esi,
            "confidence": round(max(0.40, min(0.99, confidence)), 2),
            "clinical_rationale": rationale,
            "uncertainty_factors": uncertainty_factors,
            "key_risk_factors": key_risk_factors,
            "immediate_actions": immediate_actions
        }

    # ESI 4 & 5: Low Acuity / Fast Track
    if pain_score <= 3 and 60 <= hr <= 90 and 110 <= sbp <= 135 and 12 <= rr <= 18 and spo2 >= 98 and temp < 37.5:
        if any(k in text for k in ["papercut", "cut", "sore throat", "runny nose", "prescription", "minor suture", "refill"]):
            suggested_esi = 5
            confidence = 0.94
            key_risk_factors.append("Benign, isolated self-limiting complaint with normal vitals")
            immediate_actions = ["Route to ED Fast-Track / Minor Injury Unit"]
            rationale = "Normal vital signs with isolated minor complaint requiring zero emergency diagnostic resources."
            return {
                "suggested_esi": suggested_esi,
                "confidence": round(confidence, 2),
                "clinical_rationale": rationale,
                "uncertainty_factors": uncertainty_factors,
                "key_risk_factors": key_risk_factors,
                "immediate_actions": immediate_actions
            }
        elif any(k in text for k in ["ankle", "sprain", "twisted", "wrist pain", "isolated injury"]):
            suggested_esi = 4
            confidence = 0.90
            key_risk_factors.append("Isolated extremity trauma requiring single diagnostic modality")
            immediate_actions = ["Plain Radiography (X-ray)", "Temporary Splint / Compression Wrap", "Oral Analgesia"]
            rationale = "Hemodynamically stable patient with isolated extremity injury requiring a single diagnostic resource."
            return {
                "suggested_esi": suggested_esi,
                "confidence": round(confidence, 2),
                "clinical_rationale": rationale,
                "uncertainty_factors": uncertainty_factors,
                "key_risk_factors": key_risk_factors,
                "immediate_actions": immediate_actions
            }

    # Default ESI 3 (Multi-resource urgent)
    suggested_esi = 3
    if pain_score >= 8:
        key_risk_factors.append(f"Severe localized pain score ({pain_score}/10)")
    key_risk_factors.append("Anticipated requirement for multiple ED resources (IV labs, imaging, IV medications)")
    immediate_actions = ["Place in Urgent Observation Bay", "Draw Baseline ED Blood Work", "Administer IV/Oral Analgesia"]
    rationale = f"Stable vital signs but presentation warrants multiple ED diagnostic resources and active medical management."

    return {
        "suggested_esi": suggested_esi,
        "confidence": round(max(0.40, min(0.95, confidence)), 2),
        "clinical_rationale": rationale,
        "uncertainty_factors": uncertainty_factors,
        "key_risk_factors": key_risk_factors,
        "immediate_actions": immediate_actions
    }
