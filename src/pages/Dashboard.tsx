import React from 'react';
import PatientDirectory from '../components/PatientDirectory';
import ClinicalFacts from '../components/ClinicalFacts';
import PatientReport from '../components/PatientReport';

const Dashboard: React.FC = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          View patient information and clinical facts with real-time updates
        </p>
      </div>

      <div className="space-y-6">
        {/* Top Section - Patient Directory and Clinical Facts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
          <div className="min-h-0">
            <PatientDirectory />
          </div>
          <div className="min-h-0">
            <ClinicalFacts />
          </div>
        </div>

        {/* Bottom Section - Comprehensive Patient Report */}
        <div className="w-full">
          <PatientReport />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;