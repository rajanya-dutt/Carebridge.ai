import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState('');
  const [activePatient, setActivePatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Atomic Patient Switching States
  const [isSwitchingPatient, setIsSwitchingPatient] = useState(false);
  const [pendingPatientId, setPendingPatientId] = useState(null);
  const [switchError, setSwitchError] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPatients();
      if (res.success && res.patients) {
        const patientList = res.patients;
        setPatients(patientList);

        if (patientList.length === 0) {
          setActivePatientId('');
          setActivePatient(null);
          return;
        }

        // Check if current activePatientId still exists in updated list
        const exists = patientList.find((p) => p.id === activePatientId);
        if (!exists) {
          // Patient was deleted or cleaned up: pick first available patient
          setActivePatientId(patientList[0].id);
          setActivePatient(patientList[0]);
        } else {
          setActivePatient(exists);
        }
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setError(err.message || 'Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  }, [activePatientId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients, refreshTrigger]);

  // ATOMIC PATIENT SWITCHING
  const switchPatient = async (targetPatientId) => {
    if (!targetPatientId || targetPatientId === activePatientId) return;

    const targetPatientMeta = patients.find((p) => p.id === targetPatientId);
    const targetName = targetPatientMeta?.name || `Patient ${targetPatientId}`;

    try {
      setIsSwitchingPatient(true);
      setPendingPatientId(targetPatientId);
      setSwitchError(null);

      // Preload critical patient dataset in parallel before committing UI state
      const [patRes, docsRes, medsRes, timelineRes, trendsRes, emgRes] = await Promise.all([
        api.getPatient(targetPatientId),
        api.getDocuments(targetPatientId),
        api.getMedications(targetPatientId),
        api.getTimeline(targetPatientId),
        api.getTrends(targetPatientId),
        api.getEmergencyData(targetPatientId)
      ]);

      if (patRes && patRes.patient) {
        // Atomic state transition: commit all changes together
        setActivePatientId(targetPatientId);
        setActivePatient(patRes.patient);
        setSwitchError(null);
      } else if (targetPatientMeta) {
        setActivePatientId(targetPatientId);
        setActivePatient(targetPatientMeta);
        setSwitchError(null);
      }
    } catch (err) {
      console.error(`Failed to switch to patient ${targetPatientId}:`, err);
      // Keep old patient visible and show friendly recovery banner
      setSwitchError({
        targetPatientId,
        targetName,
        message: err.message || `Unable to load ${targetName}'s health story.`
      });
    } finally {
      setIsSwitchingPatient(false);
      setPendingPatientId(null);
    }
  };

  const cancelSwitch = () => {
    setSwitchError(null);
    setIsSwitchingPatient(false);
    setPendingPatientId(null);
  };

  const retrySwitch = () => {
    if (switchError?.targetPatientId) {
      const targetId = switchError.targetPatientId;
      setSwitchError(null);
      switchPatient(targetId);
    }
  };

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const loadDemo = async () => {
    try {
      setLoading(true);
      const res = await api.loadDemoPatient();
      if (res.success && res.patient_id) {
        setActivePatientId(res.patient_id);
        // Authoritatively refresh patient list from backend (existing + demo)
        const updatedRes = await api.getPatients();
        if (updatedRes.success && updatedRes.patients) {
          setPatients(updatedRes.patients);
          const demoObj = updatedRes.patients.find((p) => p.id === res.patient_id);
          if (demoObj) {
            setActivePatient(demoObj);
          }
        }
        setRefreshTrigger((prev) => prev + 1);
        return res;
      }
    } catch (err) {
      console.error('Demo loading failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async (targetPatientId) => {
    if (!targetPatientId) return;
    try {
      setLoading(true);
      const res = await api.deletePatient(targetPatientId);
      if (res.success) {
        // Fetch fresh authoritative patient list
        const updatedRes = await api.getPatients();
        const updatedList = updatedRes.patients || [];
        setPatients(updatedList);

        if (targetPatientId === activePatientId) {
          if (updatedList.length > 0) {
            setActivePatientId(updatedList[0].id);
            setActivePatient(updatedList[0]);
          } else {
            setActivePatientId('');
            setActivePatient(null);
          }
        }
        setRefreshTrigger((prev) => prev + 1);
        return res;
      }
    } catch (err) {
      console.error(`Failed to delete patient ${targetPatientId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const activateUploadedPatient = async (targetPatientId, patientObj) => {
    if (!targetPatientId) return;
    setActivePatientId(targetPatientId);
    if (patientObj) {
      setActivePatient(patientObj);
    }
    setRefreshTrigger((prev) => prev + 1);
    await fetchPatients();
  };

  return (
    <PatientContext.Provider
      value={{
        patients,
        activePatientId,
        activePatient,
        loading,
        error,
        isSwitchingPatient,
        pendingPatientId,
        switchError,
        switchPatient,
        deletePatient,
        activateUploadedPatient,
        cancelSwitch,
        retrySwitch,
        triggerRefresh,
        loadDemo,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};

export default PatientContext;
