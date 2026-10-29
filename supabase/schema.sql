-- TaskFlow database schema for Supabase.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste this file -> Run.
-- It is safe to re-run: every statement is idempotent.
--
-- Model: people sign up (auth.users + profiles), belong to workspaces through workspace_members,
-- and join other workspaces with an invite link (workspace_invites + accept_invite()).
-- Projects and tasks are stored as one JSON document per row; the app sanitises them on load,
-- exactly like it sanitises localStorage data. Row Level Security limits every row to members.

-- ---------- tables ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create table if not exists public.projects (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  data jsonb not null,
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.tasks (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  data jsonb not null check (octet_length(data::text) < 100000),
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

-- ---------- helpers ----------

-- security definer so policies on workspace_members can call it without recursing into themselves
create or replace function public.is_member(ws uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.is_owner(ws uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.workspaces where id = ws and owner = auth.uid());
$$;

-- a profile row for every new account, named from the sign-up form
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 60),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- whoever creates a workspace becomes its owner member
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- joining happens only through a valid, unexpired invite token
create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  ws uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select workspace_id into ws
  from public.workspace_invites
  where token = invite_token and expires_at > now();
  if ws is null then
    raise exception 'invite link is invalid or has expired';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, auth.uid(), 'member')
  on conflict do nothing;
  return ws;
end;
$$;

revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- ---------- row level security ----------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- profiles: see yourself and anyone you share a workspace with; edit only yourself
drop policy if exists "profiles: read teammates" on public.profiles;
create policy "profiles: read teammates" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );
drop policy if exists "profiles: update self" on public.profiles;
create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- workspaces
drop policy if exists "workspaces: members read" on public.workspaces;
create policy "workspaces: members read" on public.workspaces for select to authenticated
  using (public.is_member(id));
drop policy if exists "workspaces: create own" on public.workspaces;
create policy "workspaces: create own" on public.workspaces for insert to authenticated
  with check (owner = auth.uid());
drop policy if exists "workspaces: owner renames" on public.workspaces;
create policy "workspaces: owner renames" on public.workspaces for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "workspaces: owner deletes" on public.workspaces;
create policy "workspaces: owner deletes" on public.workspaces for delete to authenticated
  using (owner = auth.uid());

-- members: members see each other; members leave, owners remove (the owner cannot be removed)
drop policy if exists "members: read" on public.workspace_members;
create policy "members: read" on public.workspace_members for select to authenticated
  using (public.is_member(workspace_id));
drop policy if exists "members: leave or remove" on public.workspace_members;
create policy "members: leave or remove" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (user_id = auth.uid() or public.is_owner(workspace_id)));

-- invites: any member can create, see and revoke the workspace's invite links
drop policy if exists "invites: members read" on public.workspace_invites;
create policy "invites: members read" on public.workspace_invites for select to authenticated
  using (public.is_member(workspace_id));
drop policy if exists "invites: members create" on public.workspace_invites;
create policy "invites: members create" on public.workspace_invites for insert to authenticated
  with check (public.is_member(workspace_id) and created_by = auth.uid());
drop policy if exists "invites: members revoke" on public.workspace_invites;
create policy "invites: members revoke" on public.workspace_invites for delete to authenticated
  using (public.is_member(workspace_id));

-- projects and tasks: full access for members of the workspace
drop policy if exists "projects: members" on public.projects;
create policy "projects: members" on public.projects for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
drop policy if exists "tasks: members" on public.tasks;
create policy "tasks: members" on public.tasks for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- ---------- realtime ----------

-- full old rows on delete so the app can tell which workspace a deleted row belonged to
alter table public.tasks replica identity full;
alter table public.projects replica identity full;
alter table public.workspace_members replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'projects', 'workspace_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
