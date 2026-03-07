-- Platform Plans and Feature Matrix
-- Admin-owned subscription catalog for organizer SaaS billing.

create table if not exists public.plans (
  "planId" uuid not null default extensions.gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz null default now(),
  name varchar not null,
  slug varchar null,
  description text null,
  "monthlyPrice" numeric(12,2) not null default 0,
  "yearlyPrice" numeric(12,2) not null default 0,
  "priceAmount" numeric(12,2) not null default 0,
  currency varchar not null default 'PHP',
  "billingInterval" varchar not null default 'monthly',
  "trialDays" integer not null default 0,
  "isDefault" boolean not null default false,
  "isRecommended" boolean not null default false,
  "isActive" boolean not null default true,
  "createdBy" uuid null,
  constraint plans_pkey primary key ("planId"),
  constraint plans_slug_key unique (slug),
  constraint plans_createdBy_fkey foreign key ("createdBy")
    references public.users ("userId") on delete set null
);

create table if not exists public."planFeatures" (
  "planFeatureId" uuid not null default extensions.gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz null default now(),
  "planId" uuid not null,
  key varchar not null,
  value text null,
  constraint planFeatures_pkey primary key ("planFeatureId"),
  constraint planFeatures_planId_fkey foreign key ("planId")
    references public.plans ("planId") on delete cascade,
  constraint planFeatures_planId_key_key unique ("planId", key)
);

create index if not exists idx_plans_active on public.plans ("isActive");
create index if not exists idx_plan_features_plan_id on public."planFeatures" ("planId");
