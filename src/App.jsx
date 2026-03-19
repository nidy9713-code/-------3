import { useMemo, useState } from "react";
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

const pages = [
  { key: "profile", label: "Профиль" },
  { key: "nutrition", label: "Питание" },
  { key: "workouts", label: "Тренировки" },
  { key: "progress", label: "Прогресс" }
];

// Основное приложение с управлением состоянием.
export default function App() {
  const [activePage, setActivePage] = useState("profile");

  // Состояние пользователя
  const [profile, setProfile] = useState({
    gender: "Мужской",
    height: 0,
    weight: 0,
    age: 0,
    isEditing: true
  });

  // Состояние питания
  const [nutrition, setNutrition] = useState([]);
  const [newFood, setNewFood] = useState({ name: "", calories: 0 });

  // Состояние тренировок
  const [workouts, setWorkouts] = useState([]);
  const [newWorkout, setNewWorkout] = useState({ type: "Бег", duration: 0, completed: true });

  const workoutTypes = [
    { label: "Бег", value: "Бег" },
    { label: "Силовая", value: "Силовая" },
    { label: "Йога", value: "Йога" },
    { label: "Плавание", value: "Плавание" },
    { label: "Ходьба", value: "Ходьба" },
    { label: "Другое", value: "Другое" }
  ];

  // Расчеты для прогресса
  const totals = useMemo(() => {
    const caloriesToday = nutrition.reduce((sum, f) => sum + Number(f.calories), 0);
    const completedWorkouts = workouts.filter((w) => w.completed).length;
    return { caloriesToday, completedWorkouts };
  }, [nutrition, workouts]);

  // Хендлеры
  const addFood = () => {
    if (!newFood.name) return;
    setNutrition([...nutrition, { ...newFood, id: Date.now() }]);
    setNewFood({ name: "", calories: 0 });
  };

  const addWorkout = () => {
    setWorkouts([...workouts, { ...newWorkout, id: Date.now() }]);
    setNewWorkout({ type: "Бег", duration: 0, completed: true });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Трекер привычек / целей</h1>
            <p className="text-sm text-slate-600">Интерактивный интерфейс V1</p>
          </div>
          <nav className="flex gap-2">
            {pages.map((p) => (
              <NavButton key={p.key} active={activePage === p.key} onClick={() => setActivePage(p.key)}>
                {p.label}
              </NavButton>
            ))}
          </nav>
        </header>

        {/* СТРАНИЦА ПРОФИЛЯ */}
        {activePage === "profile" && (
          <SectionCard
            title="Ваши параметры"
            actions={
              <ActionButton onClick={() => setProfile({ ...profile, isEditing: !profile.isEditing })}>
                {profile.isEditing ? "Сохранить" : "Изменить"}
              </ActionButton>
            }
          >
            {profile.isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Пол">
                  <Select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    options={[{ label: "Мужской", value: "Мужской" }, { label: "Женский", value: "Женский" }]}
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
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Пол" value={profile.gender} hint="Профиль" />
                <StatCard title="Рост" value={`${profile.height} см`} hint="Профиль" />
                <StatCard title="Вес" value={`${profile.weight} кг`} hint="Профиль" />
                <StatCard title="Возраст" value={`${profile.age} лет`} hint="Профиль" />
              </div>
            )}
          </SectionCard>
        )}

        {/* СТРАНИЦА ПИТАНИЯ */}
        {activePage === "nutrition" && (
          <div className="space-y-6">
            <SectionCard title="Добавить еду">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
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
                <ActionButton onClick={addFood}>Добавить</ActionButton>
              </div>
            </SectionCard>
            <SectionCard title="Сегодняшние записи">
              <div className="space-y-2">
                {nutrition.length === 0 ? (
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

        {/* СТРАНИЦА ТРЕНИРОВОК */}
        {activePage === "workouts" && (
          <div className="space-y-6">
            <SectionCard title="Новая тренировка">
              <div className="flex flex-wrap gap-4 items-end">
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
                <ActionButton onClick={addWorkout}>Добавить</ActionButton>
              </div>
            </SectionCard>
            <SectionCard title="Завершенные сегодня">
              <div className="space-y-2">
                {workouts.length === 0 ? (
                  <EmptyState message="Тренировок за сегодня пока не зафиксировано" icon="👟" />
                ) : (
                  workouts.map((w) => (
                    <div key={w.id} className="flex items-center justify-between border-b border-slate-100 py-2">
                      <div>
                        <span className="font-medium">{w.type}</span>
                        <span className="ml-2 text-sm text-slate-500">{w.duration} мин.</span>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        Выполнено
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* СТРАНИЦА ПРОГРЕССА */}
        {activePage === "progress" && (
          <SectionCard title="Ваш прогресс сегодня">
            {nutrition.length === 0 && workouts.length === 0 ? (
              <EmptyState message="Нет данных для расчета прогресса" icon="📊" />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard title="Калории сегодня" value={`${totals.caloriesToday} ккал`} hint="Из дневника питания" />
                  <StatCard title="Тренировки" value={`${totals.completedWorkouts}`} hint="Завершено сегодня" />
                </div>
                <div className="mt-8">
                  <ProgressBar
                    label="Потребление калорий"
                    value={totals.caloriesToday}
                    max={2000}
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
