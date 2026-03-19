import { useMemo, useState } from "react";
import {
  ActionButton,
  FormField,
  Input,
  NavButton,
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
  const [newFood, setNewFood] = useState({ name: "", calories: 0, protein: 0, fat: 0, carbs: 0 });

  // Состояние тренировок
  const [workouts, setWorkouts] = useState([]);
  const [newWorkout, setNewWorkout] = useState({ type: "", duration: 0, completed: true });

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
    setNewFood({ name: "", calories: 0, protein: 0, fat: 0, carbs: 0 });
  };

  const addWorkout = () => {
    if (!newWorkout.type) return;
    setWorkouts([...workouts, { ...newWorkout, id: Date.now() }]);
    setNewWorkout({ type: "", duration: 0, completed: true });
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
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="sm:col-span-2"><FormField label="Название"><Input value={newFood.name} onChange={(e) => setNewFood({ ...newFood, name: e.target.value })} placeholder="Напр: Курица" /></FormField></div>
                <FormField label="Ккал"><Input type="number" value={newFood.calories} onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })} /></FormField>
                <FormField label="Белки (г)"><Input type="number" value={newFood.protein} onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })} /></FormField>
                <div className="flex items-end"><ActionButton onClick={addFood}>Добавить</ActionButton></div>
              </div>
            </SectionCard>
            <SectionCard title="Сегодняшние записи">
              <div className="space-y-2">
                {nutrition.length === 0 ? <p className="text-sm text-slate-500 italic">Список пуст</p> : nutrition.map((f) => (
                  <div key={f.id} className="flex justify-between border-b border-slate-100 py-2">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-slate-600">{f.calories} ккал / Б:{f.protein}г</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* СТРАНИЦА ТРЕНИРОВОК */}
        {activePage === "workouts" && (
          <div className="space-y-6">
            <SectionCard title="Записать тренировку">
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Тип"><Input value={newWorkout.type} onChange={(e) => setNewWorkout({ ...newWorkout, type: e.target.value })} placeholder="Напр: Бег" /></FormField>
                <FormField label="Мин."><Input type="number" value={newWorkout.duration} onChange={(e) => setNewWorkout({ ...newWorkout, duration: e.target.value })} /></FormField>
                <div className="flex items-end"><ActionButton onClick={addWorkout}>Добавить</ActionButton></div>
              </div>
            </SectionCard>
            <SectionCard title="Завершенные сегодня">
              <div className="space-y-2">
                {workouts.length === 0 ? <p className="text-sm text-slate-500 italic">Тренировок пока нет</p> : workouts.map((w) => (
                  <div key={w.id} className="flex items-center justify-between border-b border-slate-100 py-2">
                    <div>
                      <span className="font-medium">{w.type}</span>
                      <span className="ml-2 text-sm text-slate-500">{w.duration} мин.</span>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Выполнено</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* СТРАНИЦА ПРОГРЕССА */}
        {activePage === "progress" && (
          <SectionCard title="Ваш прогресс сегодня">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard title="Калории сегодня" value={`${totals.caloriesToday} ккал`} hint="Из дневника питания" />
              <StatCard title="Тренировки" value={`${totals.completedWorkouts}`} hint="Завершено сегодня" />
            </div>
            <div className="mt-8 space-y-6">
              <div>
                <div className="mb-2 flex justify-between text-sm font-medium"><span>Потребление калорий</span><span>{totals.caloriesToday} ккал</span></div>
                <div className="h-4 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, (totals.caloriesToday / 2000) * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Цель: 2000 ккал (зависит от веса/роста)</p>
              </div>
            </div>
          </SectionCard>
        )}
      </main>
    </div>
  );
}
