import React from 'react';
import { PatientRecord, TriageAssessment, ESILevel } from '../types/triage';
import { 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  FileCode2, 
  Printer, 
  UserX, 
  ArrowUpRight, 
  Clock, 
  Activity,
  Layers
} from 'lucide-react';

interface TriageAssessmentCardProps {
  patient: PatientRecord;
  assessment: TriageAssessment;
  onAccept: () => void;
  onOpenOverride: () => void;
  onOpenFhir: () => void;
  onPrint: () => void;
}

const ESI_CONFIG: Record<ESILevel, { name: string; color: string; badgeBg: string; border: string }> = {
  1: { name: 'Resuscitation (Immediate)', color: 'text-red-400', badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40', border: 'border-red-500' },
  2: { name: 'Emergent (< 15 mins)', color: 'text-orange-400', badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40', border: 'border-orange-500' },
  3: { name: 'Urgent (< 30 mins)', color: 'text-yellow-400', badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', border: 'border-yellow-500' },
  4: { name: 'Semi-Urgent (< 60 mins)', color: 'text-blue-400', badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40', border: 'border-blue-500' },
  5: { name: 'Non-Urgent (< 120 mins)', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', border: 'border-emerald-500' },
};

export const TriageAssessmentCard: React.FC<TriageAssessmentCardProps> = ({
  patient,
  assessment,
  onAccept,
  onOpenOverride,
  onOpenFhir,
  onPrint
}) => {
  const esiInfo = ESI_CONFIG[assessment.final_esi] || ESI_CONFIG[3];
  const confPct = Math.round(assessment.confidence * 100);

  return (
    <div className={`bg-slate-900 border-2 ${esiInfo.border} rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden`}>
      
      {/* Top Banner: ESI Level & Confidence */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-extrabold text-2xl border ${esiInfo.badgeBg}`}>
            <span className="text-[10px] uppercase font-bold tracking-widest leading-none">ESI</span>
            <span className="text-3xl leading-none mt-0.5">{assessment.final_esi}</span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-lg font-extrabold tracking-tight ${esiInfo.color}`}>
                Level {assessment.final_esi} — {esiInfo.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2 mt-1">
              <span className="font-semibold text-slate-300">{patient.name}</span>
              <span>•</span>
              <span>Age: {patient.age}y ({assessment.age_category})</span>
              <span>•</span>
              <span className="text-cyan-400 font-medium">Zone: {assessment.assigned_zone}</span>
            </p>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 min-w-[200px]">
          <div className="flex justify-between text-xs mb-1 font-semibold">
            <span className="text-slate-400">Model Confidence:</span>
            <span className={confPct >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{confPct}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all rounded-full ${
                confPct >= 80 ? 'bg-emerald-500' : confPct >= 65 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${confPct}%` }}
            />
          </div>
          {confPct < 75 && (
            <p className="text-[10px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> High Clinical Uncertainty
            </p>
          )}
        </div>
      </div>

      {/* Safety-First Escalation Banner */}
      {assessment.escalation_applied && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3.5 flex items-start space-x-3 text-red-200">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-red-300 uppercase tracking-wide block mb-0.5">
              ⚠️ Safety-First Fail-Safe Escalation Applied
            </span>
            <p className="text-slate-300">{assessment.escalation_reason}</p>
          </div>
        </div>
      )}

      {/* Rationale & Scoring Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <span className="font-bold text-slate-300 uppercase tracking-wider block text-[11px]">
            Clinical Reasoning & Justification
          </span>
          <p className="text-slate-300 leading-relaxed">{assessment.clinical_rationale}</p>
          
          {assessment.immediate_actions && assessment.immediate_actions.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="font-semibold text-cyan-400 block mb-1">Recommended Immediate Action:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {assessment.immediate_actions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <span className="font-bold text-slate-300 uppercase tracking-wider block text-[11px]">
            Age-Stratified Risk Markers & Scores
          </span>

          <div className="grid grid-cols-2 gap-2 font-mono">
            {assessment.age_category === 'pediatric' ? (
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">PEWS Score</span>
                <span className="text-sm font-bold text-cyan-400">{assessment.scores.pews ?? 0} / 9</span>
              </div>
            ) : (
              <>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">MEWS Score</span>
                  <span className="text-sm font-bold text-cyan-400">{assessment.scores.mews ?? 0}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">qSOFA Sepsis</span>
                  <span className={`text-sm font-bold ${(assessment.scores.qsofa ?? 0) >= 2 ? 'text-red-400' : 'text-slate-200'}`}>
                    {assessment.scores.qsofa ?? 0} / 3
                  </span>
                </div>
              </>
            )}
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Target SLA</span>
              <span className="text-sm font-bold text-amber-400">{assessment.target_sla_minutes} mins</span>
            </div>
          </div>

          {assessment.key_risk_factors && assessment.key_risk_factors.length > 0 && (
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Detected Risk Flags:</span>
              <div className="flex flex-wrap gap-1.5">
                {assessment.key_risk_factors.slice(0, 4).map((f, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded text-[10px]">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenFhir}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>FHIR R4 Bundle</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-purple-400" />
            <span>Print Slip</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenOverride}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <UserX className="w-4 h-4" />
            <span>Clinician Override</span>
          </button>

          <button
            onClick={onAccept}
            className="flex items-center space-x-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Accept & Enter Live Queue</span>
          </button>
        </div>
      </div>

    </div>
  );
};
