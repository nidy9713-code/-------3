-- Таблица для структурированных логов бэкенда (Edge Functions)
create table if not exists public.backend_logs (
  id uuid default gen_random_uuid() primary key,
  timestamp timestamp with time zone default now(),
  level text not null check (level in ('INFO', 'WARN', 'ERROR', 'CRITICAL')),
  event_type text not null, -- 'REQUEST', 'BUSINESS_EVENT', 'SYSTEM_ERROR'
  method text,
  url text,
  status_code int,
  duration_ms int,
  user_id uuid,
  payload jsonb, -- Параметры запроса (без секретов)
  response jsonb, -- Ответ сервера
  error_details jsonb, -- Текст ошибки, стек вызов
  metadata jsonb -- Дополнительная информация
);

-- Индекс для быстрого поиска по времени и уровню
create index if not exists idx_logs_timestamp on public.backend_logs (timestamp desc);
create index if not exists idx_logs_level on public.backend_logs (level);

-- Ограничиваем доступ: только администраторы могут смотреть логи через API
alter table public.backend_logs enable row level security;
create policy "Admins can view all logs" on public.backend_logs
  for select using (public.is_admin());

-- ФУНКЦИЯ ДЛЯ АВТОМАТИЧЕСКОГО ЛОГИРОВАНИЯ ИЗМЕНЕНИЙ В БД
create or replace function public.log_db_changes()
returns trigger as $$
declare
  old_data jsonb := null;
  new_data jsonb := null;
  user_id_val uuid := null;
begin
  -- Собираем старые данные (для UPDATE и DELETE)
  if (TG_OP = 'UPDATE' or TG_OP = 'DELETE') then
    old_data := to_jsonb(old);
  end if;

  -- Собираем новые данные (для INSERT и UPDATE)
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    new_data := to_jsonb(new);
  end if;

  -- Пытаемся найти user_id (в большинстве наших таблиц оно есть)
  begin
    if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
      user_id_val := new.user_id;
    elsif (TG_OP = 'DELETE') then
      user_id_val := old.user_id;
    end if;
  exception when others then
    -- Если в таблице нет user_id (например, profiles), пробуем id
    begin
      if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
        user_id_val := new.id;
      end if;
    exception when others then
      user_id_val := auth.uid();
    end;
  end;

  -- Записываем лог
  insert into public.backend_logs (
    level,
    event_type,
    method,
    url,
    user_id,
    payload,
    metadata
  ) values (
    'INFO',
    'DB_OPERATION',
    TG_OP, -- INSERT, UPDATE, DELETE
    TG_TABLE_NAME,
    user_id_val,
    coalesce(new_data, old_data),
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'old_data', old_data,
      'client_id', auth.uid()
    )
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Навешиваем триггеры на основные таблицы
do $$
declare
  t text;
begin
  for t in select table_name from information_schema.tables 
           where table_schema = 'public' 
           and table_name in ('profiles', 'nutrition_entries', 'workout_entries', 'weight_logs', 'goals')
  loop
    execute format('drop trigger if exists tr_log_changes on public.%I', t);
    execute format('create trigger tr_log_changes after insert or update or delete on public.%I for each row execute procedure public.log_db_changes()', t);
  end loop;
end;
$$;
