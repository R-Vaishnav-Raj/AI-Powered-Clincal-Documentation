import React from 'react';
import { Clock, AlertCircle, Activity, Shield, Pill } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const ClinicalFacts: React.FC = () => {
  const { selectedPatient, facts, loading } = useApp();

  const getFactIcon = (type: string) => {
    const factType = type?.toLowerCase() || '';
    switch (factType) {
      case 'diagnosis':
        return <AlertCircle className="w-4 h-4" />;
      case 'medication':
        return <Pill className="w-4 h-4" />;
      case 'allergy':
        return <Shield className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getFactBadgeColor = (type: string) => {
    const factType = type?.toLowerCase() || '';
    switch (factType) {
      case 'diagnosis':
        return 'bg-red-100 text-red-800';
      case 'medication':
        return 'bg-blue-100 text-blue-800';
      case 'allergy':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!selectedPatient) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Clinical Facts</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a patient to view clinical facts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Clinical Facts</h2>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {selectedPatient.full_name} • ID: {selectedPatient.id}
        </p>
      </div>

      <div className="overflow-y-auto h-96">
        {facts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No clinical facts available</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {facts.map((fact) => (
              <div key={fact.fact_id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFactBadgeColor(fact.fact_key)}`}>
                      {getFactIcon(fact.fact_key)}
                      <span className="ml-1 capitalize">{fact.fact_key || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 leading-relaxed">{fact.fact_value}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDateTime(fact.inserted_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalFacts;