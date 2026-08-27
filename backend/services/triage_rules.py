"""
Clinical Triage Rules Engine: Age-Stratified Scoring, PEWS, MEWS, qSOFA & Asymmetric Escalation.
Encodes deterministic clinical guidelines for Pediatric (<16), Adult (16-65), and Geriatric (>65) patients.
"""

from typing import Dict, Any, Tuple, List


def get_age_category(age: float) -> str:
    """Classify patient into pediatric, adult, or geriatric."""
    if age < 16.0:
        return "pediatric"
    elif age >= 65.0:
        return "geriatric"
    return "adult"


def calculate_pews(age: float, vitals: Dict[str, Any], symptoms_text: str) -> Tuple[int, List[str]]:
    """
    Calculate Pediatric Early Warning Score (PEWS) (0-9).
    Scores Behavior/Neurological, Cardiovascular, and Respiratory domains with age-bracketed vital norms.
    """
    pews_score = 0
    flags = []
    
    hr = vitals.get("hr", 90)
    rr = vitals.get("rr", 20)
    spo2 = vitals.get("spo2", 98)
    temp = vitals.get("temp_c", 37.0)
    text_lower = symptoms_text.lower()
    
    # 1. Behavior / Neurological Domain
    if any(k in text_lower for k in ["unresponsive", "flaccid", "posturing", "seizure", "coma"]):
        pews_score += 3
        flags.append("Pediatric critical altered consciousness (PEWS Neuro +3)")
    elif any(k in text_lower for k in ["lethargic", "poor feeding", "inconsolable", "irritable", "somnolent"]):
        pews_score += 2
        flags.append("Pediatric lethargy / decreased activity (PEWS Neuro +2)")
    elif "sleeping" in text_lower or "fussy" in text_lower:
        pews_score += 1
        flags.append("Pediatric mild irritability (PEWS Neuro +1)")

    # 2. Cardiovascular Domain (Age-bracketed HR)
    if age < 1.0: # Infant
        if hr > 180 or hr < 90:
            pews_score += 3
            flags.append(f"Critical infant HR {hr} bpm (PEWS Cardio +3)")
        elif hr > 160 or hr < 100:
            pews_score += 2
            flags.append(f"Severe infant tachycardia HR {hr} bpm (PEWS Cardio +2)")
        elif hr > 140:
            pews_score += 1
            flags.append(f"Mild infant tachycardia HR {hr} bpm (PEWS Cardio +1)")
    elif age < 6.0: # Toddler / Preschool
        if hr > 160 or hr < 70:
            pews_score += 3
            flags.append(f"Critical toddler HR {hr} bpm (PEWS Cardio +3)")
        elif hr > 140 or hr < 80:
            pews_score += 2
            flags.append(f"Severe toddler tachycardia HR {hr} bpm (PEWS Cardio +2)")
        elif hr > 120:
            pews_score += 1
            flags.append(f"Moderate toddler tachycardia HR {hr} bpm (PEWS Cardio +1)")
    else: # School-age / Adolescent
        if hr > 140 or hr < 50:
            pews_score += 3
            flags.append(f"Critical child HR {hr} bpm (PEWS Cardio +3)")
        elif hr > 120 or hr < 60:
            pews_score += 2
            flags.append(f"Severe child tachycardia HR {hr} bpm (PEWS Cardio +2)")
        elif hr > 100:
            pews_score += 1
            flags.append(f"Mild child tachycardia HR {hr} bpm (PEWS Cardio +1)")

    # 3. Respiratory Domain (Age-bracketed RR & Work of Breathing)
    if age < 1.0:
        if rr > 60 or rr < 20:
            pews_score += 3
            flags.append(f"Critical infant RR {rr} (PEWS Resp +3)")
        elif rr > 50:
            pews_score += 2
            flags.append(f"Severe infant tachypnea RR {rr} (PEWS Resp +2)")
        elif rr > 40:
            pews_score += 1
    elif age < 6.0:
        if rr > 50 or rr < 15:
            pews_score += 3
            flags.append(f"Critical toddler RR {rr} (PEWS Resp +3)")
        elif rr > 40:
            pews_score += 2
            flags.append(f"Severe toddler tachypnea RR {rr} (PEWS Resp +2)")
        elif rr > 30:
            pews_score += 1
    else:
        if rr > 40 or rr < 10:
            pews_score += 3
            flags.append(f"Critical child RR {rr} (PEWS Resp +3)")
        elif rr > 30:
            pews_score += 2
            flags.append(f"Severe child tachypnea RR {rr} (PEWS Resp +2)")
        elif rr > 24:
            pews_score += 1

    # Oxygenation & Retractions
    if spo2 < 92:
        pews_score += 3
        flags.append(f"Critical pediatric hypoxia SpO2 {spo2}% (PEWS +3)")
    elif spo2 <= 94:
        pews_score += 2
        flags.append(f"Moderate pediatric hypoxia SpO2 {spo2}% (PEWS +2)")

    if any(k in text_lower for k in ["stridor", "grunting", "apnea", "severe retractions", "tracheal tugging"]):
        pews_score += 3
        flags.append("Critical pediatric work of breathing / stridor (PEWS +3)")
    elif any(k in text_lower for k in ["wheezing", "retractions", "flaring", "barking"]):
        pews_score += 2
        flags.append("Moderate pediatric respiratory distress (PEWS +2)")

    if temp >= 39.0:
        flags.append(f"High pediatric pyrexia {temp}°C (Febrile seizure risk)")

    return pews_score, flags


def calculate_mews_qsofa(vitals: Dict[str, Any], symptoms_text: str) -> Tuple[int, int, List[str]]:
    """
    Calculate Adult MEWS (Modified Early Warning Score) & qSOFA (quick Sepsis-related Organ Failure Assessment).
    Returns (mews_score, qsofa_score, flags).
    """
    mews = 0
    qsofa = 0
    flags = []
    
    hr = vitals.get("hr", 75)
    sbp = vitals.get("bp_sys", 120)
    rr = vitals.get("rr", 16)
    temp = vitals.get("temp_c", 37.0)
    spo2 = vitals.get("spo2", 98)
    text_lower = symptoms_text.lower()
    
    # 1. Heart Rate
    if hr >= 130 or hr <= 40:
        mews += 3
        flags.append(f"Critical adult HR {hr} bpm (MEWS +3)")
    elif hr >= 111 or hr <= 50:
        mews += 2
        flags.append(f"Severe adult tachycardia/bradycardia HR {hr} bpm (MEWS +2)")
    elif hr >= 101:
        mews += 1
        flags.append(f"Mild adult tachycardia HR {hr} bpm (MEWS +1)")

    # 2. Systolic Blood Pressure (qSOFA criteria: SBP <= 100)
    if sbp <= 70:
        mews += 3
        qsofa += 1
        flags.append(f"Severe hypotension SBP {sbp} mmHg (MEWS +3, qSOFA +1)")
    elif sbp <= 80:
        mews += 2
        qsofa += 1
        flags.append(f"Moderate hypotension SBP {sbp} mmHg (MEWS +2, qSOFA +1)")
    elif sbp <= 100:
        mews += 1
        qsofa += 1
        flags.append(f"Borderline hypotension SBP {sbp} mmHg (MEWS +1, qSOFA +1)")
    elif sbp >= 200:
        mews += 2
        flags.append(f"Severe hypertensive urgency SBP {sbp} mmHg (MEWS +2)")

    # 3. Respiratory Rate (qSOFA criteria: RR >= 22)
    if rr >= 30 or rr <= 8:
        mews += 3
        qsofa += 1
        flags.append(f"Critical adult RR {rr} (MEWS +3, qSOFA +1)")
    elif rr >= 25:
        mews += 2
        qsofa += 1
        flags.append(f"Severe adult tachypnea RR {rr} (MEWS +2, qSOFA +1)")
    elif rr >= 21:
        mews += 1
        qsofa += (1 if rr >= 22 else 0)
        flags.append(f"Moderate adult tachypnea RR {rr} (MEWS +1)")

    # 4. Temperature
    if temp >= 38.5 or temp <= 35.0:
        mews += 2
        flags.append(f"Severe temperature derangement {temp}°C (MEWS +2)")
    elif temp >= 38.0 or temp <= 35.5:
        mews += 1
        flags.append(f"Fever/Hypothermia {temp}°C (MEWS +1)")

    # 5. Altered Mental Status (qSOFA criteria: GCS < 15 or altered mentation)
    if any(k in text_lower for k in ["unresponsive", "stupor", "coma", "unconscious", "gcs"]):
        mews += 3
        qsofa += 1
        flags.append("Critical adult altered mental status (MEWS +3, qSOFA +1)")
    elif any(k in text_lower for k in ["confused", "somnolent", "disoriented", "delirium", "slurred"]):
        mews += 2
        qsofa += 1
        flags.append("Adult acute confusion / altered mentation (MEWS +2, qSOFA +1)")

    # 6. SpO2 Oxygenation
    if spo2 <= 90:
        flags.append(f"Severe adult hypoxia SpO2 {spo2}%")
    elif spo2 <= 93:
        flags.append(f"Moderate adult hypoxia SpO2 {spo2}%")

    return mews, qsofa, flags


def evaluate_geriatric_risk(
    vitals: Dict[str, Any], 
    symptoms_text: str, 
    chronic_conditions: List[str],
    current_medications: List[str]
) -> Tuple[int, List[str]]:
    """
    Evaluates Geriatric Atypical Presentation Heuristics.
    Detects blunted fever in sepsis, silent MI in diabetics, fall on anticoagulation, and delirium.
    Returns (risk_score, flags).
    """
    risk_score = 0
    flags = []
    
    text_lower = symptoms_text.lower()
    conditions_lower = " ".join(chronic_conditions).lower()
    meds_lower = " ".join(current_medications).lower()
    
    temp = vitals.get("temp_c", 37.0)
    hr = vitals.get("hr", 75)
    sbp = vitals.get("bp_sys", 120)
    
    # 1. Anticoagulation + Head Trauma / Fall
    is_anticoagulated = any(k in meds_lower for k in ["warfarin", "apixaban", "eliquis", "rivaroxaban", "xarelto", "dabigatran", "heparin", "clopidogrel", "blood thinner"])
    has_fall_or_head = any(k in text_lower for k in ["fall", "hit head", "forehead", "hematoma", "headache", "slip", "gait", "unsteady"])
    if is_anticoagulated and has_fall_or_head:
        risk_score += 3
        flags.append("🚨 Geriatric alert: Head trauma on active anticoagulation (High risk of occult intracranial hemorrhage)")

    # 2. Silent / Atypical Cardiac Presentation (Epigastric + Diaphoresis + Diabetic)
    is_diabetic = any(k in conditions_lower for k in ["diabetes", "dm2", "diabetic", "metformin", "insulin"])
    has_atypical_cardiac = any(k in text_lower for k in ["epigastric", "indigestion", "sweating", "diaphoresis", "exhausted", "fatigue", "nausea", "clammy"])
    if is_diabetic and has_atypical_cardiac:
        risk_score += 3
        flags.append("🚨 Geriatric alert: Atypical silent acute coronary syndrome presentation in diabetic patient")

    # 3. Normothermic / Hypothermic Sepsis (Blunted febrile response)
    has_infection_or_delirium = any(k in text_lower for k in ["confusion", "somnolent", "urine", "shivering", "foul", "cough", "lethargic", "disoriented"])
    if temp < 37.0 and (hr > 90 or sbp < 100) and has_infection_or_delirium:
        risk_score += 2
        flags.append(f"🚨 Geriatric alert: Blunted febrile response ({temp}°C) with hemodynamic instability / confusion (Possible normothermic sepsis)")

    # 4. Acute Delirium / Cognitive Change
    if any(k in text_lower for k in ["confusion", "disoriented", "hallucination", "memory", "somnolence"]):
        risk_score += 2
        flags.append("Geriatric acute confusion/delirium (Sensitive marker of systemic deterioration)")

    return risk_score, flags


def evaluate_asymmetric_escalation(
    age: float,
    vitals: Dict[str, Any],
    symptoms: str,
    base_esi: int,
    confidence: float,
    flags: List[str]
) -> Tuple[int, bool, str, float]:
    """
    Applies asymmetric risk tuning: Under-triage is penalized far more heavily than over-triage.
    Escalates severity (+1 tier higher acuity) under uncertainty or critical warning flags.
    Returns (final_esi, was_escalated, escalation_reason, adjusted_confidence).
    """
    final_esi = base_esi
    was_escalated = False
    escalation_reason = ""
    
    # 1. Uncertainty Trigger (Confidence < 75% or ambiguous presentation)
    if confidence < 0.75 and base_esi > 2:
        final_esi = base_esi - 1 # e.g. ESI 3 -> ESI 2
        was_escalated = True
        escalation_reason = f"Safety-First Fail-Safe: High uncertainty ({int(confidence*100)}% confidence) in presenting symptoms. Escalated from ESI {base_esi} to ESI {final_esi} to prevent under-triage."
    
    # 2. Critical Pediatric Flags
    elif age < 16.0 and any("PEWS +3" in f or "Critical" in f for f in flags) and base_esi > 2:
        final_esi = 2 if base_esi > 2 else base_esi
        was_escalated = True
        escalation_reason = f"Pediatric Safety Rule: Critical PEWS/respiratory derangement in {age}yo patient. Escalated to ESI 2 for immediate pediatric monitoring."
        
    # 3. Geriatric High-Risk Alert Flags
    elif age >= 65.0 and any("🚨 Geriatric alert" in f for f in flags) and base_esi > 2:
        final_esi = 2
        was_escalated = True
        escalation_reason = f"Geriatric Safety Rule: High-risk occult presentation (atypical ischemia / anticoagulated head strike). Escalated to ESI 2 for immediate STAT diagnostics."

    # 4. Adult qSOFA Sepsis or Severe Hypoxia
    elif any("qSOFA" in f or "Severe adult hypoxia" in f for f in flags) and base_esi > 2:
        final_esi = 2
        was_escalated = True
        escalation_reason = f"Systemic Sepsis / Hypoxia Safety Rule: Borderline hemodynamics with organ risk. Escalated to ESI 2."

    return final_esi, was_escalated, escalation_reason, confidence


def determine_ed_zone(esi: int, age: float, symptoms: str) -> str:
    """Map assigned ESI and clinical presentation to ED treatment zone."""
    text_lower = symptoms.lower()
    
    if esi == 1:
        return "Resuscitation Bay / Trauma Code"
    elif esi == 2:
        if age < 16:
            return "Pediatric Acute Care"
        elif any(k in text_lower for k in ["chest", "stemi", "cardiac", "stroke", "paralysis"]):
            return "Cardiac / Stroke Acute Bay"
        return "Main ED Acute Care"
    elif esi == 3:
        if age < 16:
            return "Pediatric Observation Area"
        return "Main ED Urgent Observation"
    elif esi == 4:
        return "Sub-Acute / Single Resource Area"
    else: # ESI 5
        return "Fast-Track Minor Injury / Outpatient Divert"
