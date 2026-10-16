create table if not exists public.appointments (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  appointment_date date not null,
  name text not null check (char_length(name) <= 500),
  time text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.appointments enable row level security;

grant select, insert, update, delete on public.appointments to authenticated;

create policy "Users can access only their own appointments"
on public.appointments
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
