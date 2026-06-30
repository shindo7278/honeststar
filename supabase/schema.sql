-- ============================================================
-- Honeststar — Database Schema (Supabase / Postgres)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Plans (the 3 fixed subscription tiers) ----------
create table plans (
  id text primary key,              -- 'basic' | 'standard' | 'pro'
  name_ar text not null,
  price_gbp numeric not null,
  message_quota integer not null,   -- combined email+whatsapp messages/month
  max_doctors integer not null default 1,
  paddle_price_id text              -- filled in once you create the price in Paddle
);

insert into plans (id, name_ar, price_gbp, message_quota, max_doctors) values
  ('basic',    'الأساسية',  19, 250, 1),
  ('standard', 'المتوسطة',  27, 450, 2),
  ('pro',      'الاحترافية', 35, 700, 5);

-- ---------- Clinics (tenants) ----------
create table clinics (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_email text not null unique,
  doctor_name text,
  google_review_link text,          -- direct g.page review link
  default_channel text not null default 'whatsapp_first'
    check (default_channel in ('whatsapp_first', 'email_only', 'both')),
  default_delay_hours numeric not null default 2,
  message_template_male text not null default
    'شكرًا لزيارتك {clinic_name} 🌟 تمنينا إنك استفدت من الكشف. تقييمك يساعدنا كتير: {review_link}',
  message_template_female text not null default
    'شكرًا لزيارتك {clinic_name} 🌟 تمنينا إنك استفدتي من الكشف. تقييمك يساعدنا كتير: {review_link}',
  plan_id text not null default 'basic' references plans(id),
  paddle_subscription_id text,
  paddle_customer_id text,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing','active','past_due','canceled','paused')),
  messages_used_this_cycle integer not null default 0,
  billing_cycle_start date not null default date_trunc('month', now()),
  created_at timestamptz not null default now()
);

-- ---------- Doctors / staff users under a clinic (for standard/pro plans) ----------
create table clinic_members (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  auth_user_id uuid not null,        -- maps to Supabase auth.users.id
  role text not null default 'secretary' check (role in ('owner','secretary')),
  created_at timestamptz not null default now()
);

-- ---------- Patients ----------
create table patients (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  gender text not null check (gender in ('male','female')),
  email text,
  whatsapp_number text,
  visit_status text not null default 'pending'
    check (visit_status in ('pending','completed')),
  requested_delay_hours numeric,    -- override of clinic default, set when patient is added
  reminder_status text not null default 'not_sent'
    check (reminder_status in ('not_sent','scheduled','sent','failed','clicked')),
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  clicked_at timestamptz,
  channel_used text check (channel_used in ('email','whatsapp','both')),
  created_at timestamptz not null default now()
);

-- ---------- Message log (for tracking + click attribution) ----------
create table message_log (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  status text not null check (status in ('sent','failed')),
  tracking_token uuid not null default uuid_generate_v4(),  -- used in the review-link redirect
  clicked boolean not null default false,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_patients_clinic on patients(clinic_id);
create index idx_patients_due on patients(reminder_status, scheduled_send_at);
create index idx_message_log_token on message_log(tracking_token);

-- ---------- Row Level Security ----------
alter table clinics enable row level security;
alter table clinic_members enable row level security;
alter table patients enable row level security;
alter table message_log enable row level security;

-- Each clinic member can only see their own clinic's data
create policy "members see own clinic" on clinics
  for select using (
    id in (select clinic_id from clinic_members where auth_user_id = auth.uid())
  );

create policy "members update own clinic" on clinics
  for update using (
    id in (select clinic_id from clinic_members where auth_user_id = auth.uid())
  );

create policy "members manage own clinic patients" on patients
  for all using (
    clinic_id in (select clinic_id from clinic_members where auth_user_id = auth.uid())
  );

create policy "members see own clinic logs" on message_log
  for select using (
    clinic_id in (select clinic_id from clinic_members where auth_user_id = auth.uid())
  );

-- Allow a freshly signed-up user to create their own clinic
create policy "authenticated users can create a clinic" on clinics
  for insert with check (auth.uid() is not null);

-- Allow a freshly signed-up user to link themselves to the clinic they just created
-- (only as the owner of their own auth_user_id — they cannot add other users)
create policy "users can link themselves to a clinic" on clinic_members
  for insert with check (auth_user_id = auth.uid());

create policy "members see own clinic membership" on clinic_members
  for select using (auth_user_id = auth.uid());
