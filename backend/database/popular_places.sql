-- Popular Destinations Management Table
-- This table stores curated cities and countries to be featured on the discovery slider.

CREATE TABLE IF NOT EXISTS popular_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Philippines',
    image_url TEXT,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for ranking and filtering
CREATE INDEX IF NOT EXISTS idx_popular_places_priority ON popular_places(priority DESC);
CREATE INDEX IF NOT EXISTS idx_popular_places_active ON popular_places(is_active) WHERE is_active = true;

-- Default Initial Seeding
INSERT INTO popular_places (city, country, image_url, priority)
VALUES 
('Manila', 'Philippines', 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?q=80&w=800&auto=format&fit=crop', 10),
('Cebu', 'Philippines', 'https://images.unsplash.com/photo-1582236378415-38fc7a871790?q=80&w=800&auto=format&fit=crop', 9),
('Singapore', 'Singapore', 'https://images.unsplash.com/photo-1525625239513-94e94faa53f0?q=80&w=800&auto=format&fit=crop', 8),
('Tokyo', 'Japan', 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop', 7)
ON CONFLICT DO NOTHING;
