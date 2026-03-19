// Моковые данные для V1: имитируют данные, которые в будущем придут с API.
export const userProfile = {
  name: "Алексей",
  gender: "Мужской",
  heightCm: 182,
  weightKg: 84,
  age: 29
};

export const nutritionLog = [
  { id: 1, meal: "Завтрак", item: "Овсянка + банан", calories: 420, protein: 14, carbs: 71, fat: 9 },
  { id: 2, meal: "Обед", item: "Курица с рисом", calories: 650, protein: 46, carbs: 63, fat: 18 },
  { id: 3, meal: "Ужин", item: "Творог + ягоды", calories: 310, protein: 31, carbs: 22, fat: 9 }
];

export const workoutLog = [
  { id: 1, date: "Пн", type: "Силовая", durationMin: 55, completed: true },
  { id: 2, date: "Ср", type: "Кардио", durationMin: 35, completed: true },
  { id: 3, date: "Пт", type: "Силовая", durationMin: 60, completed: false },
  { id: 4, date: "Сб", type: "Растяжка", durationMin: 25, completed: true }
];

export const progressData = {
  calorieGoal: 2200,
  caloriesToday: nutritionLog.reduce((sum, item) => sum + item.calories, 0),
  workoutPlanPerWeek: 4,
  workoutCompleted: workoutLog.filter((item) => item.completed).length,
  dailyCalorieMatchDays: 5,
  totalTrackedDays: 7
};
