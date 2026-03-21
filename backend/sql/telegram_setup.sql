-- Схема данных для Трекера привычек / целей (v5.0 - Telegram Integration)
-- Выполните этот SQL в Supabase SQL Editor.

-- 1. ОБНОВЛЕНИЕ ТАБЛИЦЫ ПРОФИЛЕЙ
alter table public.profiles add column if not exists telegram_chat_id text;
alter table public.profiles add column if not exists last_notified_date date;

-- 2. ГЛОБАЛЬНЫЕ НАСТРОЙКИ (для webhook)
-- Создаем схему для внутренних нужд, если ее нет
create schema if not exists internal;

-- 3. ФУНКЦИЯ-ОБЕРТКА ДЛЯ ВЫЗОВА EDGE FUNCTION
-- Эта функция будет вызываться триггером и пробрасывать данные в Edge Function
create or replace function public.trigger_goal_notification()
returns trigger as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'nutrition_entries',
    'record', row_to_json(new)
  );

  -- Вызываем Edge Function через системный http запрос (Supabase Hook)
  -- URL будет динамически подставлен в настройках Webhooks в Dashboard,
  -- но мы можем подготовить логику здесь.
  
  return new;
end;
$$ language plpgsql security definer;

-- 4. ТРИГГЕР НА ТАБЛИЦУ ПИТАНИЯ
drop trigger if exists on_nutrition_added on public.nutrition_entries;
create trigger on_nutrition_added
  after insert on public.nutrition_entries
  for each row execute procedure public.trigger_goal_notification();

-- Инструкция по Webhook:
-- В Supabase Dashboard перейдите в Database -> Webhooks
-- Создайте новый Webhook:
-- Name: notify-telegram
-- Table: nutrition_entries
-- Events: Insert
-- Type: HTTP Request
-- Method: POST
-- URL: https://pnbrskfaerggcddlrlmp.supabase.co/functions/v1/notify-goal-reached
-- Headers: Authorization: Bearer [ВАШ_SERVICE_ROLE_KEY]
-- (SERVICE_ROLE_KEY можно найти в Project Settings -> API)
