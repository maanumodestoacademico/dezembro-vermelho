-- Dezembro Vermelho · Unileão — rode UMA vez em Supabase > SQL Editor

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, nome text not null, campus text, curso text, faixa_etaria text,
  consentimento boolean not null default false, consentimento_em timestamptz,
  role text not null default 'participante' check (role in ('participante','admin')),
  created_at timestamptz not null default now()
);

create table public.resultados (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  jogo_id text not null, jogo text,
  pontos int not null default 0, tentativas int not null default 0, tempo_s int not null default 0,
  concluido boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.resultados(user_id);

create table public.config (
  id int primary key check (id = 1),
  conteudo jsonb not null,
  atualizado_em timestamptz default now()
);

create function public.is_admin() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

-- cria o perfil automaticamente com os dados do cadastro
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome, campus, curso, faixa_etaria, consentimento, consentimento_em)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.raw_user_meta_data->>'campus', new.raw_user_meta_data->>'curso', new.raw_user_meta_data->>'faixa',
    coalesce((new.raw_user_meta_data->>'consent') = 'true', false),
    case when (new.raw_user_meta_data->>'consent') = 'true' then now() end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ninguém vira admin pelo site; só pelo SQL Editor
create function public.guard_role() returns trigger language plpgsql as $$
begin
  if new.role <> old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Alteração de perfil não permitida';
  end if;
  return new;
end $$;
create trigger guard_role before update on public.profiles
  for each row execute function public.guard_role();

-- segurança por linha: cada pessoa só enxerga e grava os próprios dados
alter table public.profiles   enable row level security;
alter table public.resultados enable row level security;
alter table public.config     enable row level security;

create policy "perfil: ler o próprio ou admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "perfil: editar o próprio" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "resultados: inserir os próprios" on public.resultados
  for insert with check (user_id = auth.uid());
create policy "resultados: ler os próprios ou admin" on public.resultados
  for select using (user_id = auth.uid() or public.is_admin());

create policy "config: ler (logados)" on public.config
  for select to authenticated using (true);
create policy "config: admin grava" on public.config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Depois de criar SUA conta pelo site, torne-se admin:
-- update public.profiles set role = 'admin' where email = 'seu@email.com';
