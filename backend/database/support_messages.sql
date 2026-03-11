-- Support Message Threading
-- Stores the chat history between admins and organizers within a support ticket

create table if not exists public.support_messages (
  message_id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(notification_id) on delete cascade,
  sender_user_id uuid not null references public.users("userId") on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  is_admin_reply boolean not null default false
);

-- Index for fast retrieval of a ticket's message history
create index if not exists idx_support_messages_ticket 
  on public.support_messages (notification_id, created_at asc);

-- Policy to allow the involved admin and the organizer to see the messages
-- (Assuming RLS is enabled on notifications, we follow similar logic)
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Simple policies for now (similar to notifications)
CREATE POLICY "Users can view messages for their notifications"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.notification_id = public.support_messages.notification_id
      AND (n.recipient_user_id = auth.uid() OR n.actor_user_id = auth.uid())
    )
  );

CREATE POLICY "Involved users can insert messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.notification_id = public.support_messages.notification_id
      AND (n.recipient_user_id = auth.uid() OR n.actor_user_id = auth.uid())
    )
  );
