import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, Fact, UploadStatus, ProcessingState } from '../types';

interface AppContextType {
  // Patient state
  patients: Patient[];
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  refreshPatients: () => void;
  
  // Facts state
  facts: Fact[];
  loading: boolean;
  
  // Upload state
  uploadStatus: UploadStatus;
  setUploadStatus: (status: UploadStatus) => void;
  
  // Processing state
  processingState: ProcessingState;
  setProcessingState: (state: ProcessingState) => void;
  
  // Search state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    transcriptReady: false,
    noteReady: false,
  });
  
  const [processingState, setProcessingState] = useState<ProcessingState>({
    transcript: '',
    downloadUrls: {},
  });

  const refreshPatients = () => {
    loadPatients();
  };

  // Load patients on mount
  useEffect(() => {
    loadPatients();
  }, []);

  // Load facts when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      loadFacts(selectedPatient.id);
      subscribeToFacts(selectedPatient.id);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients_min')
        .select('patient_id, full_name, date_of_birth, sex_at_birth, blood_group, created_at, updated_at')
        .order('full_name');
      
      if (error) throw error;
      
      // Transform the data to match our Patient interface
      const transformedData = (data || []).map(patient => ({
        id: patient.patient_id,
        full_name: patient.full_name || 'Unknown',
        date_of_birth: patient.date_of_birth,
        sex_at_birth: patient.sex_at_birth,
        blood_group: patient.blood_group,
        created_at: patient.created_at,
        updated_at: patient.updated_at,
      }));
      
      setPatients(transformedData);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadFacts = async (patientId: string) => {
    setLoading(true);
    try {
      // Get appointments for this patient first
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_id')
        .eq('patient_id', patientId);
      
      if (appointmentsError) throw appointmentsError;
      
      if (!appointments || appointments.length === 0) {
        setFacts([]);
        return;
      }
      
      const appointmentIds = appointments.map(apt => apt.appointment_id);
      
      // Get facts for these appointments
      const { data, error } = await supabase
        .from('appointment_facts')
        .select('*')
        .in('appointment_id', appointmentIds)
        .order('inserted_at', { ascending: false });
      
      if (error) throw error;
      setFacts(data || []);
    } catch (error) {
      console.error('Error loading facts:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToFacts = (patientId: string) => {
    // First get appointment IDs for this patient
    const getAppointmentIds = async () => {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_id')
        .eq('patient_id', patientId);
      
      return appointments?.map(apt => apt.appointment_id) || [];
    };

    getAppointmentIds().then(appointmentIds => {
      if (appointmentIds.length === 0) return;

      const subscription = supabase
        .channel('appointment_facts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointment_facts',
            filter: `appointment_id=in.(${appointmentIds.join(',')})`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setFacts(prev => [payload.new as Fact, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setFacts(prev => prev.map(fact => 
                fact.fact_id === payload.new.fact_id ? payload.new as Fact : fact
              ));
            } else if (payload.eventType === 'DELETE') {
              setFacts(prev => prev.filter(fact => fact.fact_id !== payload.old.fact_id));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    });
  };

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppContext.Provider
      value={{
        patients: filteredPatients,
        selectedPatient,
        setSelectedPatient,
        refreshPatients,
        facts,
        loading,
        uploadStatus,
        setUploadStatus,
        processingState,
        setProcessingState,
        searchTerm,
        setSearchTerm,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};