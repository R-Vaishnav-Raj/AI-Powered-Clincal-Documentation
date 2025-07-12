/*
  # Update audio jobs trigger for webhook integration

  1. Updates
    - Modify the notify_n8n function to use the correct webhook URL
    - Ensure proper error handling in the trigger function
    - Add logging for debugging

  2. Security
    - Function uses service role permissions
    - HTTP extension is required for external calls
*/

-- Update the notify_n8n function with the correct webhook URL
CREATE OR REPLACE FUNCTION public.notify_n8n()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  _webhook_url text := 'https://inspired-bison-generally.ngrok-free.app/webhook-test/8e3e2e9e-af4d-4a7a-8957-45411798ae11';
  _full_url text;
  _response record;
BEGIN
  -- Construct the full URL with job_id parameter
  _full_url := _webhook_url || '?job_id=' || NEW.id::text;
  
  -- Log the webhook call attempt
  RAISE LOG 'Calling webhook: %', _full_url;
  
  -- Make the HTTP GET request
  BEGIN
    SELECT * INTO _response FROM http_get(_full_url);
    
    -- Log the response
    RAISE LOG 'Webhook response status: %, content: %', _response.status, _response.content;
    
    -- If the webhook call fails, log it but don't fail the trigger
    IF _response.status NOT BETWEEN 200 AND 299 THEN
      RAISE WARNING 'Webhook call failed with status %: %', _response.status, _response.content;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the trigger
    RAISE WARNING 'Webhook call failed with error: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS trg_audio_jobs_after_insert ON public.audio_jobs;

CREATE TRIGGER trg_audio_jobs_after_insert
  AFTER INSERT ON public.audio_jobs
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_n8n();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.audio_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_n8n() TO service_role;