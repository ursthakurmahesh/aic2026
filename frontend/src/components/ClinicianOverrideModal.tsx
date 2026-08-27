import React, { useState } from 'react';
import { ESILevel, PatientRecord, TriageAssessment } from '../types/triage';
import { ShieldAlert, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ClinicianOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  assessment: TriageAssessment;
  onSubmitOverride: (data: {
    clinician_id: string;
    clinician_name: string;
    clinician_role: string;
    overridden_esi: ESILevel;
    justification_reason: string;
  }) => void;
}

export const ClinicianOverrideModal: React.FC<ClinicianOverrideModalProps> = ({
  isOpen,
  onClose,
  patient,
  assessment,
  onSubmitOverride
}) => {
  if (!isOpen) return null;

  const [overriddenEsi, setOverriddenEsi] = useState<ESILevel>(
    assessment.final_esi === 2 ? 1 : (assessment.final_esi === 3 ? 2 : 3)
  );
  const [clinicianName, setClinicianName] = useState<string>('Jessica Miller, RN');
  const [clinicianRole, setClinicianRole] = useState<string>('Senior Triage Nurse');
  const [clinicianId, setClinicianId] = useState<string>('RN-8842');
  const [justificationReason, setJustificationReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificationReason || justificationReason.trim().length < 8) {
      setError('Regulatory Compliance Notice: A clear clinical rationale of at least 8 characters is legally required for an override.');
      return;
    }

    onSubmitOverride({
      clinician_id: clinicianId,
      clinician_name: clinicianName,
      clinician_role: clinicianRole,
      overridden_esi: overriddenEsi,
      justification_reason: justificationReason
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Clinician Triage Override</h3>
              <p className="text-[11px] text-slate-400">HIPAA / GDPR / ABDM Immutable Audit Event</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Patient Context & Comparison */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-300 block">{patient.name} (MRN: {patient.mrn})</span>
              <span className="text-[11px] text-slate-400">AI Suggested: Level {assessment.final_esi} ({Math.round(assessment.confidence * 100)}% conf)</span>
            </div>
            <div className="flex items-center space-x-2 font-mono">
              <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 font-bold">ESI {assessment.final_esi}</span>
              <span className="text-slate-500">➔</span>
              <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg font-bold">
                ESI {overriddenEsi}
              </span>
            </div>
          </div>

          {/* New ESI Selection */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Select Overridden ESI Level</label>
            <div className="grid grid-cols-5 gap-1.5 font-bold text-center">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setOverriddenEsi(lvl as ESILevel)}
                  className={`py-2 rounded-xl border transition-all ${
                    overriddenEsi === lvl
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Level {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Clinician Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Clinician Name</label>
              <input
                type="text"
                value={clinicianName}
                onChange={(e) => setClinicianName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Role / License ID</label>
              <input
                type="text"
                value={clinicianRole}
                onChange={(e) => setClinicianRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Mandatory Clinical Justification */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Mandatory Clinical Justification Rationale <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={justificationReason}
              onChange={(e) => {
                setJustificationReason(e.target.value);
                setError('');
              }}
              placeholder="State clinical rationale (e.g., 'Patient appears diaphoretic and pale with subtle orthostatic changes, clinical intuition favors acute coronary syndrome')..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 font-sans"
              required
            />
            {error && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20"
            >
              Sign & Commit Override Log
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
