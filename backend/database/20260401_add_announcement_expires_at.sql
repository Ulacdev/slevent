-- Add expires_at to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE NULL;

-- Update existing announcements to never expire if needed, or leave as NULL
-- UPDATE announcements SET expires_at = NULL;
