import React from 'react';
import { Flame, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw, Zap } from 'lucide-react';
import { QueueItem } from '../types/triage';

interface SurgeControlPanelProps {
  isSurgeActive: boolean;
  onToggleSurge: () => void;
  queue: QueueItem[];
}

export const SurgeControlPanel: React.FC<SurgeControlPanelProps> = ({
  isSurgeActive,
  onToggleSurge,
  queue
}) => {
  const criticalCount = queue.filter(q => q.assessment.final_esi <= 2).length;
  const fastTrackDiverted = queue.filter(q => q.assessment.final_esi >= 4).length;
  const urgentCount = queue.filter(q => q.assessment.final_esi === 3).length;

  if (!isSurgeActive) return null;

  return (
    <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-orange-950/60 border-2 border-red-500/50 rounded-2xl p-5 shadow-2xl animate-in fade-in duration-300 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-red-500/20">
        
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center animate-bounce">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-white text-base tracking-tight">🚨 ED 3× SURGE PROTOCOL ACTIVE</h3>
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold uppercase animate-pulse">
                Mass Intake Mode
              </span>
            </div>
            <p className="text-xs text-red-200 mt-0.5">
              Simulating 300% patient arrival volume. Dynamic Fast-Track diversion enabled to preserve resuscitation bays.
            </p>
          </div>
        </div>

        <button
          onClick={onToggleSurge}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center space-x-1.5 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset to Normal Volume</span>
        </button>

      </div>

      {/* Real-time Surge Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-sans font-semibold">Total Surge Influx</span>
          <span className="text-xl font-extrabold text-white mt-1 block">{queue.length} Patients</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-red-500/30">
          <span className="text-[10px] text-red-400 block font-sans font-semibold">Critical (ESI 1 & 2)</span>
          <span className="text-xl font-extrabold text-red-400 mt-1 block">{criticalCount} In Resus</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-yellow-500/30">
          <span className="text-[10px] text-yellow-400 block font-sans font-semibold">Urgent (ESI 3)</span>
          <span className="text-xl font-extrabold text-yellow-400 mt-1 block">{urgentCount} In Obs</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30">
          <span className="text-[10px] text-emerald-400 block font-sans font-semibold">Fast-Track Diverted</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{fastTrackDiverted} Diverted</span>
        </div>
      </div>
    </div>
  );
};
