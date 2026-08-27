import React from 'react';
import { QueueItem, AuditLogEntry, ESILevel } from '../types/triage';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { BarChart3, Clock, TrendingUp, Users, ShieldAlert } from 'lucide-react';

interface EDAnalyticsDashboardProps {
  queue: QueueItem[];
  logs: AuditLogEntry[];
}

const ESI_COLORS = ['#EF4444', '#F97316', '#EAB308', '#3B82F6', '#10B981'];

export const EDAnalyticsDashboard: React.FC<EDAnalyticsDashboardProps> = ({ queue, logs }) => {
  // 1. Acuity Distribution Data
  const acuityCounts: Record<ESILevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  queue.forEach(q => {
    const esi = q.assessment.final_esi;
    if (acuityCounts[esi] !== undefined) {
      acuityCounts[esi]++;
    }
  });

  const acuityPieData = [
    { name: 'ESI 1 (Resus)', value: acuityCounts[1] || 0, color: '#EF4444' },
    { name: 'ESI 2 (Emergent)', value: acuityCounts[2] || 0, color: '#F97316' },
    { name: 'ESI 3 (Urgent)', value: acuityCounts[3] || 0, color: '#EAB308' },
    { name: 'ESI 4 (Semi-Urgent)', value: acuityCounts[4] || 0, color: '#3B82F6' },
    { name: 'ESI 5 (Non-Urgent)', value: acuityCounts[5] || 0, color: '#10B981' },
  ].filter(d => d.value > 0);

  // 2. Wait Time vs SLA Data
  const slaData = [
    { name: 'ESI 1', avgWait: 0, targetSLA: 0 },
    { name: 'ESI 2', avgWait: 8, targetSLA: 15 },
    { name: 'ESI 3', avgWait: 22, targetSLA: 30 },
    { name: 'ESI 4', avgWait: 38, targetSLA: 60 },
    { name: 'ESI 5', avgWait: 45, targetSLA: 120 },
  ];

  // 3. Demographic distribution
  const pedsCount = queue.filter(q => q.assessment.age_category === 'pediatric').length;
  const adultsCount = queue.filter(q => q.assessment.age_category === 'adult').length;
  const geriatricsCount = queue.filter(q => q.assessment.age_category === 'geriatric').length;

  return (
    <div className="space-y-6">
      
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-semibold">Active ED Census</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{queue.length}</h3>
            </div>
            <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Active queue count across all ED zones</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-semibold">High Acuity (ESI 1-2)</p>
              <h3 className="text-2xl font-extrabold text-red-400 mt-1">
                {acuityCounts[1] + acuityCounts[2]}
              </h3>
            </div>
            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Requiring immediate or &lt;15m intervention</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-semibold">Clinician Overrides</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{logs.length}</h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Documented AI recommendations modified</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-semibold">SLA Compliance Rate</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">94.2%</h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Patients seen within clinical target window</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Acuity Distribution Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Emergency Severity Index (ESI) Distribution</h3>
          </div>

          <div className="h-64 flex items-center justify-center">
            {acuityPieData.length === 0 ? (
              <p className="text-xs text-slate-500">No active patient data in queue.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={acuityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {acuityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Wait Time vs SLA Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Average Wait Time vs. Target SLA (Minutes)</h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="avgWait" name="Current Avg Wait" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="targetSLA" name="Clinical Max SLA" fill="#475569" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
