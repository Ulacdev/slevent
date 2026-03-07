-- Add branding and promotion features to events table
alter table public.events 
add column if not exists "brandColor" varchar(20) default '#38BDF2',
add column if not exists "externalLogoUrl" text null,
add column if not exists "enableDiscountCodes" boolean default false;
