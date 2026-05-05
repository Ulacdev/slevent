-- Migration: Support Review Interactions (Helpful & Replies)

-- 1. Add helpful_count to reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

-- 2. Create review_likes table (for 'Helpful' tracking)
CREATE TABLE IF NOT EXISTS public.review_likes (
    "likeId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reviewId" UUID NOT NULL REFERENCES public.reviews("reviewId") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES auth.users("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("reviewId", "userId")
);

-- 3. Create review_replies table
CREATE TABLE IF NOT EXISTS public.review_replies (
    "replyId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reviewId" UUID NOT NULL REFERENCES public.reviews("reviewId") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES auth.users("id") ON DELETE CASCADE,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON public.review_likes("reviewId");
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON public.review_replies("reviewId");

-- RPC Functions for counting
CREATE OR REPLACE FUNCTION increment_helpful_count(row_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.reviews
    SET helpful_count = helpful_count + 1
    WHERE "reviewId" = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_helpful_count(row_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.reviews
    SET helpful_count = GREATEST(0, helpful_count - 1)
    WHERE "reviewId" = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
