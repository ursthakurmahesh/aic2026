import React, { useState } from 'react';
import { FileCode2, Copy, Check, X } from 'lucide-react';

interface FhirBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: any;
  patientName: string;
}

export const FhirBundleModal: React.FC<FhirBundleModalProps> = ({
  isOpen,
  onClose,
  bundle,
  patientName
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <FileCode2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">HL7 FHIR R4 Triage Bundle</h3>
              <p className="text-[11px] text-slate-400">Patient: {patientName} • Interoperable Clinical Document</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* JSON Viewer Body */}
        <div className="p-4 bg-slate-950 overflow-auto max-h-[70vh]">
          <pre className="text-[11px] font-mono text-cyan-300 leading-relaxed">
            {JSON.stringify(bundle, null, 2)}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 text-right">
          Standardized under HL7 FHIR R4 Release (LOINC / SNOMED-CT / ICD-10 Coding)
        </div>

      </div>
    </div>
  );
};
