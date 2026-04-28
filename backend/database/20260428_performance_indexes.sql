-- Performance Optimization Indexes
-- Added on 2026-04-28

-- 1. Index on users email for faster login and lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Index on events organizerId and status for faster event listing
CREATE INDEX IF NOT EXISTS idx_events_organizer_status ON events("organizerId", status);

-- 3. Index on events slug for faster event detail lookup
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);

-- 4. Index on invites organizerId (invitedBy) for faster limit checking
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON invites("invitedBy");

-- 5. Index on attendees eventId for faster registration counts
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON attendees("eventId");

-- 6. Add likes_count column to events for faster sorting
ALTER TABLE events ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_events_likes_count ON events(likes_count DESC);

-- 7. Trigger to update likes_count on events table
CREATE OR REPLACE FUNCTION update_event_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE events SET likes_count = likes_count + 1 WHERE "eventId" = NEW."eventId";
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE events SET likes_count = likes_count - 1 WHERE "eventId" = OLD."eventId";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_event_likes_count ON "eventLikes";
CREATE TRIGGER trg_update_event_likes_count
AFTER INSERT OR DELETE ON "eventLikes"
FOR EACH ROW EXECUTE FUNCTION update_event_likes_count();

-- 8. Backfill likes_count for existing events
UPDATE events e
SET likes_count = (
    SELECT count(*)
    FROM "eventLikes" l
    WHERE l."eventId" = e."eventId"
);

-- 9. Add invite_count to organizers for faster limit checking
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS invite_count INTEGER DEFAULT 0;

-- 10. Trigger to update invite_count on organizers table
CREATE OR REPLACE FUNCTION update_organizer_invite_count()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    target_invited_by UUID;
BEGIN
    target_invited_by := COALESCE(NEW."invitedBy", OLD."invitedBy");
    
    -- Find the organizer owned by this user
    SELECT "organizerId" INTO org_id FROM organizers WHERE "ownerUserId" = target_invited_by;
    
    IF org_id IS NULL THEN
        -- If not an owner, check if they are staff (employerId)
        SELECT "employerId" INTO target_invited_by FROM users WHERE "userId" = target_invited_by;
        SELECT "organizerId" INTO org_id FROM organizers WHERE "ownerUserId" = target_invited_by;
    END IF;

    IF org_id IS NOT NULL THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE organizers SET invite_count = invite_count + 1 WHERE "organizerId" = org_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE organizers SET invite_count = invite_count - 1 WHERE "organizerId" = org_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_organizer_invite_count ON invites;
CREATE TRIGGER trg_update_organizer_invite_count
AFTER INSERT OR DELETE ON invites
FOR EACH ROW EXECUTE FUNCTION update_organizer_invite_count();

-- 11. Backfill invite_count
UPDATE organizers o
SET invite_count = (
    SELECT count(*)
    FROM invites i
    WHERE i."invitedBy" IN (
        SELECT "userId" FROM users WHERE "employerId" = o."ownerUserId" OR "userId" = o."ownerUserId"
    )
);
