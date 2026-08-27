import React, { useState } from 'react';
import { AuditLogEntry } from '../types/triage';
import { ShieldCheck, FileText, Download, UserCheck, Clock, ExternalLink } from 'lucide-react';

interface AuditTrailViewerProps {
  logs: AuditLogEntry[];
}

export const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({ logs }) => {
  const [selectedAuditJson, setSelectedAuditJson] = useState<any | null>(null);

  const exportLogsAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ED_Triage_Audit_Trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Regulatory Compliance & Override Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            HIPAA Security Rule (45 CFR § 164.312) & GDPR Article 22 Immutable Clinical Decision Logs
          </p>
        </div>

        <button
          onClick={exportLogsAsJson}
          disabled={logs.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Log Table */}
      {logs.length === 0 ? (
        <div className="bg-slate-950 p-12 text-center text-slate-400 text-xs rounded-xl border border-slate-800">
          No clinician overrides logged in this session yet. Perform an override on any patient to generate an immutable FHIR AuditEvent.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Clinician Sign-off</th>
                <th className="py-3 px-4">Patient MRN</th>
                <th className="py-3 px-4 text-center">AI ESI ➔ Override</th>
                <th className="py-3 px-4">Clinical Justification Rationale</th>
                <th className="py-3 px-4 text-right">FHIR AuditEvent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-sans">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-all">
                  
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>

                  {/* Clinician */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-white block">{log.clinician_name}</span>
                    <span className="text-[10px] text-slate-400">{log.clinician_role} (ID: {log.clinician_id})</span>
                  </td>

                  {/* Patient */}
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-200 block">{log.patient_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.patient_mrn}</span>
                  </td>

                  {/* Acuity Shift */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center space-x-1 font-mono text-xs font-bold">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        ESI {log.original_ai_esi}
                      </span>
                      <span className="text-slate-500">➔</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                        ESI {log.overridden_esi}
                      </span>
                    </div>
                  </td>

                  {/* Justification */}
                  <td className="py-3.5 px-4 max-w-xs text-slate-300 leading-relaxed">
                    {log.justification_reason}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedAuditJson(log.fhir_audit_event)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[11px] font-mono border border-slate-700 inline-flex items-center space-x-1"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* JSON Modal */}
      {selectedAuditJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">HL7 FHIR AuditEvent Resource (JSON)</h3>
              <button onClick={() => setSelectedAuditJson(null)} className="text-slate-400 hover:text-white text-xs font-bold">
                ✕ Close
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl text-[11px] text-cyan-300 font-mono overflow-auto max-h-96 border border-slate-800">
              {JSON.stringify(selectedAuditJson, null, 2)}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
};
