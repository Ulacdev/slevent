-- Add column to track when feedback emails were sent
ALTER TABLE events ADD COLUMN IF NOT EXISTS feedback_emails_sent_at TIMESTAMPTZ;
