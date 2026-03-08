-- Migration for Event Archive System (Soft Delete)
-- Allows organizers to archive events instead of permanent deletion
-- Supports restore and permanent delete functionality

-- Add archive-related columns to events table
ALTER TABLE public.events
ADD COLUMN
IF
  NOT EXISTS is_archived boolean NOT NULL DEFAULT false
  , ADD COLUMN
  IF
    NOT EXISTS deleted_at timestamptz NULL
    , ADD COLUMN
    IF
      NOT EXISTS archived_by uuid NULL REFERENCES public.users("userId")
      ON DELETE SET NULL;

      -- Create index for archived events查询
      CREATE INDEX
      IF
        NOT EXISTS idx_events_is_archived
        ON public.events (is_archived)
        WHERE
          is_archived = true;
        CREATE INDEX
        IF
          NOT EXISTS idx_events_deleted_at
          ON public.events (deleted_at)
          WHERE
            deleted_at IS NOT NULL;

          -- Create archived_events view for easy querying
          CREATE OR REPLACE VIEW public.archived_events AS
          SELECT
            e.*
            , u.name as archived_by_name
            , u.email as archived_by_email
          FROM
            public.events e
            LEFT JOIN public.users u
          ON e.archived_by = u."userId"
          WHERE
            e.is_archived = true
            AND e.deleted_at IS NOT NULL;