-- Схема данных для Трекера привычек / целей (v4.2 - Fix Data Violation)
-- Выполните этот SQL в Supabase SQL Editor.

-- 1. ПРОФИЛИ
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  role text default 'user',
  gender text default 'male',
  height_cm numeric,
  weight_kg numeric,
  age int,
  daily_calorie_goal int default 2000,
  updated_at timestamp with time zone default now()
);

-- ГАРАНТИРУЕМ НАЛИЧИЕ КОЛОНОК
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists gender text default 'male';
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;

-- ИСПРАВЛЯЕМ СУЩЕСТВУЮЩИЕ ДАННЫЕ ПЕРЕД ДОБАВЛЕНИЕМ ОГРАНИЧЕНИЙ
-- (Конвертируем старые русские значения в новые английские)
update public.profiles set gender = 'male' where gender = 'Мужской';
update public.profiles set gender = 'female' where gender = 'Женский';
update public.profiles set gender = 'male' where gender not in ('male', 'female', 'other') or gender is null;

update public.profiles set role = 'user' where role not in ('user', 'admin') or role is null;

-- ТЕПЕРЬ ДОБАВЛЯЕМ ОГРАНИЧЕНИЯ (Constraints)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check check (gender in ('male', 'female', 'other'));

-- Добавляем остальные ограничения для чисел
alter table public.profiles drop constraint if exists profiles_height_check;
alter table public.profiles add constraint profiles_height_check check (height_cm > 0 or height_cm is null);

alter table public.profiles drop constraint if exists profiles_weight_check;
alter table public.profiles add constraint profiles_weight_check check (weight_kg > 0 or weight_kg is null);

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age >= 0 and age <= 120 or age is null);

-- 2. ПИТАНИЕ
create table if not exists public.nutrition_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  calories int default 0 check (calories >= 0),
  meal_type text default 'Перекус',
  weight_g int check (weight_g >= 0),
  logged_at timestamp with time zone default now()
);

-- 3. ТРЕНИРОВКИ
create table if not exists public.workout_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  duration_min int default 0 check (duration_min >= 0),
  calories_burned int default 0 check (calories_burned >= 0),
  completed boolean default true,
  notes text,
  logged_at timestamp with time zone default now()
);

-- 4. ИСТОРИЯ ВЕСА
create table if not exists public.weight_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  weight_kg numeric not null check (weight_kg > 0),
  logged_at timestamp with time zone default now()
);

-- 5. ЦЕЛИ
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null check (length(title) <= 100),
  target_value numeric not null check (target_value > 0),
  current_value numeric default 0 check (current_value >= 0),
  unit text,
  deadline date,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

-- ФУНКЦИЯ ДЛЯ ПРОВЕРКИ РОЛИ АДМИНА
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- ВКЛЮЧЕНИЕ RLS
alter table public.profiles enable row level security;
alter table public.nutrition_entries enable row level security;
alter table public.workout_entries enable row level security;
alter table public.weight_logs enable row level security;
alter table public.goals enable row level security;

-- ПОЛИТИКИ

-- profiles
drop policy if exists "View profiles" on public.profiles;
create policy "View profiles" on public.profiles for select 
  using (auth.uid() = id or is_admin());

drop policy if exists "Update profiles" on public.profiles;
create policy "Update profiles" on public.profiles for update 
  using (auth.uid() = id or is_admin());

drop policy if exists "Insert profile on signup" on public.profiles;
create policy "Insert profile on signup" on public.profiles for insert 
  with check (auth.uid() = id);

-- Остальные таблицы
do $$
declare
  t text;
begin
  for t in select table_name from information_schema.tables 
           where table_schema = 'public' and table_name in ('nutrition_entries', 'workout_entries', 'weight_logs', 'goals')
  loop
    execute format('drop policy if exists "Manage %I" on public.%I', t, t);
    execute format('create policy "Manage %I" on public.%I for all using (auth.uid() = user_id or is_admin()) with check (auth.uid() = user_id or is_admin())', t, t);
  end loop;
end;
$$;

-- АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'display_name', ''), 
    'user'
  );

  -- Логируем регистрацию пользователя
  insert into public.backend_logs (level, event_type, user_id, metadata)
  values ('INFO', 'BUSINESS_EVENT', new.id, jsonb_build_object('action', 'USER_REGISTERED', 'email', new.email));
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
