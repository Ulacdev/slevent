
-- Create event_categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- Allow world to read active categories
DROP POLICY IF EXISTS "Allow public read active categories" ON public.event_categories;
CREATE POLICY "Allow public read active categories" ON public.event_categories
    FOR SELECT USING (is_active = true);

-- Allow admins full control
DROP POLICY IF EXISTS "Allow admin all access" ON public.event_categories;
CREATE POLICY "Allow admin all access" ON public.event_categories
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE "userId" = auth.uid() AND role = 'ADMIN'
    ));

-- Initial data seed based on your hardcoded list
INSERT INTO public.event_categories (key, label, icon_name, keywords)
VALUES 
('BUSINESS', 'Business', 'Layout', ARRAY['business', 'startup', 'networking', 'summit', 'conference', 'seminar', 'pitch', 'demo day', 'professional']),
('FOOD_DRINK', 'Food & Drink', 'CreditCard', ARRAY['food', 'drink', 'coffee', 'culinary', 'tasting', 'dinner', 'lunch', 'restaurant', 'bar']),
('HEALTH', 'Health', 'Heart', ARRAY['health', 'wellness', 'medical', 'fitness', 'mental health', 'yoga', 'meditation']),
('MUSIC', 'Music', 'Bell', ARRAY['music', 'concert', 'band', 'dj', 'acoustic', 'choir', 'orchestra', 'festival']),
('SCIENCE_TECH', 'Science & Tech', 'Monitor', ARRAY['science', 'tech', 'technology', 'it', 'software', 'coding', 'ai', 'robotics']),
('SPORTS_FITNESS', 'Sports & Fitness', 'TrendingUp', ARRAY['sports', 'fitness', 'gym', 'workout', 'running', 'football', 'basketball', 'soccer']),
('TRAVEL_OUTDOOR', 'Travel & Outdoor', 'MapPin', ARRAY['travel', 'outdoor', 'adventure', 'hiking', 'camping', 'nature', 'trip'])
ON CONFLICT (key) DO NOTHING;
