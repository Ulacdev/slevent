-- Fix notifications table to allow deep joins with users for support tickets
-- Run this in your Supabase SQL Editor

-- 1. Add foreign key for the actor (the organizer who sent the message)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_actor_user_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_actor_user_id_fkey
      foreign key (actor_user_id) references public.users("userId") on delete set null;
  end if;
end $$;

-- 2. Add foreign key for the recipient (the admin)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_recipient_user_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_recipient_user_id_fkey
      foreign key (recipient_user_id) references public.users("userId") on delete cascade;
  end if;
end $$;

-- 3. Notify PostgREST to reload schema (Supabase does this automatically usually)
comment on table public.notifications is 'Support Tickets and In-app notifications';
