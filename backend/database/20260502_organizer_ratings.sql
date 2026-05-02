-- Organizer Ratings Table
CREATE TABLE IF NOT EXISTS public.organizer_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES public.organizers("organizerId") ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to auth.users or public.users
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organizer_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizer_ratings_organizer_id ON public.organizer_ratings(organizer_id);

-- Update updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizer_ratings_updated_at
    BEFORE UPDATE ON public.organizer_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
