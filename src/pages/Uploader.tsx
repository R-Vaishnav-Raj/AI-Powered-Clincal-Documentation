import React from 'react';
import AudioUploader from '../components/AudioUploader';

const Uploader: React.FC = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audio Processing</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload audio files for transcription and clinical note generation
        </p>
      </div>

      <AudioUploader />
    </div>
  );
};

export default Uploader;