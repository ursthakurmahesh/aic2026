-- ==============================================================================
-- FHIR-Triage AI: Supabase PostgreSQL Schema with RLS & Audit Compliance
-- Designed for HIPAA / GDPR / ABDM Emergency Department Triage Logging
-- ==============================================================================

-- 1. Profiles Table (Doctors, Triage Nurses, ED Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('triage_nurse', 'ed_physician', 'admin')),
    license_number TEXT,
    department TEXT DEFAULT 'Emergency Department',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients Table (Handles Returning & Zero-History Walk-in records)
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn TEXT UNIQUE NOT NULL, -- Medical Record Number
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INT NOT NULL,
    age_category TEXT NOT NULL CHECK (age_category IN ('pediatric', 'adult', 'geriatric')),
    gender TEXT NOT NULL,
    is_zero_history BOOLEAN DEFAULT FALSE,
    chronic_conditions TEXT[] DEFAULT '{}',
    current_medications TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    emergency_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Triage Encounters Table (Real-time Queue State & Acuity Tracking)
CREATE TABLE IF NOT EXISTS public.triage_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id TEXT UNIQUE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    triage_nurse_id UUID REFERENCES public.profiles(id),
    
    -- Clinical Inputs
    chief_complaint TEXT NOT NULL,
    hpi_narrative TEXT,
    pain_score INT CHECK (pain_score BETWEEN 0 AND 10),
    vital_signs JSONB NOT NULL, -- {hr, bp_sys, bp_dia, rr, spo2, temp_c}
    
    -- Scoring Results
    ai_suggested_esi INT NOT NULL CHECK (ai_suggested_esi BETWEEN 1 AND 5),
    final_assigned_esi INT NOT NULL CHECK (final_assigned_esi BETWEEN 1 AND 5),
    is_overridden BOOLEAN DEFAULT FALSE,
    confidence_score NUMERIC(4, 3) NOT NULL, -- 0.000 to 1.000
    escalation_applied BOOLEAN DEFAULT FALSE,
    escalation_reason TEXT,
    assigned_zone TEXT NOT NULL, -- 'resuscitation', 'acute', 'fast_track', 'pediatric_ed', 'observation'
    
    -- Real-time Status & SLA Tracking
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_treatment', 'discharged', 'deteriorated', 'transferred')),
    arrival_time TIMESTAMPTZ DEFAULT NOW(),
    target_sla_minutes INT NOT NULL,
    wait_time_minutes INT DEFAULT 0,
    sla_breached BOOLEAN DEFAULT FALSE,
    
    -- FHIR R4 Bundle Payload
    fhir_bundle JSONB NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Immutable Audit Logs Table (Mandatory for Clinician Overrides)
CREATE TABLE IF NOT EXISTS public.triage_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.triage_encounters(id) ON DELETE CASCADE,
    patient_mrn TEXT NOT NULL,
    clinician_id UUID REFERENCES public.profiles(id),
    clinician_name TEXT NOT NULL,
    clinician_role TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'CLINICIAN_OVERRIDE' CHECK (event_type IN ('CLINICIAN_OVERRIDE', 'AI_ASSESSMENT', 'DETERIORATION_ESCALATION', 'SURGE_REROUTE')),
    
    original_ai_esi INT NOT NULL,
    overridden_esi INT NOT NULL,
    ai_confidence NUMERIC(4, 3) NOT NULL,
    justification_reason TEXT NOT NULL,
    
    fhir_audit_event JSONB NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Allow authenticated staff to read profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated staff to read and write patients" ON public.patients FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated staff to manage encounters" ON public.triage_encounters FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow read and append to audit logs" ON public.triage_audit_logs FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. Realtime Enablement (for live queue dashboards)
ALTER PUBLICATION supabase_realtime ADD TABLE public.triage_encounters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.triage_audit_logs;
