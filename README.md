# Трекер привычек / целей

Монорепозиторий: **фронтенд** (React + Vite + Tailwind) и **бэкенд** (Supabase: БД, Auth, RLS).

## Структура папок

```
├── frontend/          # SPA: UI, вызовы Supabase из браузера
│   ├── src/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example   # скопировать в frontend/.env
├── backend/           # конфиг Supabase CLI, SQL, описание «серверной» части
│   ├── supabase/      # config.toml для supabase start
│   ├── sql/           # опционально: миграции под SQL Editor
│   └── README.md
├── package.json       # скрипты-обёртки: dev/build из frontend
└── README.md
```

## Установка и запуск

Из **корня** репозитория:

```bash
npm install --prefix frontend
```

Или: `cd frontend` → `npm install`.

Переменные окружения — только в **`frontend/`**:

```bash
cd frontend
copy .env.example .env
```

Вставьте из [Supabase](https://supabase.com) → **Project Settings** → **API**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Запуск dev-сервера **из корня**:

```bash
npm run dev
```

Или из `frontend`: `npm run dev`.

Откройте в браузере адрес из терминала (обычно `http://localhost:5173`).

> Если раньше лежал `.env` в корне проекта — **перенесите** его в `frontend/.env`.

## Сборка для продакшена

Из корня:

```bash
npm run build
npm run preview
```

Артефакты: `frontend/dist/`.

## Бэкенд (Supabase)

Подробности — в **[backend/README.md](backend/README.md)** (`supabase start`, `config.toml`, папка `sql/`).

## Локальная разработка: без подтверждения почты и без ручного входа

### Облачный проект Supabase (supabase.co)

1. **Отключить подтверждение email** — **Authentication** → **Providers** → **Email** → выключить **Confirm email** (для разработки).
2. **Автовход** — в **`frontend/.env`**:

   ```env
   VITE_DEV_AUTO_LOGIN=true
   VITE_DEV_AUTO_LOGIN_EMAIL=ваш-тестовый@email.com
   VITE_DEV_AUTO_LOGIN_PASSWORD=ваш-пароль
   ```

   В production автовход не используется (`import.meta.env.DEV`).

### Локальный Supabase CLI

Файл **`backend/supabase/config.toml`**: для локального стека задано `[auth.email] enable_confirmations = false`. Подробности — [backend/README.md](backend/README.md).

## Авторизация

Таблицы защищены **RLS** для `authenticated`. Вход — email + пароль через Supabase Auth.

### Если ошибка при входе или регистрации

1. **Подтверждение email** — отключите **Confirm email** для разработки (см. выше).
2. **Пароль** — минимум **6 символов**.
3. **Redirect URLs** — **Authentication** → **URL Configuration**: добавьте `http://localhost:5173` и т.п.
4. **Пользователь уже есть** — «Войти», не повторная регистрация.

### «Сеть» / Failed to fetch

- Запуск через **`npm run dev`**, не `file://`.
- **`.env`** в **`frontend/`**; после правок перезапустите dev-сервер.
- Проверьте VPN, блокировщики, что открывается URL проекта в браузере.

## Структура данных

Таблицы `profiles`, `nutrition_entries`, `workout_entries` в Supabase.

Для **редактирования и удаления** записей в дневниках в RLS нужны **`UPDATE` и `DELETE`** для строк с `user_id = auth.uid()`.
