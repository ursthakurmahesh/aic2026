import React, { useState } from 'react';
import { PatientRecord, TriageAssessment } from '../types/triage';
import { MOCK_SIMULATED_PATIENTS } from '../data/mockPatients';
import { Sparkles, Mic, MicOff, UserCheck, AlertTriangle, RefreshCw, Stethoscope, HeartPulse } from 'lucide-react';

interface TriageIntakeStationProps {
  onAssess: (patient: PatientRecord) => void;
  isLoading: boolean;
}

export const TriageIntakeStation: React.FC<TriageIntakeStationProps> = ({ onAssess, isLoading }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('SIM-001');
  const [patient, setPatient] = useState<PatientRecord>(MOCK_SIMULATED_PATIENTS[0]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceText, setVoiceText] = useState<string>('');

  const handleSelectSimulatedPatient = (id: string) => {
    setSelectedCaseId(id);
    const found = MOCK_SIMULATED_PATIENTS.find(p => p.id === id);
    if (found) {
      setPatient({ ...found });
      setVoiceText('');
    }
  };

  const handleVitalChange = (field: keyof typeof patient.vitals, val: string) => {
    setPatient(prev => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: Number(val) || 0
      }
    }));
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setVoiceText('Transcribing audio intake: "Patient states severe lethargy and high fever since yesterday. Breathing fast..."');
    } else {
      setIsRecording(false);
      if (voiceText) {
        setPatient(prev => ({
          ...prev,
          hpi_narrative: (prev.hpi_narrative ? prev.hpi_narrative + ' ' : '') + voiceText
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssess(patient);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 mb-6 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            <span>Emergency Triage Intake Station</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture vital signs, voice intake, and history to run real-time hybrid triage assessment.
          </p>
        </div>

        {/* 1-Click Simulated Patient Selector */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold px-2">Load Preset Case:</span>
          <select
            value={selectedCaseId}
            onChange={(e) => handleSelectSimulatedPatient(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            {MOCK_SIMULATED_PATIENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.age}y) — {p.case_type || p.chief_complaint.slice(0, 30)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Row 1: Patient Demographics & Zero-History Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Patient Name</label>
            <input
              type="text"
              value={patient.name}
              onChange={(e) => setPatient({ ...patient, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Age (Years)</label>
            <input
              type="number"
              step="0.1"
              value={patient.age}
              onChange={(e) => setPatient({ ...patient, age: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Gender</label>
            <select
              value={patient.gender}
              onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Patient History Status</label>
            <button
              type="button"
              onClick={() => setPatient({ ...patient, is_zero_history: !patient.is_zero_history })}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                patient.is_zero_history
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {patient.is_zero_history ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Zero-History Walk-in</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Returning (EHR on File)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Vitals Banner */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Intake Vital Signs (LOINC Standard)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Heart Rate (bpm)</span>
              <input
                type="number"
                value={patient.vitals.hr}
                onChange={(e) => handleVitalChange('hr', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-center font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Systolic BP (mmHg)</span>
              <input
                type="number"
                value={patient.vitals.bp_sys}
                onChange={(e) => handleVitalChange('bp_sys', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-center font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Diastolic BP (mmHg)</span>
              <input
                type="number"
                value={patient.vitals.bp_dia}
                onChange={(e) => handleVitalChange('bp_dia', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-center font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Resp Rate (/min)</span>
              <input
                type="number"
                value={patient.vitals.rr}
                onChange={(e) => handleVitalChange('rr', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-center font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">SpO2 (%)</span>
              <input
                type="number"
                value={patient.vitals.spo2}
                onChange={(e) => handleVitalChange('spo2', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-center font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Temp (°C)</span>
              <input
                type="number"
                step="0.1"
                value={patient.vitals.temp_c}
                onChange={(e) => handleVitalChange('temp_c', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-center font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Chief Complaint & Pain Rating */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Chief Complaint</label>
            <input
              type="text"
              value={patient.chief_complaint}
              onChange={(e) => setPatient({ ...patient, chief_complaint: e.target.value })}
              placeholder="e.g., High fever, chest discomfort, shortness of breath"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Pain Rating (0 - 10)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="10"
                value={patient.pain_score}
                onChange={(e) => setPatient({ ...patient, pain_score: parseInt(e.target.value) || 0 })}
                className="w-full accent-red-500"
              />
              <span className="font-mono text-sm font-bold text-red-400 w-8 text-center">{patient.pain_score}</span>
            </div>
          </div>
        </div>

        {/* Row 4: HPI Narrative & Voice Intake Simulator */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-400">History of Present Illness (HPI Narrative)</label>
            <button
              type="button"
              onClick={toggleRecording}
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isRecording ? 'Stop Recording' : 'Simulate Voice Intake'}</span>
            </button>
          </div>
          <textarea
            rows={2}
            value={patient.hpi_narrative}
            onChange={(e) => setPatient({ ...patient, hpi_narrative: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
            placeholder="Clinical details, symptom duration, observed distress, and prior medications..."
          />
        </div>

        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Hybrid AI & Age-Rules Engine...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Evaluate Patient Triage</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
