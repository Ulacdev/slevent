-- Announcements Table for Platform Broadcasts
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, CRITICAL
    target_audience TEXT DEFAULT 'ALL', -- ALL, ORGANIZERS, ATTENDEES
    is_published BOOLEAN DEFAULT TRUE,
    scheduled_at TIMESTAMP WITH TIME ZONE NULL,
    author_id TEXT, -- References user who created it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimized indexes for targeting and status
CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
