import React, { useState } from 'react';
import { QueueItem, ESILevel } from '../types/triage';
import { 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  Search, 
  Filter, 
  CheckCircle, 
  UserCheck, 
  ArrowRight, 
  Stethoscope,
  HeartPulse
} from 'lucide-react';

interface LiveQueueDashboardProps {
  queue: QueueItem[];
  onReassess: (encounterId: string) => void;
  onDischarge: (encounterId: string) => void;
  onInspectPatient: (item: QueueItem) => void;
}

const ESI_BADGE: Record<ESILevel, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  2: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  3: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  4: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  5: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
};

export const LiveQueueDashboard: React.FC<LiveQueueDashboardProps> = ({
  queue,
  onReassess,
  onDischarge,
  onInspectPatient
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filteredQueue = queue.filter(item => {
    const matchSearch = item.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.patient.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'critical') return item.assessment.final_esi <= 2;
    if (selectedFilter === 'breached') return item.sla_breached;
    if (selectedFilter === 'overridden') return item.is_overridden;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search queue by patient name, MRN, or symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: `All (${queue.length})` },
            { id: 'critical', label: `High Acuity (${queue.filter(q => q.assessment.final_esi <= 2).length})` },
            { id: 'breached', label: `SLA Breached (${queue.filter(q => q.sla_breached).length})` },
            { id: 'overridden', label: `Overridden (${queue.filter(q => q.is_overridden).length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
                selectedFilter === f.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

      </div>

      {/* Queue List Cards */}
      <div className="space-y-3">
        {filteredQueue.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
            No patients currently match the active filter or search query.
          </div>
        ) : (
          filteredQueue.map((item, idx) => {
            const badge = ESI_BADGE[item.assessment.final_esi] || ESI_BADGE[3];
            const targetSla = item.assessment.target_sla_minutes;
            const progress = targetSla > 0 ? Math.min(100, Math.round((item.wait_time_minutes / targetSla) * 100)) : 100;
            const isBreached = item.sla_breached;

            return (
              <div
                key={item.encounter_id}
                className={`bg-slate-900 border rounded-2xl p-4 transition-all hover:border-slate-700 shadow-md ${
                  isBreached
                    ? 'border-red-500/60 bg-red-950/10'
                    : item.assessment.final_esi === 1
                    ? 'border-red-500/80 bg-slate-900 animate-pulse-fast'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Acuity Badge + Demographic */}
                  <div className="flex items-start space-x-3.5">
                    
                    {/* ESI Box */}
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-extrabold border flex-shrink-0 ${badge.bg} ${badge.border}`}>
                      <span className="text-[9px] uppercase tracking-widest leading-none text-slate-400">ESI</span>
                      <span className={`text-2xl leading-none mt-0.5 ${badge.text}`}>
                        {item.assessment.final_esi}
                      </span>
                    </div>

                    {/* Patient Summary */}
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-white text-sm hover:underline cursor-pointer" onClick={() => onInspectPatient(item)}>
                          {item.patient.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">({item.patient.mrn})</span>
                        
                        {item.patient.is_zero_history && (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Zero History
                          </span>
                        )}

                        {item.is_overridden && (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Clinician Overridden
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                        <span className="font-semibold text-slate-400">Complaint:</span> {item.patient.chief_complaint}
                      </p>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1 font-mono">
                        <span>HR: <strong className="text-slate-200">{item.patient.vitals.hr}</strong></span>
                        <span>BP: <strong className="text-slate-200">{item.patient.vitals.bp_sys}/{item.patient.vitals.bp_dia}</strong></span>
                        <span>SpO2: <strong className="text-slate-200">{item.patient.vitals.spo2}%</strong></span>
                        <span>Zone: <strong className="text-cyan-400">{item.assessment.assigned_zone}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: SLA & Deterioration Progress */}
                  <div className="min-w-[220px] bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" /> Wait: {item.wait_time_minutes}m / SLA: {targetSla}m
                      </span>
                      <span className={isBreached ? 'text-red-400 font-bold' : 'text-slate-300'}>
                        {isBreached ? 'EXCEEDED' : `${targetSla - item.wait_time_minutes}m left`}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isBreached ? 'bg-red-500' : progress >= 75 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {isBreached && (
                      <p className="text-[10px] text-red-400 font-bold mt-1 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3 h-3" /> SLA Breached: Re-Assessment Required
                      </p>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => onReassess(item.encounter_id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center space-x-1"
                    >
                      <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                      <span>Re-check</span>
                    </button>

                    <button
                      onClick={() => onDischarge(item.encounter_id)}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-all flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Admit / Bed</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
