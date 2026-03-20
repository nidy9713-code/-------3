-- Схема данных для Трекера привычек / целей (v2)
-- Выполните этот SQL в Supabase SQL Editor. 
-- Скрипт максимально безопасен: он добавляет только недостающие колонки и таблицы.

-- 1. ПРОФИЛИ
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  gender text default 'Мужской',
  height_cm numeric,
  weight_kg numeric,
  age int,
  daily_calorie_goal int default 2000,
  updated_at timestamp with time zone default now()
);

-- Добавляем колонки в profiles, если их нет (на случай если таблица уже была)
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists gender text default 'Мужской';
alter table public.profiles add column if not exists height_cm numeric;
alter table public.profiles add column if not exists weight_kg numeric;
alter table public.profiles add column if not exists age int;
alter table public.profiles add column if not exists daily_calorie_goal int default 2000;

-- 2. ПИТАНИЕ
create table if not exists public.nutrition_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  calories int default 0,
  logged_at timestamp with time zone default now()
);

-- Добавляем новые колонки в nutrition_entries
alter table public.nutrition_entries add column if not exists meal_type text default 'Перекус';
alter table public.nutrition_entries add column if not exists weight_g int;

-- 3. ТРЕНИРОВКИ
create table if not exists public.workout_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  duration_min int default 0,
  logged_at timestamp with time zone default now()
);

-- Добавляем новые колонки в workout_entries
alter table public.workout_entries add column if not exists calories_burned int default 0;
alter table public.workout_entries add column if not exists completed boolean default true;
alter table public.workout_entries add column if not exists notes text;

-- 4. ИСТОРИЯ ВЕСА (Новая таблица)
create table if not exists public.weight_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  weight_kg numeric not null,
  logged_at timestamp with time zone default now()
);

-- 5. ЦЕЛИ (Новая таблица)
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  target_value numeric not null,
  current_value numeric default 0,
  unit text,
  deadline date,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

-- ВКЛЮЧЕНИЕ RLS
alter table public.profiles enable row level security;
alter table public.nutrition_entries enable row level security;
alter table public.workout_entries enable row level security;
alter table public.weight_logs enable row level security;
alter table public.goals enable row level security;

-- ПОЛИТИКИ (удаляем старые и создаем актуальные)

-- profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- nutrition_entries
drop policy if exists "Users can manage own nutrition" on public.nutrition_entries;
create policy "Users can manage own nutrition" on public.nutrition_entries 
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- workout_entries
drop policy if exists "Users can manage own workouts" on public.workout_entries;
create policy "Users can manage own workouts" on public.workout_entries 
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- weight_logs
drop policy if exists "Users can manage own weight_logs" on public.weight_logs;
create policy "Users can manage own weight_logs" on public.weight_logs 
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- goals
drop policy if exists "Users can manage own goals" on public.goals;
create policy "Users can manage own goals" on public.goals 
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
