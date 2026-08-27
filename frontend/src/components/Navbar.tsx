import React from 'react';
import { Activity, ShieldAlert, Users, Flame, Clock, Stethoscope, BarChart3, FileText, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'queue' | 'intake' | 'analytics' | 'audit';
  setActiveTab: (tab: 'queue' | 'intake' | 'analytics' | 'audit') => void;
  queueCount: number;
  criticalCount: number;
  isSurgeActive: boolean;
  onToggleSurge: () => void;
  auditCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  queueCount,
  criticalCount,
  isSurgeActive,
  onToggleSurge,
  auditCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 p-0.5 shadow-lg shadow-red-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-500 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">FHIR-Triage AI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  ED Assistant v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Emergency Department Clinical Intelligence</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'queue'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Live Queue</span>
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[11px] font-bold">
                {queueCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('intake')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'intake'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span>Triage Intake</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>ED Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Audit Log</span>
              {auditCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                  {auditCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action: Surge Button & Critical Counter */}
          <div className="flex items-center space-x-3">
            {criticalCount > 0 && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{criticalCount} Critical</span>
              </div>
            )}

            <button
              onClick={onToggleSurge}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                isSurgeActive
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30 animate-pulse border border-red-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${isSurgeActive ? 'text-amber-300' : 'text-orange-400'}`} />
              <span>{isSurgeActive ? '🚨 Surge Active (3×)' : 'Simulate Surge'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
