import { useState, useMemo } from "react";
import { YMInitializer } from 'react-yandex-metrika';
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

const adminPages = [
  ...pages,
  { key: "admin", label: "Админ" }
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

/** Экран входа / регистрации */
function AuthScreen({
  authError,
  setAuthError,
  authInfo,
  setAuthInfo,
  onSignIn,
  onSignUp
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Сброс старых ошибок
    setAuthError("");
    setAuthInfo("");

    // Базовая валидация на фронтенде перед отправкой
    if (!email.includes("@")) {
      setAuthError("Введите корректный email.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Пароль должен быть не менее 6 символов.");
      return;
    }
    if (!isLogin && !displayName.trim()) {
      setAuthError("Пожалуйста, введите ваше имя.");
      return;
    }

    setAuthSubmitting(true);
    try {
      if (isLogin) {
        await onSignIn(email, password);
      } else {
        const success = await onSignUp(email, password, displayName);
        if (success || authInfo) {
          // Цель: Успешная регистрация
          if (window.ym) window.ym(108238508, 'reachGoal', 'registration_success');
        }
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-bold text-slate-900">{isLogin ? "Вход в систему" : "Регистрация"}</h2>
      <p className="mt-1 text-sm text-slate-500 mb-6">
        {isLogin ? "Введите свои данные для входа" : "Создайте аккаунт, чтобы начать"}
      </p>

      {authInfo && (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-100 flex justify-between items-center">
          <span>{authInfo}</span>
          <button onClick={() => setAuthInfo("")} className="font-bold">✕</button>
        </div>
      )}

      <ErrorBanner message={authError} onDismiss={() => setAuthError("")} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <FormField label="Ваше имя">
            <Input
              required
              placeholder="Иван Иванов"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </FormField>
        )}
        <FormField label="Email">
          <Input
            required
            type="email"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField label="Пароль">
          <Input
            required
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        
        <ActionButton type="submit" className="w-full py-2.5 mt-2" disabled={authSubmitting}>
          {authSubmitting ? "Обработка..." : isLogin ? "Войти" : "Зарегистрироваться"}
        </ActionButton>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setAuthError("");
          }}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          {isLogin ? "Нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("profile");
  
  // Состояния для новых записей
  const [newFood, setNewFood] = useState({ name: "", calories: "", mealType: "Перекус", weightG: "" });
  const [newWorkout, setNewWorkout] = useState({ type: "Бег", duration: "", notes: "" });
  const [newWeight, setNewWeight] = useState("");
  const [newGoal, setNewGoal] = useState({ title: "", target: "", unit: "мл" });

  // Ошибки валидации (локальные)
  const [errors, setErrors] = useState({});

  // Состояния редактирования
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [foodDraft, setFoodDraft] = useState({ name: "", calories: "", mealType: "Перекус", weightG: "" });
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [workoutDraft, setWorkoutDraft] = useState({ type: "Бег", duration: "", notes: "" });

  const {
    isSupabaseConfigured,
    user,
    isAdmin,
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
    allProfiles,
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
    refreshAll,
    uploadAvatar
  } = useTrackerData();

  const navPages = isAdmin ? adminPages : pages;

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
      const isNameOk = validate("displayName", profile.displayName, "profile");
      
      // Добавим проверку цифр для Telegram ID прямо здесь для мгновенной реакции
      let isTgOk = true;
      if (profile.telegramChatId && !/^\d+$/.test(profile.telegramChatId)) {
        setErrors(prev => ({ ...prev, "profile.telegramChatId": "Только цифры (узнайте в @userinfobot)" }));
        isTgOk = false;
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next["profile.telegramChatId"];
          return next;
        });
      }

      if (!isNameOk || !isTgOk) return;
      
      const ok = await saveProfile();
      if (ok) setProfile((p) => ({ ...p, isEditing: false }));
    } else {
      setProfile((p) => ({ ...p, isEditing: true }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadAvatar(file);
  };

  const handleAddFood = async () => {
    const isNameOk = validate("name", newFood.name, "food");
    const isCalOk = validate("calories", newFood.calories, "food");
    if (!isNameOk || !isCalOk) return;

    const ok = await addFood(newFood.name, newFood.calories, newFood.mealType, newFood.weightG);
    if (ok) {
      if (window.ym) window.ym(108238508, 'reachGoal', 'add_food_success');
      setNewFood({ name: "", calories: "", mealType: "Перекус", weightG: "" });
    }
  };

  const handleAddWorkout = async () => {
    const isDurOk = validate("duration", newWorkout.duration, "workout");
    if (!isDurOk) return;

    // caloriesBurned defaults to 0, completed to true
    const ok = await addWorkout(newWorkout.type, newWorkout.duration, true, 0, newWorkout.notes);
    if (ok) {
      if (window.ym) window.ym(108238508, 'reachGoal', 'add_workout_success');
      setNewWorkout({ type: "Бег", duration: "", notes: "" });
    } else {
      console.error("Ошибка при добавлении тренировки:", dataError);
    }
  };

  const handleAddWeight = async () => {
    if (!validate("weight", newWeight, "weight")) return;
    const ok = await addWeightLog(newWeight);
    if (ok) setNewWeight("");
  };

  const handleAddGoal = async () => {
    const isTitleOk = validate("title", newGoal.title, "goal");
    const isTargetOk = validate("target", newGoal.target, "goal");
    if (!isTitleOk || !isTargetOk) return;

    const ok = await addGoal(newGoal.title, newGoal.target, newGoal.unit);
    if (ok) {
      setNewGoal({ title: "", target: "", unit: "мл" });
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <main className="mx-auto max-w-4xl">
          <ErrorBanner message="Настройте .env: VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY." />
        </main>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <YMInitializer 
          accounts={[108238508]} 
          options={{ 
            webvisor: true, 
            clickmap: true, 
            trackLinks: true, 
            accurateTrackBounce: true 
          }} 
          version="2" 
        />
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-16">
        <YMInitializer 
          accounts={[108238508]} 
          options={{ 
            webvisor: true, 
            clickmap: true, 
            trackLinks: true, 
            accurateTrackBounce: true 
          }} 
          version="2" 
        />
        <main className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">ТРЕКЕР ЦЕЛЕЙ</h1>
            <p className="text-slate-500 mt-2 font-medium">Ваше здоровье в одной системе</p>
          </div>
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

  return (
    <div className="min-h-screen bg-slate-100">
      <YMInitializer 
        accounts={[12345678]} 
        options={{ 
          webvisor: true, 
          clickmap: true, 
          trackLinks: true, 
          accurateTrackBounce: true 
        }} 
        version="2" 
      />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-200">
              {profile.displayName ? profile.displayName[0].toUpperCase() : "U"}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">ТРЕКЕР ЦЕЛЕЙ</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {profile.displayName ? `Привет, ${profile.displayName}!` : "Добро пожаловать!"}
                {isAdmin && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex bg-white p-1 rounded-xl shadow-sm ring-1 ring-slate-200">
              {navPages.map((p) => (
                <NavButton key={p.key} active={activePage === p.key} onClick={() => setActivePage(p.key)}>
                  {p.label}
                </NavButton>
              ))}
            </nav>
            <ActionButton variant="outline" onClick={signOut} className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200">Выйти</ActionButton>
          </div>
        </header>

        <ErrorBanner
          message={dataError}
          onDismiss={() => setDataError("")}
          onRetry={dataError ? () => refreshAll() : undefined}
        />

        {(isRefreshing || isMutating) && (
          <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            {isMutating && !isRefreshing ? "Сохранение данных..." : "Синхронизация..."}
          </div>
        )}

        {/* ПРОФИЛЬ */}
        {activePage === "profile" && (
          <SectionCard
            title="Параметры здоровья"
            actions={
              <ActionButton onClick={handleProfileAction} disabled={isMutating}>
                {profile.isEditing ? "Сохранить профиль" : "Изменить параметры"}
              </ActionButton>
            }
          >
            {profile.isEditing ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Отображаемое имя" error={errors["profile.displayName"]}>
                  <Input
                    value={profile.displayName}
                    error={errors["profile.displayName"]}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    placeholder="Александр"
                  />
                </FormField>
                <FormField label="Фото профиля (PNG, JPG, PDF до 5МБ)">
                  <div className="flex items-center gap-4">
                    {profile.avatarUrl && (
                      <img 
                        src={profile.avatarUrl} 
                        alt="Avatar" 
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-100" 
                      />
                    )}
                    <input 
                      type="file" 
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={handleFileChange}
                      className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                </FormField>
                <FormField label="Пол">
                  <Select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    options={[{ label: "Мужской", value: "male" }, { label: "Женский", value: "female" }, { label: "Другое", value: "other" }]}
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
                <FormField label="Telegram ID для уведомлений" error={errors["profile.telegramChatId"]}>
                  <Input 
                    value={profile.telegramChatId} 
                    onChange={(e) => setProfile({ ...profile, telegramChatId: e.target.value })} 
                    placeholder="Напр: 123456789"
                  />
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-[10px] text-blue-800 font-bold uppercase mb-1">Как настроить:</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      1. Запустите бота <b>@userinfobot</b> в Telegram.<br/>
                      2. Скопируйте цифровой ID и вставьте выше.<br/>
                      3. <b>Важно:</b> Бот должен быть запущен, иначе уведомления не придут.
                    </p>
                  </div>
                  <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-[10px] text-emerald-800 font-bold uppercase mb-1">Какие уведомления придут:</p>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Вы получите сообщение, когда сумма калорий за день достигнет или превысит вашу цель, установленную в разделе «Питание».
                    </p>
                  </div>
                </FormField>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Ваш рост" value={`${profile.height || "—"} см`} hint="Для расчета ИМТ" />
                <StatCard title="Текущий вес" value={`${profile.weight || "—"} кг`} hint="Обновляется из истории" />
                <StatCard title="Ваш возраст" value={`${profile.age || "—"} лет`} hint="Для обмена веществ" />
                <StatCard title="Пол" value={profile.gender} hint="Физиология" />
                <StatCard 
                  title="Уведомления" 
                  value={profile.telegramChatId ? "Включены" : "Выключены"} 
                  hint={profile.telegramChatId ? `ID: ${profile.telegramChatId}` : "Настройте в режиме редактирования"} 
                />
              </div>
            )}
          </SectionCard>
        )}

        {/* ПИТАНИЕ */}
        {activePage === "nutrition" && (
          <div className="space-y-6">
            <SectionCard 
              title="Добавить продукт"
              actions={
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">Цель:</span>
                  <input 
                    type="number" 
                    value={profile.dailyCalorieGoal} 
                    onChange={(e) => setProfile({ ...profile, dailyCalorieGoal: e.target.value })}
                    onBlur={saveProfile}
                    className="w-16 bg-transparent border-none p-0 text-sm font-black text-emerald-600 focus:ring-0"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">ккал</span>
                </div>
              }
            >
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px] flex-1">
                  <FormField label="Название продукта" error={errors["food.name"]}>
                    <Input value={newFood.name} error={errors["food.name"]} onChange={(e) => setNewFood({ ...newFood, name: e.target.value })} placeholder="Напр: Куриная грудка" />
                  </FormField>
                </div>
                <div className="w-40">
                  <FormField label="Прием пищи">
                    <Select value={newFood.mealType} onChange={(e) => setNewFood({ ...newFood, mealType: e.target.value })} options={mealTypes} />
                  </FormField>
                </div>
                <div className="w-24">
                  <FormField label="Ккал" error={errors["food.calories"]}>
                    <Input type="number" value={newFood.calories} error={errors["food.calories"]} onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })} />
                  </FormField>
                </div>
                <div className="w-24">
                  <FormField label="Грамм">
                    <Input type="number" value={newFood.weightG} onChange={(e) => setNewFood({ ...newFood, weightG: e.target.value })} />
                  </FormField>
                </div>
                <ActionButton onClick={handleAddFood} disabled={isMutating} className="px-6 h-10">Добавить</ActionButton>
              </div>
            </SectionCard>
            <SectionCard title="Сегодняшний рацион">
              <div className="space-y-1">
                {nutrition.length === 0 ? (
                  <EmptyState message="Вы еще ничего не съели сегодня" icon="🍴" />
                ) : (
                  nutrition.map((f) => (
                    <div key={f.id} className="group border-b border-slate-50 py-4 last:border-0 hover:bg-slate-50/50 transition rounded-lg px-2">
                      {editingFoodId === f.id ? (
                        <div className="flex flex-wrap items-end gap-3">
                          <Input className="flex-1" value={foodDraft.name} onChange={(e) => setFoodDraft({ ...foodDraft, name: e.target.value })} />
                          <Select className="w-32" value={foodDraft.mealType} onChange={(e) => setFoodDraft({ ...foodDraft, mealType: e.target.value })} options={mealTypes} />
                          <Input className="w-20" type="number" value={foodDraft.calories} onChange={(e) => setFoodDraft({ ...foodDraft, calories: e.target.value })} />
                          <div className="flex gap-2">
                            <ActionButton onClick={async () => {
                              const ok = await updateFood(f.id, foodDraft.name, foodDraft.calories, foodDraft.mealType, foodDraft.weightG);
                              if (ok) setEditingFoodId(null);
                            }}>Сохранить</ActionButton>
                            <ActionButton variant="outline" onClick={() => setEditingFoodId(null)}>Отмена</ActionButton>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                              {f.meal_type}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{f.name}</p>
                              <p className="text-xs text-slate-500 font-medium">{f.calories} ккал {f.weight_g ? `• ${f.weight_g}г` : ""}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <ActionButton variant="outline" onClick={() => {
                              setEditingFoodId(f.id);
                              setFoodDraft({ name: f.name, calories: f.calories, mealType: f.meal_type, weightG: f.weight_g || "" });
                            }}>Изм.</ActionButton>
                            <ActionButton variant="danger" onClick={() => window.confirm("Удалить запись?") && deleteFood(f.id)}>Уд.</ActionButton>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
                <FormField label="Вид спорта">
                  <Select value={newWorkout.type} onChange={(e) => setNewWorkout({ ...newWorkout, type: e.target.value })} options={workoutTypes} />
                </FormField>
                <FormField label="Длительность (мин)" error={errors["workout.duration"]}>
                  <Input type="number" value={newWorkout.duration} error={errors["workout.duration"]} onChange={(e) => setNewWorkout({ ...newWorkout, duration: e.target.value })} />
                </FormField>
                <ActionButton onClick={handleAddWorkout} disabled={isMutating} className="h-10">Добавить</ActionButton>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormField label="Комментарий">
                    <Input value={newWorkout.notes} onChange={(e) => setNewWorkout({ ...newWorkout, notes: e.target.value })} placeholder="Напр: Сделал 3 подхода по 15" />
                  </FormField>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Сегодняшняя активность">
              <div className="space-y-2">
                {workouts.length === 0 ? (
                  <EmptyState message="Тренировок еще не было" icon="👟" />
                ) : (
                  workouts.map((w) => (
                    <div key={w.id} className="group border-b border-slate-50 py-4 last:border-0 hover:bg-slate-50/50 transition rounded-lg px-2">
                      {editingWorkoutId === w.id ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <Select className="flex-1" value={workoutDraft.type} onChange={(e) => setWorkoutDraft({ ...workoutDraft, type: e.target.value })} options={workoutTypes} />
                            <Input className="w-32" type="number" value={workoutDraft.duration} onChange={(e) => setWorkoutDraft({ ...workoutDraft, duration: e.target.value })} />
                            <div className="flex gap-2">
                              <ActionButton onClick={async () => {
                                const ok = await updateWorkout(w.id, { ...workoutDraft, durationMin: workoutDraft.duration, completed: true, caloriesBurned: 0 });
                                if (ok) setEditingWorkoutId(null);
                              }}>OK</ActionButton>
                              <ActionButton variant="outline" onClick={() => setEditingWorkoutId(null)}>Отмена</ActionButton>
                            </div>
                          </div>
                          <Input placeholder="Заметки" value={workoutDraft.notes} onChange={(e) => setWorkoutDraft({ ...workoutDraft, notes: e.target.value })} />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg bg-emerald-100 text-emerald-600">
                                ✓
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{w.type}</p>
                                <p className="text-xs text-slate-500 font-medium">{w.duration} мин</p>
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                              <ActionButton variant="outline" onClick={() => {
                                setEditingWorkoutId(w.id);
                                setWorkoutDraft({ type: w.type, duration: w.duration, notes: w.notes || "" });
                              }}>Изм.</ActionButton>
                              <ActionButton variant="danger" onClick={() => window.confirm("Удалить запись?") && deleteWorkout(w.id)}>Уд.</ActionButton>
                            </div>
                          </div>
                          {w.notes && <p className="text-xs text-slate-400 italic pl-14">{w.notes}</p>}
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
              <SectionCard title="Баланс калорий сегодня">
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Получено</p>
                      <p className="text-3xl font-black text-slate-900">{totals.caloriesToday} <span className="text-sm font-bold text-slate-400 uppercase">ккал</span></p>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">Сожжено</p>
                      <p className="text-3xl font-black text-slate-900">{totals.caloriesBurnedToday} <span className="text-sm font-bold text-slate-400 uppercase">ккал</span></p>
                    </div>
                  </div>
                  <ProgressBar label="Выполнение дневной нормы" value={totals.caloriesToday} max={calorieGoal} unit="ккал" />
                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Осталось:</span>
                    <span className={`text-xl font-black ${calorieGoal - totals.caloriesToday + totals.caloriesBurnedToday > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {calorieGoal - totals.caloriesToday + totals.caloriesBurnedToday} ккал
                    </span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="История веса">
                <div className="flex gap-2 mb-6">
                  <Input 
                    type="number" 
                    placeholder="Ваш вес в кг" 
                    value={newWeight} 
                    error={errors["weight.weight"]}
                    onChange={(e) => setNewWeight(e.target.value)} 
                  />
                  <ActionButton onClick={handleAddWeight} className="px-6">Записать</ActionButton>
                </div>
                <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                  {weightLogs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10 border border-dashed border-slate-100 rounded-xl">История взвешиваний пуста</p>
                  ) : weightLogs.map(l => (
                    <div key={l.id} className="flex justify-between items-center bg-white border border-slate-50 rounded-xl px-5 py-3 shadow-sm">
                      <span className="text-xs font-bold text-slate-400">{new Date(l.logged_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-900">{l.weight_kg} кг</span>
                        <button className="text-slate-300 hover:text-rose-500 transition text-lg" onClick={() => deleteWeightLog(l.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Личные цели">
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                  <h3 className="text-xs font-black text-slate-400 mb-5 uppercase tracking-widest">Новая цель</h3>
                  <div className="space-y-4">
                    <FormField label="Что трекаем?" error={errors["goal.title"]}>
                      <Input placeholder="Напр: Пить воду" value={newGoal.title} error={errors["goal.title"]} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Сколько?" error={errors["goal.target"]}>
                        <Input type="number" placeholder="2000" value={newGoal.target} error={errors["goal.target"]} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} />
                      </FormField>
                      <FormField label="Ед. изм.">
                        <Select value={newGoal.unit} onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })} options={goalUnits} />
                      </FormField>
                    </div>
                    <ActionButton onClick={handleAddGoal} className="w-full py-3 shadow-md shadow-emerald-100">Создать цель</ActionButton>
                  </div>
                </div>
                
                <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2 auto-rows-min">
                  {goals.length === 0 ? (
                    <div className="sm:col-span-2 flex items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-3xl">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Цели отсутствуют</p>
                    </div>
                  ) : goals.map(g => (
                    <div key={g.id} className="rounded-2xl border border-slate-50 p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">{g.title}</h4>
                        <button className="text-slate-300 hover:text-rose-500 transition" onClick={() => deleteGoal(g.id)}>✕</button>
                      </div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">{g.unit}</span>
                        <span className="text-sm font-black text-slate-900">{g.current_value} / {g.target_value}</span>
                      </div>
                      <div className="flex gap-4 items-center">
                        <input type="range" className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                          min="0" max={g.target_value} value={g.current_value} 
                          onChange={(e) => updateGoal(g.id, { ...g, targetValue: g.target_value, currentValue: e.target.value })} />
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
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

        {/* АДМИН-ПАНЕЛЬ */}
        {activePage === "admin" && isAdmin && (
          <div className="space-y-6">
            <SectionCard title="Все пользователи (Админ)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs font-black uppercase text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Имя</th>
                      <th className="px-4 py-3">Роль</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Обновлен</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allProfiles.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-bold text-slate-900">{p.display_name || "Без имени"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            {p.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{p.id}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(p.updated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}
