-- Add attribution to organizer follows
-- Run this in your Supabase SQL editor

ALTER TABLE public."organizerFollowers" 
ADD COLUMN IF NOT EXISTS "sourceEventId" UUID REFERENCES public.events("eventId") ON DELETE SET NULL;

-- Create index for faster analytics lookups
CREATE INDEX IF NOT EXISTS idx_organizer_followers_source_event 
ON public."organizerFollowers" ("sourceEventId");
