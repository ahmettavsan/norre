-- nook database. Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again.
--
-- Users live in Supabase Auth (auth.users). Every user has one board; its photos are kept in their own
-- rows so the board itself stays small and each photo is uploaded only once.

create table if not exists public.boards (
  owner uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint boards_size check (octet_length(data::text) < 5000000)
);

create table if not exists public.photos (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Hash of the image, referenced from the board as "photo:<id>".
  id text not null,
  -- The image as a data URL (already shrunk by the app to a few dozen KB).
  data text not null,
  created_at timestamptz not null default now(),
  primary key (owner, id),
  constraint photos_size check (octet_length(data) < 2000000)
);

alter table public.boards enable row level security;
alter table public.photos enable row level security;

grant select, insert, update, delete on public.boards, public.photos to authenticated;

-- Everyone can read and write only their own board and photos.
drop policy if exists "boards: own rows" on public.boards;
create policy "boards: own rows" on public.boards
  for all to authenticated
  using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);

drop policy if exists "photos: own rows" on public.photos;
create policy "photos: own rows" on public.photos
  for all to authenticated
  using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);
