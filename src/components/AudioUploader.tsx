import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileAudio, X, Download, FileText, User, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { AudioJob } from '../types';

const AudioUploader: React.FC = () => {
  const { uploadStatus, setUploadStatus, processingState, setProcessingState, patients } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [currentJob, setCurrentJob] = useState<AudioJob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Subscribe to job updates if we have a current job
    if (currentJob) {
      const subscription = supabase
        .channel(`job_${currentJob.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'audio_jobs',
            filter: `id=eq.${currentJob.id}`,
          },
          (payload) => {
            const updatedJob = payload.new as AudioJob;
            setCurrentJob(updatedJob);
            
            if (updatedJob.status === 'processing') {
              setUploadStatus(prev => ({ ...prev, isUploading: true, progress: 50 }));
            } else if (updatedJob.status === 'done') {
              setUploadStatus(prev => ({
                ...prev,
                isUploading: false,
                progress: 100,
                transcriptReady: true,
                noteReady: true,
              }));
              setProcessingState(prev => ({
                ...prev,
                transcript: updatedJob.transcript || '',
                downloadUrls: {
                  pdf: updatedJob.note_pdf_url || '',
                  markdown: updatedJob.note_md_url || '',
                },
                currentJob: updatedJob,
              }));
            } else if (updatedJob.status === 'error') {
              setUploadStatus(prev => ({
                ...prev,
                isUploading: false,
                progress: 0,
                error: 'Processing failed. Please try again.',
              }));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentJob, setUploadStatus, setProcessingState]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a WAV or MP3 file');
      return;
    }

    setSelectedFile(file);
    setUploadStatus({
      isUploading: false,
      progress: 0,
      transcriptReady: false,
      noteReady: false,
    });
    setProcessingState({
      transcript: '',
      downloadUrls: {},
    });
    setCurrentJob(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !selectedPatient) {
      alert('Please select both a file and a patient');
      return;
    }

    // Check if webhook URL is configured
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_UPLOAD;
    
    if (!webhookUrl || webhookUrl.includes('your-actual-webhook-url') || webhookUrl.includes('your_supabase_url')) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        transcriptReady: false,
        noteReady: false,
        error: 'Webhook URL not configured. Please update the VITE_N8N_WEBHOOK_URL_UPLOAD in your .env file with your actual n8n webhook URL (e.g., https://your-ngrok-url.ngrok-free.app/webhook-test/...).',
      });
      return;
    }
    setUploadStatus({
      isUploading: true,
      progress: 10,
      transcriptReady: false,
      noteReady: false,
    });

    try {
      // Create FormData with the audio file as "test" key and patient_id
      const formData = new FormData();
      formData.append('test', selectedFile); // Use "test" as the key for the audio file
      formData.append('patient_id', selectedPatient);

      setUploadStatus(prev => ({ ...prev, progress: 30 }));

      // Send file directly to webhook
      
      console.log('Sending FormData with:');
      console.log('- Audio file (key: "test"):', selectedFile.name, selectedFile.type, selectedFile.size, 'bytes');
      console.log('- Patient ID:', selectedPatient);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true',
          // Don't set Content-Type header - let the browser set it with boundary for FormData
        },
        mode: 'cors',
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const result = await response.json().catch(() => ({ message: 'Success but no JSON response' }));
      
      console.log('Upload response:', result);
      
      setUploadStatus(prev => ({ ...prev, progress: 60 }));

      // If webhook returns a job_id, fetch the job details
      if (result.job_id) {
        const { data: jobData, error: jobError } = await supabase
          .from('audio_jobs')
          .select('*')
          .eq('id', result.job_id)
          .single();

        if (jobError) {
          throw new Error(`Failed to fetch job details: ${jobError.message}`);
        }

        setCurrentJob(jobData);
        setUploadStatus(prev => ({ ...prev, progress: 80 }));
      } else {
        // If no job_id returned, the webhook handled everything
        setUploadStatus(prev => ({ 
          ...prev, 
          progress: 100,
          isUploading: false,
        }));
      }


    } catch (error) {
      console.error('Upload error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to the webhook. Please verify that your n8n webhook URL is correct, accessible, and that your n8n workflow is active. If using ngrok, ensure the tunnel is running.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setUploadStatus({
        isUploading: false,
        progress: 0,
        transcriptReady: false,
        noteReady: false,
        error: errorMessage,
      });
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setSelectedPatient('');
    setCurrentJob(null);
    setUploadStatus({
      isUploading: false,
      progress: 0,
      transcriptReady: false,
      noteReady: false,
    });
    setProcessingState({
      transcript: '',
      downloadUrls: {},
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusMessage = () => {
    if (!currentJob) return '';
    
    switch (currentJob.status) {
      case 'new':
        return 'Job created, waiting for processing...';
      case 'processing':
        return 'Processing audio file...';
      case 'done':
        return 'Processing complete!';
      case 'error':
        return 'Processing failed';
      default:
        return '';
    }
  };

  const testWebhook = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_UPLOAD;
    
    if (!webhookUrl || webhookUrl.includes('your-actual-webhook-url') || webhookUrl.includes('your_supabase_url')) {
      alert('Webhook URL not configured. Please update the VITE_N8N_WEBHOOK_URL_UPLOAD in your .env file with your actual n8n webhook URL (e.g., https://your-ngrok-url.ngrok-free.app/webhook-test/...).');
      return;
    }
    try {
      
      // Create FormData with the actual audio file, just like the upload function
      const formData = new FormData();
      formData.append('test', selectedFile); // Use "test" as the key for the audio file
      if (selectedPatient) {
        formData.append('patient_id', selectedPatient);
      }
      formData.append('is_test', 'true'); // Add a flag to indicate this is a test
      
      console.log('Testing webhook with FormData:');
      console.log('- Audio file (key: "test"):', selectedFile.name, selectedFile.type, selectedFile.size, 'bytes');
      console.log('- Patient ID:', selectedPatient || 'none');
      console.log('- Test flag: true');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true',
          // Don't set Content-Type header - let the browser set it with boundary for FormData
        },
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json().catch(() => ({ message: 'Connected successfully' }));
      
      console.log('Webhook test result:', result);
      alert(`Webhook test successful! Status: ${response.status}. Response: ${result.message || 'Connected'}`);
    } catch (error) {
      console.error('Webhook test error:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error - unable to connect to webhook. Verify your n8n webhook URL is correct, accessible, and that your n8n workflow is active. If using ngrok, ensure the tunnel is running.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert('Webhook test failed: ' + errorMessage);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Audio Processing</h2>
        
        {/* Patient Selection */}
        <div className="mb-6">
          <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Patient
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              id="patient-select"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploadStatus.isUploading}
            >
              <option value="">Choose a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name} (ID: {patient.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : selectedFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center space-x-4">
                <FileAudio className="w-12 h-12 text-green-600" />
                <div className="text-left">
                  <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={resetUpload}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={uploadStatus.isUploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your audio file here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to browse (WAV, MP3 supported)
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Browse Files
                </button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/wav,audio/mp3,audio/mpeg"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
          
          {uploadStatus.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-700">{uploadStatus.error}</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {uploadStatus.isUploading && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {getStatusMessage()}
              </span>
              <span className="text-sm text-gray-500">{uploadStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${uploadStatus.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Job Status */}
        {currentJob && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Job Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentJob.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                currentJob.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                currentJob.status === 'done' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {currentJob.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600">Job ID: {currentJob.id}</p>
            <p className="text-sm text-gray-600">File: {currentJob.object_path}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={uploadFile}
            disabled={!selectedFile || !selectedPatient || uploadStatus.isUploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadStatus.isUploading ? 'Processing...' : 'Process Audio'}
          </button>
          
          <button
            onClick={testWebhook}
            disabled={!selectedFile || uploadStatus.isUploading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Test Webhook
          </button>
        </div>

        {/* Download Options */}
        {uploadStatus.noteReady && processingState.downloadUrls.pdf && (
          <div className="flex space-x-4 mb-6">
            <a
              href={processingState.downloadUrls.pdf}
              download
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </a>
            
            {processingState.downloadUrls.markdown && (
              <a
                href={processingState.downloadUrls.markdown}
                download
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download Markdown
              </a>
            )}
          </div>
        )}

        {/* Transcript Display */}
        {processingState.transcript && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Transcript</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <textarea
                value={processingState.transcript}
                readOnly
                className="w-full h-48 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="Transcript will appear here..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioUploader;