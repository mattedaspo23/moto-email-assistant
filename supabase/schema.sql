create extension if not exists pgcrypto;

create table if not exists public.moto (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  slug text unique,
  name text not null,
  available boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.incoming_emails (
  id uuid primary key default gen_random_uuid(),
  imap_uid bigint not null unique,
  message_id text,
  from_email text not null,
  to_emails text[] not null default '{}',
  subject text not null default '',
  text_body text not null default '',
  html_body text not null default '',
  sent_at timestamptz,
  attachments jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_replies (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  subject text not null,
  template_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_moto_code on public.moto(code);
create index if not exists idx_moto_slug on public.moto(slug);
create index if not exists idx_incoming_emails_message_id on public.incoming_emails(message_id);
create index if not exists idx_email_replies_recipient_email on public.email_replies(recipient_email);
