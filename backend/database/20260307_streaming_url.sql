-- Add streaming_url to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS streaming_url TEXT;
