/*
  # Create audio jobs table and trigger for n8n integration

  1. New Tables
    - `audio_jobs`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients_min)
      - `object_path` (text, storage path)
      - `status` (text, default 'new')
      - `transcript` (text, nullable)
      - `note_pdf_url` (text, nullable)
      - `note_md_url` (text, nullable)
      - `created_at` (timestamp)

  2. Extensions
    - Enable http extension for webhook calls

  3. Functions & Triggers
    - `notify_n8n()` function to call webhook on job insert
    - Trigger to fire function after insert on audio_jobs

  4. Security
    - Enable RLS on audio_jobs table
    - Add policy for public access
*/

-- Create audio_jobs table
CREATE TABLE IF NOT EXISTS public.audio_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients_min(patient_id) ON DELETE CASCADE,
  object_path text NOT NULL,
  status text DEFAULT 'new',
  transcript text,
  note_pdf_url text,
  note_md_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable http extension for webhook calls
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA public;

-- Create function to notify n8n webhook
CREATE OR REPLACE FUNCTION public.notify_n8n()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  _url text := 'http://localhost:5678/webhook-test/8e3e2e9e-af4d-4a7a-8957-45411798ae11'
              || '?job_id=' || new.id;
BEGIN
  PERFORM http_get(_url, 'application/json');
  RETURN new;
END;$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_audio_jobs_after_insert ON public.audio_jobs;

-- Create trigger to fire webhook on job insert
CREATE TRIGGER trg_audio_jobs_after_insert
  AFTER INSERT ON public.audio_jobs
  FOR EACH ROW EXECUTE PROCEDURE public.notify_n8n();

-- Enable RLS
ALTER TABLE audio_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access to audio_jobs"
  ON audio_jobs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audio_jobs_patient_id ON audio_jobs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON audio_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_created_at ON audio_jobs(created_at DESC);