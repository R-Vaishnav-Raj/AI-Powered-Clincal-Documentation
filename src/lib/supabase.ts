import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      patients_min: {
        Row: {
          patient_id: string;
          full_name: string | null;
          date_of_birth: string | null;
          sex_at_birth: 'male' | 'female' | 'other' | null;
          blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['patients_min']['Row'], 'patient_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients_min']['Insert']>;
      };
      appointments: {
        Row: {
          appointment_id: string;
          patient_id: string;
          appointment_datetime: string | null;
          transcript_text: string | null;
          summary_text: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'appointment_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      appointment_insights: {
        Row: {
          appointment_id: string;
          critical_json: any;
          inserted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['appointment_insights']['Row'], 'inserted_at'>;
        Update: Partial<Database['public']['Tables']['appointment_insights']['Insert']>;
      };
      appointment_facts: {
        Row: {
          fact_id: number;
          appointment_id: string;
          fact_key: string;
          fact_value: string;
          inserted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['appointment_facts']['Row'], 'fact_id' | 'inserted_at'>;
        Update: Partial<Database['public']['Tables']['appointment_facts']['Insert']>;
      };
      audio_jobs: {
        Row: {
          id: string;
          patient_id: string;
          object_path: string;
          status: 'new' | 'processing' | 'done' | 'error';
          transcript: string | null;
          note_pdf_url: string | null;
          note_md_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audio_jobs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['audio_jobs']['Insert']>;
      };
    };
  };
};