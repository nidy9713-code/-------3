import { useCallback, useEffect, useMemo, useState } from "react";
import { humanizeDataError, translateAuthError } from "../lib/supabaseErrors";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

/** Границы «сегодня» в локальной таймзоне для фильтра logged_at. */
function getTodayRangeIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * Сессия, профиль, дневники и запросы к Supabase.
 * RLS в БД требует вошедшего пользователя (authenticated).
 */
export function useTrackerData() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  /** Информация после регистрации (например, подтвердите email) — не ошибка */
  const [authInfo, setAuthInfo] = useState("");

  /** Первая загрузка / обновление списков — не блокирует кнопки «Сохранить» / «Добавить» */
  const [isRefreshing, setIsRefreshing] = useState(false);
  /** Сохранение профиля или добавление записи */
  const [isMutating, setIsMutating] = useState(false);
  const [dataError, setDataError] = useState("");

  const [profile, setProfile] = useState({
    displayName: "",
    avatarUrl: "",
    gender: "Мужской",
    height: "",
    weight: "",
    age: "",
    dailyCalorieGoal: 2000,
    isEditing: true
  });

  const [nutrition, setNutrition] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [goals, setGoals] = useState([]);

  const user = session?.user ?? null;

  // Подписка на сессию Auth + опциональный автовход только в dev (см. .env.example)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!cancelled) setSession(s ?? null);
    });

    (async () => {
      try {
        const { data: { session: initial }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) setAuthError(translateAuthError(error));

        let s = initial ?? null;

        // Локальная разработка: без ручного входа (нужен реальный пользователь из-за RLS)
        if (
          !s &&
          import.meta.env.DEV &&
          import.meta.env.VITE_DEV_AUTO_LOGIN === "true"
        ) {
          const devEmail = (import.meta.env.VITE_DEV_AUTO_LOGIN_EMAIL ?? "").trim();
          const devPassword = import.meta.env.VITE_DEV_AUTO_LOGIN_PASSWORD ?? "";
          if (devEmail && devPassword) {
            const { data: signData, error: signErr } =
              await supabase.auth.signInWithPassword({
                email: devEmail,
                password: devPassword
              });
            if (cancelled) return;
            if (signErr) {
              setAuthError(`Автовход: ${translateAuthError(signErr)}`);
            } else {
              s = signData.session ?? null;
            }
          } else {
            setAuthError(
              "В .env задайте VITE_DEV_AUTO_LOGIN_EMAIL и VITE_DEV_AUTO_LOGIN_PASSWORD."
            );
          }
        }

        if (!cancelled) setSession(s);
      } catch (e) {
        if (!cancelled) {
          setAuthError(translateAuthError(e));
          setSession(null);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(async (uid) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name,avatar_url,gender,height_cm,weight_kg,age,daily_calorie_goal")
      .eq("id", uid)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { error: insErr } = await supabase.from("profiles").insert({ id: uid });
      if (insErr) throw insErr;
      const { data: created, error: fetchErr } = await supabase
        .from("profiles")
        .select("display_name,avatar_url,gender,height_cm,weight_kg,age,daily_calorie_goal")
        .eq("id", uid)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!created) return;
      setProfile((p) => ({
        ...p,
        displayName: created.display_name ?? "",
        avatarUrl: created.avatar_url ?? "",
        gender: created.gender ?? "Мужской",
        height: created.height_cm != null ? String(created.height_cm) : "",
        weight: created.weight_kg != null ? String(created.weight_kg) : "",
        age: created.age != null ? String(created.age) : "",
        dailyCalorieGoal: created.daily_calorie_goal ?? 2000
      }));
      return;
    }

    setProfile((p) => ({
      ...p,
      displayName: data.display_name ?? "",
      avatarUrl: data.avatar_url ?? "",
      gender: data.gender ?? "Мужской",
      height: data.height_cm != null ? String(data.height_cm) : "",
      weight: data.weight_kg != null ? String(data.weight_kg) : "",
      age: data.age != null ? String(data.age) : "",
      dailyCalorieGoal: data.daily_calorie_goal ?? 2000
    }));
  }, []);

  const loadNutritionToday = useCallback(async (uid) => {
    if (!supabase) return;
    const { startIso, endIso } = getTodayRangeIso();
    const { data, error } = await supabase
      .from("nutrition_entries")
      .select("id,name,calories,meal_type,weight_g,logged_at")
      .eq("user_id", uid)
      .gte("logged_at", startIso)
      .lte("logged_at", endIso)
      .order("logged_at", { ascending: false });

    if (error) throw error;
    setNutrition(data ?? []);
  }, []);

  const loadWorkoutsToday = useCallback(async (uid) => {
    if (!supabase) return;
    const { startIso, endIso } = getTodayRangeIso();
    const { data, error } = await supabase
      .from("workout_entries")
      .select("id,type,duration_min,calories_burned,completed,notes,logged_at")
      .eq("user_id", uid)
      .gte("logged_at", startIso)
      .lte("logged_at", endIso)
      .order("logged_at", { ascending: false });

    if (error) throw error;
    setWorkouts(
      (data ?? []).map((w) => ({
        ...w,
        duration: w.duration_min,
        caloriesBurned: w.calories_burned
      }))
    );
  }, []);

  const loadWeightLogs = useCallback(async (uid) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("weight_logs")
      .select("id,weight_kg,logged_at")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    setWeightLogs(data ?? []);
  }, []);

  const loadGoals = useCallback(async (uid) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("goals")
      .select("id,title,target_value,current_value,unit,deadline,completed")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setGoals(data ?? []);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    setDataError("");
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadProfile(user.id),
        loadNutritionToday(user.id),
        loadWorkoutsToday(user.id),
        loadWeightLogs(user.id),
        loadGoals(user.id)
      ]);
    } catch (e) {
      setDataError(humanizeDataError(e));
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, loadProfile, loadNutritionToday, loadWorkoutsToday, loadWeightLogs, loadGoals]);

  useEffect(() => {
    if (!user?.id) {
      setNutrition([]);
      setWorkouts([]);
      setWeightLogs([]);
      setGoals([]);
      return;
    }
    refreshAll();
  }, [user?.id, refreshAll]);

  const signIn = async (email, password) => {
    if (!supabase) return false;
    setAuthError("");
    setAuthInfo("");
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setAuthError("Введите email и пароль.");
      return false;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password
    });
    if (error) setAuthError(translateAuthError(error));
    return !error;
  };

  const signUp = async (email, password) => {
    if (!supabase) return false;
    setAuthError("");
    setAuthInfo("");
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setAuthError("Введите email и пароль.");
      return false;
    }
    if (password.length < 6) {
      setAuthError("Пароль не короче 6 символов.");
      return false;
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined
    });

    if (error) {
      setAuthError(translateAuthError(error));
      return false;
    }

    // Подтверждение email включено: сессии нет, пользователь не «внутри» приложения
    if (data.user && !data.session) {
      setAuthInfo("Откройте письмо и подтвердите email, затем нажмите «Войти».");
      return false;
    }

    return Boolean(data.session);
  };

  const signOut = async () => {
    setAuthError("");
    setAuthInfo("");
    if (supabase) await supabase.auth.signOut();
  };

  const saveProfile = async () => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const row = {
        id: user.id,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        gender: profile.gender,
        height_cm: profile.height === "" ? null : Number(profile.height),
        weight_kg: profile.weight === "" ? null : Number(profile.weight),
        age: profile.age === "" ? null : Number(profile.age),
        daily_calorie_goal: profile.dailyCalorieGoal
          ? Number(profile.dailyCalorieGoal)
          : null
      };

      const { error } = await supabase.from("profiles").upsert(row, {
        onConflict: "id"
      });

      if (error) throw error;
      await loadProfile(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const addFood = async (name, calories, mealType = "Перекус", weightG = null) => {
    if (!supabase || !user?.id || !name) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase.from("nutrition_entries").insert({
        user_id: user.id,
        name: name.trim(),
        calories: Number(calories) || 0,
        meal_type: mealType,
        weight_g: weightG ? Number(weightG) : null,
        logged_at: new Date().toISOString()
      });
      if (error) throw error;
      await loadNutritionToday(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const updateFood = async (entryId, name, calories, mealType, weightG) => {
    if (!supabase || !user?.id || !name?.trim()) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from("nutrition_entries")
        .update({
          name: name.trim(),
          calories: Number(calories) || 0,
          meal_type: mealType,
          weight_g: weightG ? Number(weightG) : null
        })
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (error) throw error;
      await loadNutritionToday(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteFood = async (entryId) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from("nutrition_entries")
        .delete()
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (error) throw error;
      await loadNutritionToday(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const addWorkout = async (type, durationMin, completed, caloriesBurned = 0, notes = "") => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase.from("workout_entries").insert({
        user_id: user.id,
        type,
        duration_min: Number(durationMin) || 0,
        calories_burned: Number(caloriesBurned) || 0,
        completed: Boolean(completed),
        notes: notes.trim(),
        logged_at: new Date().toISOString()
      });
      if (error) throw error;
      await loadWorkoutsToday(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const updateWorkout = async (entryId, { type, durationMin, completed, caloriesBurned, notes }) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from("workout_entries")
        .update({
          type,
          duration_min: Number(durationMin) || 0,
          calories_burned: Number(caloriesBurned) || 0,
          completed: Boolean(completed),
          notes: notes?.trim()
        })
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (error) throw error;
      await loadWorkoutsToday(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteWorkout = async (entryId) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from("workout_entries")
        .delete()
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (error) throw error;
      await loadWorkoutsToday(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const addWeightLog = async (weightKg) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase.from("weight_logs").insert({
        user_id: user.id,
        weight_kg: Number(weightKg),
        logged_at: new Date().toISOString()
      });
      if (error) throw error;
      // Также обновим текущий вес в профиле для удобства
      await supabase.from("profiles").update({ weight_kg: Number(weightKg) }).eq("id", user.id);
      await Promise.all([loadWeightLogs(user.id), loadProfile(user.id)]);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteWeightLog = async (id) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      await loadWeightLogs(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const addGoal = async (title, targetValue, unit, deadline) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title: title.trim(),
        target_value: Number(targetValue),
        unit,
        deadline: deadline || null
      });
      if (error) throw error;
      await loadGoals(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const updateGoal = async (id, { title, targetValue, currentValue, unit, deadline, completed }) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from("goals")
        .update({
          title,
          target_value: Number(targetValue),
          current_value: Number(currentValue),
          unit,
          deadline,
          completed
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      await loadGoals(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteGoal = async (id) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      await loadGoals(user.id);
      return true;
    } catch (e) {
      setDataError(humanizeDataError(e));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const totals = useMemo(() => {
    const caloriesToday = nutrition.reduce((sum, f) => sum + Number(f.calories), 0);
    const caloriesBurnedToday = workouts.filter(w => w.completed).reduce((sum, w) => sum + Number(w.caloriesBurned || 0), 0);
    const completedWorkouts = workouts.filter((w) => w.completed).length;
    return { caloriesToday, caloriesBurnedToday, completedWorkouts };
  }, [nutrition, workouts]);

  const calorieGoal = Number(profile.dailyCalorieGoal) || 2000;

  return {
    isSupabaseConfigured,
    user,
    session,
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
  };
}
