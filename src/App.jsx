import { useState } from "react";
import {
  ActionButton,
  EmptyState,
  FormField,
  Input,
  NavButton,
  ProgressBar,
  SectionCard,
  Select,
  StatCard
} from "./components";
import { useTrackerData } from "./hooks/useTrackerData";

const pages = [
  { key: "profile", label: "Профиль" },
  { key: "nutrition", label: "Питание" },
  { key: "workouts", label: "Тренировки" },
  { key: "progress", label: "Прогресс" }
];

const workoutTypes = [
  { label: "Бег", value: "Бег" },
  { label: "Силовая", value: "Силовая" },
  { label: "Йога", value: "Йога" },
  { label: "Плавание", value: "Плавание" },
  { label: "Ходьба", value: "Ходьба" },
  { label: "Другое", value: "Другое" }
];

/** Баннер ошибки Supabase / сети */
function ErrorBanner({ message, onDismiss, onRetry }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-start sm:justify-between"
    >
      <span className="min-w-0 flex-1 whitespace-pre-line">{message}</span>
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="font-medium text-rose-800 underline decoration-rose-400"
          >
            Повторить
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="font-medium text-rose-700 underline">
            Закрыть
          </button>
        )}
      </div>
    </div>
  );
}

/** Экран входа: без сессии RLS не отдаст данные */
function AuthScreen({
  authError,
  setAuthError,
  authInfo,
  setAuthInfo,
  onSignIn,
  onSignUp
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">Вход</h2>
      <p className="mt-1 text-sm text-slate-600">Email и пароль (минимум 6 символов).</p>
      {authInfo ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {authInfo}
          <button
            type="button"
            className="ml-2 font-medium text-emerald-800 underline"
            onClick={() => setAuthInfo("")}
          >
            OK
          </button>
        </p>
      ) : null}
      <ErrorBanner message={authError} onDismiss={() => setAuthError("")} />
      <div className="mt-4 space-y-3">
        <FormField label="Email">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField label="Пароль">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton
          onClick={async () => {
            setAuthSubmitting(true);
            try {
              const ok = await onSignIn(email.trim(), password);
              if (ok) setPassword("");
            } finally {
              setAuthSubmitting(false);
            }
          }}
          disabled={authSubmitting}
        >
          {authSubmitting ? "Загрузка..." : "Войти"}
        </ActionButton>
        <ActionButton
          variant="outline"
          onClick={async () => {
            setAuthSubmitting(true);
            try {
              const ok = await onSignUp(email.trim(), password);
              if (ok) setPassword("");
            } finally {
              setAuthSubmitting(false);
            }
          }}
          disabled={authSubmitting}
        >
          Создать аккаунт
        </ActionButton>
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("profile");
  const [newFood, setNewFood] = useState({ name: "", calories: "" });
  const [newWorkout, setNewWorkout] = useState({ type: "Бег", duration: "", completed: true });

  const {
    isSupabaseConfigured,
    user,
    authLoading,
    authError,
    setAuthError,
    authInfo,
    setAuthInfo,
    isRefreshing,
    isMutating,
    dataError,
    setDataError,
    profile,
    setProfile,
    nutrition,
    workouts,
    totals,
    calorieGoal,
    signIn,
    signUp,
    signOut,
    saveProfile,
    addFood,
    addWorkout,
    refreshAll
  } = useTrackerData();

  const handleProfileAction = async () => {
    if (profile.isEditing) {
      const ok = await saveProfile();
      if (ok) setProfile((p) => ({ ...p, isEditing: false }));
    } else {
      setProfile((p) => ({ ...p, isEditing: true }));
    }
  };

  const handleAddFood = async () => {
    if (!newFood.name.trim()) return;
    const ok = await addFood(newFood.name, newFood.calories);
    if (ok) setNewFood({ name: "", calories: "" });
  };

  const handleAddWorkout = async () => {
    const ok = await addWorkout(newWorkout.type, newWorkout.duration, newWorkout.completed);
    if (ok) setNewWorkout({ type: "Бег", duration: "", completed: true });
  };

  // Нет переменных окружения
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <main className="mx-auto max-w-4xl">
          <ErrorBanner
            message="Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY. Скопируйте .env.example в .env и заполните значения из Supabase."
          />
        </main>
      </div>
    );
  }

  // Проверка сессии Auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-100 px-4 text-center text-slate-600">
        <p className="font-medium text-slate-800">Загрузка…</p>
        <p className="max-w-sm text-sm">Проверяем вход. Если экран не меняется долго — проверьте интернет и настройки в файле .env.</p>
      </div>
    );
  }

  // Не вошли — только форма входа
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <main className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-2xl font-bold text-slate-900">Трекер привычек / целей</h1>
          <AuthScreen
            authError={authError}
            setAuthError={setAuthError}
            authInfo={authInfo}
            setAuthInfo={setAuthInfo}
            onSignIn={signIn}
            onSignUp={signUp}
          />
        </main>
      </div>
    );
  }

  const devAutoLogin =
    import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN === "true";

  return (
    <div className="min-h-screen bg-slate-100">
      {devAutoLogin && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          Локальная разработка: включён автовход (<code className="rounded bg-amber-100/80 px-1">VITE_DEV_AUTO_LOGIN</code>
          ). В продакшене эти переменные не используйте.
        </div>
      )}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight text-slate-900">Трекер привычек / целей</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex gap-2">
              {pages.map((p) => (
                <NavButton key={p.key} active={activePage === p.key} onClick={() => setActivePage(p.key)}>
                  {p.label}
                </NavButton>
              ))}
            </nav>
            <ActionButton variant="outline" onClick={() => signOut()}>
              Выйти
            </ActionButton>
          </div>
        </header>

        <ErrorBanner
          message={dataError}
          onDismiss={() => setDataError("")}
          onRetry={dataError ? () => refreshAll() : undefined}
        />

        {(isRefreshing || isMutating) && (
          <p className="mb-4 text-sm font-medium text-slate-500" aria-live="polite">
            {isMutating && !isRefreshing ? "Сохранение…" : "Загрузка данных…"}
          </p>
        )}

        {/* ПРОФИЛЬ */}
        {activePage === "profile" && (
          <SectionCard
            title="Ваши параметры"
            actions={
              <ActionButton onClick={handleProfileAction} disabled={isMutating}>
                {profile.isEditing ? "Сохранить" : "Изменить"}
              </ActionButton>
            }
          >
            {dataError && !isRefreshing ? (
              <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
                Не удалось загрузить профиль: {dataError}
              </p>
            ) : null}
            {profile.isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Пол">
                  <Select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    options={[
                      { label: "Мужской", value: "Мужской" },
                      { label: "Женский", value: "Женский" }
                    ]}
                  />
                </FormField>
                <FormField label="Рост (см)">
                  <Input
                    type="number"
                    value={profile.height}
                    onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                  />
                </FormField>
                <FormField label="Вес (кг)">
                  <Input
                    type="number"
                    value={profile.weight}
                    onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                  />
                </FormField>
                <FormField label="Возраст">
                  <Input
                    type="number"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  />
                </FormField>
                <FormField label="Цель калорий (ккал/день)">
                  <Input
                    type="number"
                    value={profile.dailyCalorieGoal}
                    onChange={(e) =>
                      setProfile({ ...profile, dailyCalorieGoal: e.target.value })
                    }
                  />
                </FormField>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Пол" value={profile.gender} hint="Профиль" />
                <StatCard title="Рост" value={`${profile.height || "—"} см`} hint="Профиль" />
                <StatCard title="Вес" value={`${profile.weight || "—"} кг`} hint="Профиль" />
                <StatCard title="Возраст" value={`${profile.age || "—"} лет`} hint="Профиль" />
                <StatCard
                  title="Цель ккал"
                  value={`${calorieGoal} ккал`}
                  hint="Для прогресса"
                />
              </div>
            )}
          </SectionCard>
        )}

        {/* ПИТАНИЕ */}
        {activePage === "nutrition" && (
          <div className="space-y-6">
            <SectionCard title="Добавить еду">
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px] flex-1">
                  <FormField label="Продукт">
                    <Input
                      value={newFood.name}
                      onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                      placeholder="Напр: Яблоко"
                    />
                  </FormField>
                </div>
                <div className="w-24">
                  <FormField label="Ккал">
                    <Input
                      type="number"
                      value={newFood.calories}
                      onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                    />
                  </FormField>
                </div>
                <ActionButton onClick={handleAddFood} disabled={isMutating}>
                  Добавить
                </ActionButton>
              </div>
            </SectionCard>
            <SectionCard title="Сегодняшние записи">
              <div className="space-y-2">
                {isRefreshing && nutrition.length === 0 ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : dataError && !isRefreshing ? (
                  <EmptyState
                    variant="error"
                    message={`Не удалось загрузить дневник: ${dataError}`}
                    icon="⚠️"
                  />
                ) : nutrition.length === 0 ? (
                  <EmptyState message="Вы еще не добавили ни одного продукта сегодня" icon="🍎" />
                ) : (
                  nutrition.map((f) => (
                    <div key={f.id} className="flex justify-between border-b border-slate-100 py-2">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-slate-600">{f.calories} ккал</span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ТРЕНИРОВКИ */}
        {activePage === "workouts" && (
          <div className="space-y-6">
            <SectionCard title="Новая тренировка">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-40">
                  <FormField label="Тип">
                    <Select
                      value={newWorkout.type}
                      onChange={(e) => setNewWorkout({ ...newWorkout, type: e.target.value })}
                      options={workoutTypes}
                    />
                  </FormField>
                </div>
                <div className="w-24">
                  <FormField label="Мин.">
                    <Input
                      type="number"
                      value={newWorkout.duration}
                      onChange={(e) => setNewWorkout({ ...newWorkout, duration: e.target.value })}
                    />
                  </FormField>
                </div>
                <ActionButton onClick={handleAddWorkout} disabled={isMutating}>
                  Добавить
                </ActionButton>
              </div>
            </SectionCard>
            <SectionCard title="Завершенные сегодня">
              <div className="space-y-2">
                {isRefreshing && workouts.length === 0 ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : dataError && !isRefreshing ? (
                  <EmptyState
                    variant="error"
                    message={`Не удалось загрузить тренировки: ${dataError}`}
                    icon="⚠️"
                  />
                ) : workouts.length === 0 ? (
                  <EmptyState message="Тренировок за сегодня пока не зафиксировано" icon="👟" />
                ) : (
                  workouts.map((w) => (
                    <div key={w.id} className="flex items-center justify-between border-b border-slate-100 py-2">
                      <div>
                        <span className="font-medium">{w.type}</span>
                        <span className="ml-2 text-sm text-slate-500">{w.duration} мин.</span>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        {w.completed ? "Выполнено" : "Пропуск"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ПРОГРЕСС */}
        {activePage === "progress" && (
          <SectionCard title="Ваш прогресс сегодня">
            {isRefreshing && nutrition.length === 0 && workouts.length === 0 ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : dataError && !isRefreshing ? (
              <EmptyState variant="error" message={`Прогресс недоступен: ${dataError}`} icon="⚠️" />
            ) : nutrition.length === 0 && workouts.length === 0 ? (
              <EmptyState message="Нет данных для расчета прогресса" icon="📊" />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard
                    title="Калории сегодня"
                    value={`${totals.caloriesToday} ккал`}
                    hint="Из дневника питания"
                  />
                  <StatCard
                    title="Тренировки"
                    value={`${totals.completedWorkouts}`}
                    hint="Завершено сегодня"
                  />
                </div>
                <div className="mt-8">
                  <ProgressBar
                    label="Потребление калорий"
                    value={totals.caloriesToday}
                    max={calorieGoal}
                    unit="ккал"
                  />
                </div>
              </>
            )}
          </SectionCard>
        )}
      </main>
    </div>
  );
}
