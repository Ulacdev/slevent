-- Migration: Create reviews table and support photo reviews (Fixed for anonymous support)
DROP TABLE IF EXISTS public.reviews CASCADE;

CREATE TABLE public.reviews (
    "reviewId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL REFERENCES public.events("eventId") ON DELETE CASCADE,
    "userId" UUID NULL, -- Nullable for anonymous reviews
    "attendeeId" UUID NULL REFERENCES public.attendees("attendeeId") ON DELETE SET NULL,
    "userName" TEXT,
    "rating" INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    "comment" TEXT,
    "images" JSONB DEFAULT '[]',
    "isVerified" BOOLEAN DEFAULT FALSE,
    "status" TEXT DEFAULT 'APPROVED',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    -- Each attendee can only review once per event
    CONSTRAINT unique_event_attendee UNIQUE ("eventId", "attendeeId")
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reviews_event_id ON public.reviews("eventId");
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews("userId");
CREATE INDEX IF NOT EXISTS idx_reviews_attendee_id ON public.reviews("attendeeId");
CREATE INDEX IF NOT EXISTS idx_reviews_has_images ON public.reviews USING gin ("images");

-- Trigger for updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reviews_updated_at') THEN
        CREATE TRIGGER update_reviews_updated_at
            BEFORE UPDATE ON public.reviews
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Ensure events table has the feedback flag
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS feedback_emails_sent_at TIMESTAMPTZ;
