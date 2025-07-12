import React, { useState, useEffect } from 'react';
import { User, Calendar, Heart, Droplet, FileText, Clock, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Appointment, AppointmentInsight } from '../types';
import { exportPatientReportToPDF } from '../utils/pdfExport';

const PatientReport: React.FC = () => {
  const { selectedPatient, facts } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [insights, setInsights] = useState<AppointmentInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    demographics: true,
    appointments: true,
    insights: false,
    facts: true,
  });

  useEffect(() => {
    if (selectedPatient) {
      loadPatientData();
    }
  }, [selectedPatient]);

  const loadPatientData = async () => {
    if (!selectedPatient) return;
    
    setLoading(true);
    try {
      // Load appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', selectedPatient.id)
        .order('appointment_datetime', { ascending: false });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);

      // Load insights for appointments
      if (appointmentsData && appointmentsData.length > 0) {
        const appointmentIds = appointmentsData.map(apt => apt.appointment_id);
        const { data: insightsData, error: insightsError } = await supabase
          .from('appointment_insights')
          .select('*')
          .in('appointment_id', appointmentIds)
          .order('inserted_at', { ascending: false });

        if (insightsError) throw insightsError;
        setInsights(insightsData || []);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return `${age} years`;
  };

  const getBloodGroupIcon = () => <Droplet className="w-4 h-4 text-red-500" />;
  const getSexIcon = () => <User className="w-4 h-4 text-blue-500" />;

  const handleExportPDF = async () => {
    if (!selectedPatient) return;
    
    setIsExporting(true);
    try {
      await exportPatientReportToPDF(selectedPatient, appointments, insights, facts);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!selectedPatient) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a patient to view comprehensive report</p>
        </div>
      </div>
    );
  }

  const SectionHeader = ({ 
    title, 
    icon, 
    sectionKey, 
    count 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    sectionKey: keyof typeof expandedSections;
    count?: number;
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-150 rounded-lg mb-4"
    >
      <div className="flex items-center space-x-3">
        {icon}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {count !== undefined && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {expandedSections[sectionKey] ? (
        <ChevronUp className="w-5 h-5 text-gray-500" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-500" />
      )}
    </button>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Patient Report</h2>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive overview for {selectedPatient.full_name}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {loading && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Demographics Section */}
        <div>
          <SectionHeader
            title="Demographics"
            icon={<User className="w-5 h-5 text-blue-600" />}
            sectionKey="demographics"
          />
          
          {expandedSections.demographics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Full Name</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{selectedPatient.full_name}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Date of Birth</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{formatDate(selectedPatient.date_of_birth)}</p>
                <p className="text-sm text-gray-500">{calculateAge(selectedPatient.date_of_birth)}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  {getSexIcon()}
                  <span className="text-sm font-medium text-gray-600">Sex at Birth</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {selectedPatient.sex_at_birth || 'Not specified'}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  {getBloodGroupIcon()}
                  <span className="text-sm font-medium text-gray-600">Blood Group</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedPatient.blood_group || 'Not specified'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Appointments Section */}
        <div>
          <SectionHeader
            title="Appointments"
            icon={<Calendar className="w-5 h-5 text-green-600" />}
            sectionKey="appointments"
            count={appointments.length}
          />
          
          {expandedSections.appointments && (
            <div className="space-y-4 mb-6">
              {appointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No appointments found</p>
                </div>
              ) : (
                appointments.map((appointment) => (
                  <div key={appointment.appointment_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {formatDateTime(appointment.appointment_datetime)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        ID: {appointment.appointment_id.slice(0, 8)}...
                      </span>
                    </div>
                    
                    {appointment.transcript_text && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Transcript</h4>
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                          {appointment.transcript_text}
                        </div>
                      </div>
                    )}
                    
                    {appointment.summary_text && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                        <div className="bg-blue-50 p-3 rounded text-sm text-gray-700">
                          {appointment.summary_text}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Clinical Insights Section */}
        <div>
          <SectionHeader
            title="Clinical Insights"
            icon={<Heart className="w-5 h-5 text-red-600" />}
            sectionKey="insights"
            count={insights.length}
          />
          
          {expandedSections.insights && (
            <div className="space-y-4 mb-6">
              {insights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No clinical insights available</p>
                </div>
              ) : (
                insights.map((insight) => (
                  <div key={insight.appointment_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Clinical Analysis</h4>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(insight.inserted_at)}
                      </span>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(insight.critical_json, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Clinical Facts Section */}
        <div>
          <SectionHeader
            title="Clinical Facts"
            icon={<FileText className="w-5 h-5 text-purple-600" />}
            sectionKey="facts"
            count={facts.length}
          />
          
          {expandedSections.facts && (
            <div className="space-y-3">
              {facts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No clinical facts available</p>
                </div>
              ) : (
                facts.map((fact) => (
                  <div key={fact.fact_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {fact.fact_key || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(fact.inserted_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{fact.fact_value}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">Patient ID:</span> {selectedPatient.id}
            </div>
            <div>
              <span className="font-medium">Created:</span> {formatDateTime(selectedPatient.created_at)}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {formatDateTime(selectedPatient.updated_at)}
            </div>
            <div>
              <span className="font-medium">Total Records:</span> {appointments.length + facts.length + insights.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientReport;