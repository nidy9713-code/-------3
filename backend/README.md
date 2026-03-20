# Backend

Здесь собрана **серверная** часть проекта в широком смысле: конфигурация **Supabase** (БД, Auth, RLS) и место под SQL.

## Что где

| Путь | Назначение |
|------|------------|
| `supabase/config.toml` | Локальный стек Supabase CLI (`supabase start`): auth, email и т.д. |
| `sql/` | Опционально: файлы миграций или схемы для ручного выполнения в SQL Editor |

## Связь с фронтендом

Приложение в **`frontend/`** ходит в облачный проект Supabase по **HTTPS** (URL и anon key в `frontend/.env`). Этот каталог **не** подменяет Supabase Cloud — он для локального CLI и документации бэкенда.

### Локальный Supabase

Из корня репозитория (при установленном [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
cd backend
supabase start
```

Конфиг: `backend/supabase/config.toml` (например, `enable_confirmations = false` для разработки).

### RLS и таблицы

Таблицы `profiles`, `nutrition_entries`, `workout_entries` и политики **RLS** настраиваются в консоли Supabase или через SQL — см. корневой `README.md`.
