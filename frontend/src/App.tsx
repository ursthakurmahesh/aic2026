import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TriageIntakeStation } from './components/TriageIntakeStation';
import { TriageAssessmentCard } from './components/TriageAssessmentCard';
import { LiveQueueDashboard } from './components/LiveQueueDashboard';
import { SurgeControlPanel } from './components/SurgeControlPanel';
import { ClinicianOverrideModal } from './components/ClinicianOverrideModal';
import { AuditTrailViewer } from './components/AuditTrailViewer';
import { EDAnalyticsDashboard } from './components/EDAnalyticsDashboard';
import { FhirBundleModal } from './components/FhirBundleModal';
import { PrintableTriageSlip } from './components/PrintableTriageSlip';

import { PatientRecord, TriageAssessment, QueueItem, AuditLogEntry, ESILevel } from './types/triage';
import { MOCK_SIMULATED_PATIENTS } from './data/mockPatients';
import { runLocalTriageAssessment } from './services/localTriageEngine';
import { assessPatient, submitClinicianOverride } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'intake' | 'analytics' | 'audit'>('queue');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isSurgeActive, setIsSurgeActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Active Intake Assessment State
  const [currentPatient, setCurrentPatient] = useState<PatientRecord | null>(null);
  const [currentAssessment, setCurrentAssessment] = useState<TriageAssessment | null>(null);

  // Modals
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isFhirModalOpen, setIsFhirModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Initialize starting queue on mount
  useEffect(() => {
    const initialQueue: QueueItem[] = MOCK_SIMULATED_PATIENTS.slice(0, 5).map((p, idx) => {
      const ass = runLocalTriageAssessment(p);
      const waitMins = idx * 6;
      return {
        encounter_id: `ENC-${p.id}`,
        patient: p,
        assessment: ass,
        status: 'waiting',
        arrival_time: new Date(Date.now() - waitMins * 60000).toISOString(),
        wait_time_minutes: waitMins,
        sla_breached: ass.target_sla_minutes > 0 && waitMins > ass.target_sla_minutes,
        is_overridden: false
      };
    });
    setQueue(initialQueue);
  }, []);

  // Live Timer: increment wait times and check SLA breaches every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue((prevQueue) =>
        prevQueue.map((item) => {
          const newWait = item.wait_time_minutes + 1;
          const targetSla = item.assessment.target_sla_minutes;
          const isBreached = targetSla > 0 && newWait > targetSla;
          return {
            ...item,
            wait_time_minutes: newWait,
            sla_breached: isBreached
          };
        })
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Assessment Run
  const handleAssessPatient = async (patient: PatientRecord) => {
    setIsLoading(true);
    try {
      const res = await assessPatient(patient);
      setCurrentPatient(res.patient);
      setCurrentAssessment(res.assessment);
    } catch (e) {
      const fallback = runLocalTriageAssessment(patient);
      setCurrentPatient(patient);
      setCurrentAssessment(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  // Accept & Add to Queue
  const handleAcceptAssessment = () => {
    if (!currentPatient || !currentAssessment) return;
    const newItem: QueueItem = {
      encounter_id: `ENC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      patient: currentPatient,
      assessment: currentAssessment,
      status: 'waiting',
      arrival_time: new Date().toISOString(),
      wait_time_minutes: 0,
      sla_breached: false,
      is_overridden: false
    };

    setQueue((prev) => [newItem, ...prev]);
    setActiveTab('queue');
  };

  // Clinician Override Commit
  const handleSubmitOverride = async (overrideData: {
    clinician_id: string;
    clinician_name: string;
    clinician_role: string;
    overridden_esi: ESILevel;
    justification_reason: string;
  }) => {
    if (!currentPatient || !currentAssessment) return;

    const auditEntry = await submitClinicianOverride({
      encounter_id: `ENC-${currentPatient.mrn}`,
      patient_mrn: currentPatient.mrn,
      patient_name: currentPatient.name,
      clinician_id: overrideData.clinician_id,
      clinician_name: overrideData.clinician_name,
      clinician_role: overrideData.clinician_role,
      original_ai_esi: currentAssessment.final_esi,
      overridden_esi: overrideData.overridden_esi,
      ai_confidence: currentAssessment.confidence,
      justification_reason: overrideData.justification_reason
    });

    setAuditLogs((prev) => [auditEntry, ...prev]);

    // Update the active assessment
    const slaMap: Record<ESILevel, number> = { 1: 0, 2: 15, 3: 30, 4: 60, 5: 120 };
    const updatedAssessment: TriageAssessment = {
      ...currentAssessment,
      final_esi: overrideData.overridden_esi,
      target_sla_minutes: slaMap[overrideData.overridden_esi],
      clinical_rationale: `[CLINICIAN OVERRIDE]: ${overrideData.justification_reason}`
    };

    setCurrentAssessment(updatedAssessment);

    // Auto-add to queue with override flag
    const newItem: QueueItem = {
      encounter_id: `ENC-${currentPatient.mrn}`,
      patient: currentPatient,
      assessment: updatedAssessment,
      status: 'waiting',
      arrival_time: new Date().toISOString(),
      wait_time_minutes: 0,
      sla_breached: false,
      is_overridden: true,
      override_log: auditEntry
    };

    setQueue((prev) => [newItem, ...prev]);
    setActiveTab('queue');
  };

  // Re-assess Vitals action from queue
  const handleReassessQueueItem = (encounterId: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.encounter_id === encounterId) {
          // Simulate vitals normalization or elevation
          return {
            ...item,
            sla_breached: false,
            wait_time_minutes: Math.max(0, item.wait_time_minutes - 5)
          };
        }
        return item;
      })
    );
  };

  // Discharge / Move to Bed
  const handleDischargeQueueItem = (encounterId: string) => {
    setQueue((prev) => prev.filter((item) => item.encounter_id !== encounterId));
  };

  // Surge Mode Toggle (Simulate 3x load)
  const handleToggleSurge = () => {
    if (!isSurgeActive) {
      setIsSurgeActive(true);
      const surgeQueue: QueueItem[] = MOCK_SIMULATED_PATIENTS.map((p, idx) => {
        const ass = runLocalTriageAssessment(p);
        const waitMins = (idx * 8) % 70;
        return {
          encounter_id: `ENC-SURGE-${idx + 1}`,
          patient: p,
          assessment: ass,
          status: 'waiting',
          arrival_time: new Date(Date.now() - waitMins * 60000).toISOString(),
          wait_time_minutes: waitMins,
          sla_breached: ass.target_sla_minutes > 0 && waitMins > ass.target_sla_minutes,
          is_overridden: false
        };
      });
      setQueue(surgeQueue);
    } else {
      setIsSurgeActive(false);
      setQueue(
        MOCK_SIMULATED_PATIENTS.slice(0, 5).map((p, idx) => {
          const ass = runLocalTriageAssessment(p);
          return {
            encounter_id: `ENC-${p.id}`,
            patient: p,
            assessment: ass,
            status: 'waiting',
            arrival_time: new Date(Date.now() - idx * 5 * 60000).toISOString(),
            wait_time_minutes: idx * 5,
            sla_breached: false,
            is_overridden: false
          };
        })
      );
    }
  };

  const criticalCount = queue.filter((q) => q.assessment.final_esi <= 2).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        queueCount={queue.length}
        criticalCount={criticalCount}
        isSurgeActive={isSurgeActive}
        onToggleSurge={handleToggleSurge}
        auditCount={auditLogs.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Surge Protocol Banner */}
        <SurgeControlPanel
          isSurgeActive={isSurgeActive}
          onToggleSurge={handleToggleSurge}
          queue={queue}
        />

        {/* Tab 1: Live Queue */}
        {activeTab === 'queue' && (
          <LiveQueueDashboard
            queue={queue}
            onReassess={handleReassessQueueItem}
            onDischarge={handleDischargeQueueItem}
            onInspectPatient={(item) => {
              setCurrentPatient(item.patient);
              setCurrentAssessment(item.assessment);
              setActiveTab('intake');
            }}
          />
        )}

        {/* Tab 2: Triage Intake */}
        {activeTab === 'intake' && (
          <div className="space-y-6">
            <TriageIntakeStation onAssess={handleAssessPatient} isLoading={isLoading} />

            {currentPatient && currentAssessment && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <TriageAssessmentCard
                  patient={currentPatient}
                  assessment={currentAssessment}
                  onAccept={handleAcceptAssessment}
                  onOpenOverride={() => setIsOverrideModalOpen(true)}
                  onOpenFhir={() => setIsFhirModalOpen(true)}
                  onPrint={() => setIsPrintModalOpen(true)}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Analytics */}
        {activeTab === 'analytics' && (
          <EDAnalyticsDashboard queue={queue} logs={auditLogs} />
        )}

        {/* Tab 4: Regulatory Audit Log */}
        {activeTab === 'audit' && (
          <AuditTrailViewer logs={auditLogs} />
        )}

      </main>

      {/* Modals */}
      {currentPatient && currentAssessment && (
        <>
          <ClinicianOverrideModal
            isOpen={isOverrideModalOpen}
            onClose={() => setIsOverrideModalOpen(false)}
            patient={currentPatient}
            assessment={currentAssessment}
            onSubmitOverride={handleSubmitOverride}
          />

          <FhirBundleModal
            isOpen={isFhirModalOpen}
            onClose={() => setIsFhirModalOpen(false)}
            bundle={currentAssessment.fhir_bundle}
            patientName={currentPatient.name}
          />

          <PrintableTriageSlip
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            patient={currentPatient}
            assessment={currentAssessment}
          />
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>FHIR-Triage AI • Emergency Department Clinical Decision Support System • HL7 FHIR R4 Standardized</p>
      </footer>

    </div>
  );
};
