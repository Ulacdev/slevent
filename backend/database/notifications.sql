-- In-app notification feed.
-- Safe to run multiple times.

create table if not exists public.notifications (
  notification_id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null,
  actor_user_id uuid null,
  event_id uuid null,
  organizer_id uuid null,
  type text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  constraint notifications_recipient_user_id_fkey
    foreign key (recipient_user_id) references public.users("userId") on delete cascade,
  constraint notifications_actor_user_id_fkey
    foreign key (actor_user_id) references public.users("userId") on delete set null,
  constraint notifications_organizer_id_fkey
    foreign key (organizer_id) references public.organizers("organizerId") on delete set null
);

create index if not exists idx_notifications_recipient_created
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists idx_notifications_recipient_unread
  on public.notifications (recipient_user_id, is_read, created_at desc);
