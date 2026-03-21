import { z } from "zod";

/**
 * Глобальная валидация ID
 */
export const idSchema = z.string().uuid({ message: "Некорректный формат ID" });

/**
 * 🔐 АУТЕНТИФИКАЦИЯ
 */

export const registerSchema = z.object({
  email: z.string().email({ message: "Некорректный формат email" }),
  password: z.string().min(6, { message: "Минимум 6 символов" }).max(8, { message: "Максимум 8 символов" }),
  name: z.string().min(2, { message: "Минимум 2 символа" }).max(50, { message: "Максимум 50 символов" }),
});

export const loginSchema = z.object({
  email: z.string().email({ message: "Некорректный формат email" }),
  password: z.string().min(1, { message: "Введите пароль" }),
});

/**
 * 👤 ПОЛЬЗОВАТЕЛЬ / ПРОФИЛЬ
 */

export const profileUpdateSchema = z.object({
  display_name: z.string().min(2).max(50).optional(),
  weight_kg: z.number().positive({ message: "Вес должен быть больше 0" }).optional().nullable(),
  height_cm: z.number().positive({ message: "Рост должен быть больше 0" }).optional().nullable(),
  age: z.number().min(0).max(120, { message: "Возраст от 0 до 120" }).optional().nullable(),
  gender: z.enum(["male", "female", "other"], { message: "Выберите пол" }).optional(),
});

/**
 * ✅ ПРИВЫЧКИ (Habits) - пока в БД это Goals
 */

export const goalSchema = z.object({
  title: z.string().min(1, "Название обязательно").max(100, "Максимум 100 символов"),
  unit: z.string().optional(),
  target_value: z.number().positive("Цель должна быть больше 0"),
  current_value: z.number().min(0).optional(),
});

/**
 * 🍎 ПИТАНИЕ
 */

export const nutritionSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  calories: z.number().min(0, "Калории не могут быть отрицательными"),
  meal_type: z.string().optional(),
  weight_g: z.number().min(0).optional().nullable(),
  logged_at: z.string().datetime().optional(), // ISO date
});

/**
 * 🏋️ ТРЕНИРОВКИ
 */

export const workoutSchema = z.object({
  type: z.string().min(1, "Тип обязателен"),
  duration_min: z.number().positive("Длительность должна быть больше 0"),
  calories_burned: z.number().min(0).optional(),
  completed: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
  logged_at: z.string().datetime().optional(),
});

/**
 * 📈 ПРОГРЕСС (Weight logs)
 */

export const weightLogSchema = z.object({
  weight_kg: z.number().positive("Вес должен быть больше 0"),
  logged_at: z.string().datetime().optional(),
});

/**
 * 🛠 АДМИНИСТРАТОР
 */

export const adminUserUpdateSchema = z.object({
  role: z.enum(["user", "admin"]),
  // isBlocked: z.boolean().optional(), // В нашей схеме пока нет блокировки, но добавим если надо
});

/**
 * Хелпер для форматирования ошибок Zod в JSON с понятными сообщениями
 */
export function formatZodError(error) {
  const errors = {};
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });
  return {
    success: false,
    message: "Ошибка валидации",
    errors
  };
}
