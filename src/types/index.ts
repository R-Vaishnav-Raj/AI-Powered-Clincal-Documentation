export interface Patient {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  sex_at_birth: 'male' | 'female' | 'other' | null;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Appointment {
  appointment_id: string;
  patient_id: string;
  appointment_datetime: string | null;
  transcript_text: string | null;
  summary_text: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Fact {
  fact_id: number;
  appointment_id: string;
  fact_key: string;
  fact_value: string;
  inserted_at: string | null;
}

export interface AppointmentInsight {
  appointment_id: string;
  critical_json: any;
  inserted_at: string | null;
}

export interface AudioJob {
  id: string;
  patient_id: string;
  object_path: string;
  status: 'new' | 'processing' | 'done' | 'error';
  transcript: string | null;
  note_pdf_url: string | null;
  note_md_url: string | null;
  created_at: string;
}

export interface UploadStatus {
  isUploading: boolean;
  progress: number;
  transcriptReady: boolean;
  noteReady: boolean;
  error?: string;
}

export interface ProcessingState {
  transcript: string;
  downloadUrls: Record<string, string>;
  currentJob?: AudioJob;
}