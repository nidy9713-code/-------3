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

const mealTypes = [
  { label: "Завтрак", value: "Завтрак" },
  { label: "Обед", value: "Обед" },
  { label: "Ужин", value: "Ужин" },
  { label: "Перекус", value: "Перекус" }
];

const goalUnits = [
  { label: "мл", value: "мл" },
  { label: "шагов", value: "шагов" },
  { label: "км", value: "км" },
  { label: "мин", value: "мин" },
  { label: "раз", value: "раз" }
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

/** Экран входа */
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
  
  // Состояния для новых записей
  const [newFood, setNewFood] = useState({ name: "", calories: "", mealType: "Перекус", weightG: "" });
  const [newWorkout, setNewWorkout] = useState({ type: "Бег", duration: "", completed: true, caloriesBurned: "", notes: "" });
  const [newWeight, setNewWeight] = useState("");
  const [newGoal, setNewGoal] = useState({ title: "", target: "", unit: "мл" });

  // Ошибки валидации (локальные)
  const [errors, setErrors] = useState({});

  // Состояния редактирования
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [foodDraft, setFoodDraft] = useState({ name: "", calories: "", mealType: "Перекус", weightG: "" });
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [workoutDraft, setWorkoutDraft] = useState({ type: "Бег", duration: "", completed: true, caloriesBurned: "", notes: "" });

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
    weightLogs,
    goals,
    totals,
    calorieGoal,
    signIn,
    signUp,
    signOut,
    saveProfile,
    addFood,
    updateFood,
    deleteFood,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    addWeightLog,
    deleteWeightLog,
    addGoal,
    updateGoal,
    deleteGoal,
    refreshAll
  } = useTrackerData();

  const validate = (field, value, group) => {
    const key = group ? `${group}.${field}` : field;
    if (!value || (typeof value === "string" && !value.trim())) {
      setErrors(prev => ({ ...prev, [key]: "Заполните поле" }));
      return false;
    }
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    return true;
  };

  const handleProfileAction = async () => {
    if (profile.isEditing) {
      if (!validate("displayName", profile.displayName, "profile")) return;
      const ok = await saveProfile();
      if (ok) setProfile((p) => ({ ...p, isEditing: false }));
    } else {
      setProfile((p) => ({ ...p, isEditing: true }));
    }
  };

  const handleAddFood = async () => {
    const isNameOk = validate("name", newFood.name, "food");
    const isCalOk = validate("calories", newFood.calories, "food");
    if (!isNameOk || !isCalOk) return;

    const ok = await addFood(newFood.name, newFood.calories, newFood.mealType, newFood.weightG);
    if (ok) {
      setNewFood({ name: "", calories: "", mealType: "Перекус", weightG: "" });
      setErrors(prev => {
        const next = { ...prev };
        delete next["food.name"];
        delete next["food.calories"];
        return next;
      });
    }
  };

  const handleAddWorkout = async () => {
    const isDurOk = validate("duration", newWorkout.duration, "workout");
    if (!isDurOk) return;

    const ok = await addWorkout(newWorkout.type, newWorkout.duration, newWorkout.completed, newWorkout.caloriesBurned, newWorkout.notes);
    if (ok) {
      setNewWorkout({ type: "Бег", duration: "", completed: true, caloriesBurned: "", notes: "" });
      setErrors(prev => {
        const next = { ...prev };
        delete next["workout.duration"];
        return next;
      });
    }
  };

  const handleAddWeight = async () => {
    if (!validate("weight", newWeight, "weight")) return;
    const ok = await addWeightLog(newWeight);
    if (ok) {
      setNewWeight("");
      setErrors(prev => {
        const next = { ...prev };
        delete next["weight.weight"];
        return next;
      });
    }
  };

  const handleAddGoal = async () => {
    const isTitleOk = validate("title", newGoal.title, "goal");
    const isTargetOk = validate("target", newGoal.target, "goal");
    if (!isTitleOk || !isTargetOk) return;

    const ok = await addGoal(newGoal.title, newGoal.target, newGoal.unit);
    if (ok) {
      setNewGoal({ title: "", target: "", unit: "мл" });
      setErrors(prev => {
        const next = { ...prev };
        delete next["goal.title"];
        delete next["goal.target"];
        return next;
      });
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <main className="mx-auto max-w-4xl">
          <ErrorBanner
            message="Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY во frontend/.env."
          />
        </main>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-100 px-4 text-center text-slate-600">
        <p className="font-medium text-slate-800">Загрузка…</p>
        <p className="max-w-sm text-sm">Проверяем вход. Если экран не меняется долго — проверьте интернет и настройки в файле .env.</p>
      </div>
    );
  }

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

  const devAutoLogin = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN === "true";

  return (
    <div className="min-h-screen bg-slate-100">
      {devAutoLogin && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          Локальная разработка: автовход активен.
        </div>
      )}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile.avatarUrl && (
              <img src={profile.avatarUrl} alt="Avatar" className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500" />
            )}
            <div>
              <h1 className="text-2xl font-bold leading-tight text-slate-900">Трекер привычек / целей</h1>
              {profile.displayName && <p className="text-sm text-slate-600 font-medium">Привет, {profile.displayName}!</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex gap-2">
              {pages.map((p) => (
                <NavButton key={p.key} active={activePage === p.key} onClick={() => setActivePage(p.key)}>
                  {p.label}
                </NavButton>
              ))}
            </nav>
            <ActionButton variant="outline" onClick={() => signOut()}>Выйти</ActionButton>
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
              <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                Не удалось загрузить профиль: {dataError}
              </p>
            ) : null}
            {profile.isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Имя" error={errors["profile.displayName"]}>
                  <Input
                    value={profile.displayName}
                    error={errors["profile.displayName"]}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    placeholder="Как к вам обращаться?"
                  />
                </FormField>
                <FormField label="Пол">
                  <Select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    options={[{ label: "Мужской", value: "Мужской" }, { label: "Женский", value: "Женский" }]}
                  />
                </FormField>
                <FormField label="Рост (см)">
                  <Input type="number" value={profile.height} onChange={(e) => setProfile({ ...profile, height: e.target.value })} />
                </FormField>
                <FormField label="Вес (кг)">
                  <Input type="number" value={profile.weight} onChange={(e) => setProfile({ ...profile, weight: e.target.value })} />
                </FormField>
                <FormField label="Возраст">
                  <Input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} />
                </FormField>
                <FormField label="Цель калорий">
                  <Input type="number" value={profile.dailyCalorieGoal} onChange={(e) => setProfile({ ...profile, dailyCalorieGoal: e.target.value })} />
                </FormField>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Имя" value={profile.displayName || "Не указано"} hint="Профиль" />
                <StatCard title="Пол" value={profile.gender} hint="Профиль" />
                <StatCard title="Рост" value={`${profile.height || "—"} см`} hint="Профиль" />
                <StatCard title="Вес" value={`${profile.weight || "—"} кг`} hint="Профиль" />
                <StatCard title="Возраст" value={`${profile.age || "—"} лет`} hint="Профиль" />
                <StatCard title="Цель ккал" value={`${calorieGoal} ккал`} hint="Для прогресса" />
              </div>
            )}
          </SectionCard>
        )}

        {/* ПИТАНИЕ */}
        {activePage === "nutrition" && (
          <div className="space-y-6">
            <SectionCard title="Добавить еду">
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[160px] flex-1">
                  <FormField label="Продукт" error={errors["food.name"]}>
                    <Input value={newFood.name} error={errors["food.name"]} onChange={(e) => setNewFood({ ...newFood, name: e.target.value })} placeholder="Напр: Яблоко" />
                  </FormField>
                </div>
                <div className="w-32">
                  <FormField label="Тип">
                    <Select value={newFood.mealType} onChange={(e) => setNewFood({ ...newFood, mealType: e.target.value })} options={mealTypes} />
                  </FormField>
                </div>
                <div className="w-20">
                  <FormField label="Ккал" error={errors["food.calories"]}>
                    <Input type="number" value={newFood.calories} error={errors["food.calories"]} onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })} />
                  </FormField>
                </div>
                <div className="w-20">
                  <FormField label="Вес (г)">
                    <Input type="number" value={newFood.weightG} onChange={(e) => setNewFood({ ...newFood, weightG: e.target.value })} />
                  </FormField>
                </div>
                <ActionButton onClick={handleAddFood} disabled={isMutating}>Добавить</ActionButton>
              </div>
            </SectionCard>
            <SectionCard title="Записи за сегодня">
              <div className="space-y-2">
                {isRefreshing && nutrition.length === 0 ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : nutrition.length === 0 ? (
                  <EmptyState message="Вы еще не добавили ни одного продукта сегодня" icon="🍎" />
                ) : (
                  nutrition.map((f) => (
                    <div key={f.id} className="border-b border-slate-100 py-3">
                      {editingFoodId === f.id ? (
                        <div className="flex flex-wrap items-end gap-3">
                          <Input className="flex-1" value={foodDraft.name} onChange={(e) => setFoodDraft({ ...foodDraft, name: e.target.value })} />
                          <Select className="w-32" value={foodDraft.mealType} onChange={(e) => setFoodDraft({ ...foodDraft, mealType: e.target.value })} options={mealTypes} />
                          <Input className="w-20" type="number" value={foodDraft.calories} onChange={(e) => setFoodDraft({ ...foodDraft, calories: e.target.value })} />
                          <Input className="w-20" type="number" placeholder="г" value={foodDraft.weightG} onChange={(e) => setFoodDraft({ ...foodDraft, weightG: e.target.value })} />
                          <div className="flex gap-2">
                            <ActionButton onClick={async () => {
                              const ok = await updateFood(f.id, foodDraft.name, foodDraft.calories, foodDraft.mealType, foodDraft.weightG);
                              if (ok) setEditingFoodId(null);
                            }}>ОК</ActionButton>
                            <ActionButton variant="outline" onClick={() => setEditingFoodId(null)}>Отмена</ActionButton>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mr-2">{f.meal_type}</span>
                            <span className="font-medium text-slate-900">{f.name}</span>
                            <span className="ml-2 text-slate-600">{f.calories} ккал {f.weight_g ? `(${f.weight_g}г)` : ""}</span>
                          </div>
                          <div className="flex gap-2">
                            <ActionButton variant="outline" onClick={() => {
                              setEditingFoodId(f.id);
                              setFoodDraft({ name: f.name, calories: f.calories, mealType: f.meal_type, weightG: f.weight_g || "" });
                            }}>Правка</ActionButton>
                            <ActionButton variant="danger" onClick={() => window.confirm("Удалить?") && deleteFood(f.id)}>Удалить</ActionButton>
                          </div>
                        </div>
                      )}
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
                <FormField label="Тип">
                  <Select value={newWorkout.type} onChange={(e) => setNewWorkout({ ...newWorkout, type: e.target.value })} options={workoutTypes} />
                </FormField>
                <FormField label="Мин." error={errors["workout.duration"]}>
                  <Input type="number" value={newWorkout.duration} error={errors["workout.duration"]} onChange={(e) => setNewWorkout({ ...newWorkout, duration: e.target.value })} />
                </FormField>
                <FormField label="Сж. ккал">
                  <Input type="number" value={newWorkout.caloriesBurned} onChange={(e) => setNewWorkout({ ...newWorkout, caloriesBurned: e.target.value })} />
                </FormField>
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={newWorkout.completed} onChange={(e) => setNewWorkout({ ...newWorkout, completed: e.target.checked })} />
                    Готово
                  </label>
                  <ActionButton onClick={handleAddWorkout} disabled={isMutating}>Добавить</ActionButton>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <FormField label="Заметки">
                    <Input value={newWorkout.notes} onChange={(e) => setNewWorkout({ ...newWorkout, notes: e.target.value })} placeholder="Напр: Легкий бег в парке" />
                  </FormField>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Тренировки за сегодня">
              <div className="space-y-2">
                {isRefreshing && workouts.length === 0 ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : workouts.length === 0 ? (
                  <EmptyState message="Тренировок пока нет" icon="👟" />
                ) : (
                  workouts.map((w) => (
                    <div key={w.id} className="border-b border-slate-100 py-3">
                      {editingWorkoutId === w.id ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <Select className="w-40" value={workoutDraft.type} onChange={(e) => setWorkoutDraft({ ...workoutDraft, type: e.target.value })} options={workoutTypes} />
                            <Input className="w-20" type="number" value={workoutDraft.duration} onChange={(e) => setWorkoutDraft({ ...workoutDraft, duration: e.target.value })} />
                            <Input className="w-20" type="number" value={workoutDraft.caloriesBurned} onChange={(e) => setWorkoutDraft({ ...workoutDraft, caloriesBurned: e.target.value })} />
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" checked={workoutDraft.completed} onChange={(e) => setWorkoutDraft({ ...workoutDraft, completed: e.target.checked })} />
                              Готово
                            </label>
                            <div className="flex gap-2">
                              <ActionButton onClick={async () => {
                                const ok = await updateWorkout(w.id, { ...workoutDraft, durationMin: workoutDraft.duration });
                                if (ok) setEditingWorkoutId(null);
                              }}>ОК</ActionButton>
                              <ActionButton variant="outline" onClick={() => setEditingWorkoutId(null)}>Отмена</ActionButton>
                            </div>
                          </div>
                          <Input placeholder="Заметки" value={workoutDraft.notes} onChange={(e) => setWorkoutDraft({ ...workoutDraft, notes: e.target.value })} />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`h-2 w-2 rounded-full ${w.completed ? "bg-emerald-500" : "bg-slate-300"}`} />
                              <span className="font-medium">{w.type}</span>
                              <span className="text-sm text-slate-500">{w.duration} мин {w.calories_burned ? `(-${w.calories_burned} ккал)` : ""}</span>
                            </div>
                            <div className="flex gap-2">
                              <ActionButton variant="outline" onClick={() => {
                                setEditingWorkoutId(w.id);
                                setWorkoutDraft({ type: w.type, duration: w.duration, completed: w.completed, caloriesBurned: w.calories_burned || "", notes: w.notes || "" });
                              }}>Правка</ActionButton>
                              <ActionButton variant="danger" onClick={() => window.confirm("Удалить?") && deleteWorkout(w.id)}>Удалить</ActionButton>
                            </div>
                          </div>
                          {w.notes && <p className="text-xs text-slate-400 italic pl-5">{w.notes}</p>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ПРОГРЕСС */}
        {activePage === "progress" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <SectionCard title="Баланс калорий за сегодня">
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Получено</p>
                      <p className="text-2xl font-black text-emerald-900">{totals.caloriesToday} <span className="text-sm font-normal">ккал</span></p>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-4 border border-rose-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">Сожжено</p>
                      <p className="text-2xl font-black text-rose-900">{totals.caloriesBurnedToday} <span className="text-sm font-normal">ккал</span></p>
                    </div>
                  </div>
                  <ProgressBar label="Прогресс цели" value={totals.caloriesToday} max={calorieGoal} unit="ккал" />
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Остаток на день:</span>
                    <span className={`text-lg font-bold ${calorieGoal - totals.caloriesToday + totals.caloriesBurnedToday > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {calorieGoal - totals.caloriesToday + totals.caloriesBurnedToday} ккал
                    </span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="История веса">
                <div className="flex gap-2 mb-4">
                  <Input 
                    type="number" 
                    placeholder="Вес (кг)" 
                    value={newWeight} 
                    error={errors["weight.weight"]}
                    onChange={(e) => setNewWeight(e.target.value)} 
                  />
                  <ActionButton onClick={handleAddWeight}>Записать</ActionButton>
                </div>
                <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
                  {weightLogs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">История пуста</p>
                  ) : weightLogs.map(l => (
                    <div key={l.id} className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-2 border-l-4 border-emerald-500">
                      <span className="text-xs font-medium text-slate-500">{new Date(l.logged_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">{l.weight_kg} кг</span>
                        <button className="text-slate-300 hover:text-rose-500 transition" onClick={() => deleteWeightLog(l.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Мои цели">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-tight">Новая цель</h3>
                  <div className="space-y-3">
                    <FormField label="Название" error={errors["goal.title"]}>
                      <Input placeholder="Напр: Вода" value={newGoal.title} error={errors["goal.title"]} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Цель" error={errors["goal.target"]}>
                        <Input type="number" placeholder="0" value={newGoal.target} error={errors["goal.target"]} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} />
                      </FormField>
                      <FormField label="Ед. изм.">
                        <Select value={newGoal.unit} onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })} options={goalUnits} />
                      </FormField>
                    </div>
                    <ActionButton onClick={handleAddGoal} className="w-full py-2">Добавить цель</ActionButton>
                  </div>
                </div>
                
                <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2 auto-rows-min">
                  {goals.length === 0 ? (
                    <div className="sm:col-span-2 flex items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-sm text-slate-400">У вас пока нет активных целей</p>
                    </div>
                  ) : goals.map(g => (
                    <div key={g.id} className="rounded-xl border border-slate-100 p-4 bg-white shadow-sm hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 leading-tight">{g.title}</h4>
                        <button className="text-slate-300 hover:text-rose-500" onClick={() => deleteGoal(g.id)}>✕</button>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{g.current_value} / {g.target_value} {g.unit}</p>
                      <div className="flex gap-2 items-center">
                        <input type="range" className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" 
                          min="0" max={g.target_value} value={g.current_value} 
                          onChange={(e) => updateGoal(g.id, { ...g, targetValue: g.target_value, currentValue: e.target.value })} />
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {Math.round((g.current_value / g.target_value) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}
