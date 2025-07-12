import React from 'react';
import { Search, Calendar, User, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Patient } from '../types';
import AddPatientModal from './AddPatientModal';

const PatientDirectory: React.FC = () => {
  const { patients, selectedPatient, setSelectedPatient, searchTerm, setSearchTerm, refreshPatients } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Patient Directory</h2>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {patients.length} patient{patients.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Patient
            </button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="overflow-y-auto h-96">
        {patients.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No patients found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {patients.map((patient: Patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${
                  selectedPatient?.id === patient.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedPatient(patient);
                  }
                }}
                aria-label={`Select patient ${patient.full_name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{patient.full_name}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-500">MRN: {patient.mrn}</span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {formatDate(patient.dob)} (Age {calculateAge(patient.dob)})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedPatient?.id === patient.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onPatientAdded={refreshPatients}
      />
    </div>
  );
};

export default PatientDirectory;