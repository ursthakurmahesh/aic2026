import React from 'react';
import { PatientRecord, TriageAssessment } from '../types/triage';
import { Printer, X } from 'lucide-react';

interface PrintableTriageSlipProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  assessment: TriageAssessment;
}

export const PrintableTriageSlip: React.FC<PrintableTriageSlipProps> = ({
  isOpen,
  onClose,
  patient,
  assessment
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Actions (Hidden on Print) */}
        <div className="flex items-center justify-between p-4 bg-slate-100 border-b border-slate-200 print:hidden">
          <span className="text-xs font-bold text-slate-700">Print Preview — Emergency Triage Handover Slip</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold shadow transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="p-8 space-y-6 font-sans text-xs" id="printable-slip">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight uppercase">EMERGENCY DEPARTMENT INTAKE SLIP</h1>
              <p className="text-slate-600 font-semibold">City General Hospital — Level 1 Trauma Center</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Date: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right font-mono">
              <div className="border-2 border-slate-900 px-3 py-1 text-center font-bold text-sm">
                MRN: {patient.mrn}
              </div>
              <span className="text-[9px] text-slate-500 block mt-1">HL7 FHIR R4 Compliant Record</span>
            </div>
          </div>

          {/* Acuity Highlight */}
          <div className="bg-slate-100 border-2 border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Assigned Acuity</span>
              <span className="text-2xl font-black text-slate-900">
                ESI LEVEL {assessment.final_esi} — {assessment.assigned_zone}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Clinical SLA</span>
              <span className="text-lg font-bold text-slate-800">{assessment.target_sla_minutes} Minutes</span>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="font-semibold text-slate-500 block text-[10px]">PATIENT NAME</span>
              <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 block text-[10px]">AGE / GENDER</span>
              <span className="font-bold text-slate-900">{patient.age} Years ({assessment.age_category}) / {patient.gender}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 block text-[10px]">HISTORY STATUS</span>
              <span className="font-bold text-slate-900">{patient.is_zero_history ? 'Zero Prior History' : 'Returning Patient'}</span>
            </div>
          </div>

          {/* Vitals */}
          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px] block mb-2">
              Presenting Baseline Vital Signs
            </span>
            <div className="grid grid-cols-6 gap-2 text-center font-mono">
              <div className="border border-slate-300 p-2 rounded">
                <span className="text-[9px] text-slate-500 block">HR</span>
                <strong className="text-slate-900">{patient.vitals.hr} bpm</strong>
              </div>
              <div className="border border-slate-300 p-2 rounded">
                <span className="text-[9px] text-slate-500 block">BP</span>
                <strong className="text-slate-900">{patient.vitals.bp_sys}/{patient.vitals.bp_dia}</strong>
              </div>
              <div className="border border-slate-300 p-2 rounded">
                <span className="text-[9px] text-slate-500 block">RR</span>
                <strong className="text-slate-900">{patient.vitals.rr}/min</strong>
              </div>
              <div className="border border-slate-300 p-2 rounded">
                <span className="text-[9px] text-slate-500 block">SpO2</span>
                <strong className="text-slate-900">{patient.vitals.spo2}%</strong>
              </div>
              <div className="border border-slate-300 p-2 rounded">
                <span className="text-[9px] text-slate-500 block">Temp</span>
                <strong className="text-slate-900">{patient.vitals.temp_c}°C</strong>
              </div>
              <div className="border border-slate-300 p-2 rounded">
                <span className="text-[9px] text-slate-500 block">Pain</span>
                <strong className="text-slate-900">{patient.pain_score}/10</strong>
              </div>
            </div>
          </div>

          {/* Chief Complaint & Rationale */}
          <div className="space-y-2">
            <div>
              <span className="font-bold text-slate-900 text-[11px] block">Chief Complaint & HPI:</span>
              <p className="text-slate-700 mt-0.5 leading-relaxed">{patient.chief_complaint}. {patient.hpi_narrative}</p>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-[11px] block">Triage Rationale & Safety Fail-Safe:</span>
              <p className="text-slate-700 mt-0.5 leading-relaxed">{assessment.clinical_rationale}</p>
              {assessment.escalation_applied && (
                <p className="text-red-700 font-semibold mt-1">⚠️ {assessment.escalation_reason}</p>
              )}
            </div>
          </div>

          {/* Footer Sign-off */}
          <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-600">
            <div>
              <span>Triage Nurse Signature: ___________________________</span>
            </div>
            <div className="text-right">
              <span>Verified By: Jessica Miller, RN (ID: RN-8842)</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
