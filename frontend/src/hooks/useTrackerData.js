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
    gender: "Мужской",
    height: "",
    weight: "",
    age: "",
    dailyCalorieGoal: 2000,
    isEditing: true
  });

  const [nutrition, setNutrition] = useState([]);
  const [workouts, setWorkouts] = useState([]);

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
      .select("gender,height_cm,weight_kg,age,daily_calorie_goal")
      .eq("id", uid)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { error: insErr } = await supabase.from("profiles").insert({ id: uid });
      if (insErr) throw insErr;
      const { data: created, error: fetchErr } = await supabase
        .from("profiles")
        .select("gender,height_cm,weight_kg,age,daily_calorie_goal")
        .eq("id", uid)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!created) return;
      setProfile((p) => ({
        ...p,
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
      .select("id,name,calories,logged_at")
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
      .select("id,type,duration_min,completed,logged_at")
      .eq("user_id", uid)
      .gte("logged_at", startIso)
      .lte("logged_at", endIso)
      .order("logged_at", { ascending: false });

    if (error) throw error;
    setWorkouts(
      (data ?? []).map((w) => ({
        ...w,
        duration: w.duration_min
      }))
    );
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    setDataError("");
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadProfile(user.id),
        loadNutritionToday(user.id),
        loadWorkoutsToday(user.id)
      ]);
    } catch (e) {
      setDataError(humanizeDataError(e));
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, loadProfile, loadNutritionToday, loadWorkoutsToday]);

  useEffect(() => {
    if (!user?.id) {
      setNutrition([]);
      setWorkouts([]);
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

  const addFood = async (name, calories) => {
    if (!supabase || !user?.id || !name) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase.from("nutrition_entries").insert({
        user_id: user.id,
        name: name.trim(),
        calories: Number(calories) || 0,
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

  const addWorkout = async (type, durationMin, completed) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase.from("workout_entries").insert({
        user_id: user.id,
        type,
        duration_min: Number(durationMin) || 0,
        completed: Boolean(completed),
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

  const updateFood = async (entryId, name, calories) => {
    if (!supabase || !user?.id || !name?.trim()) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from("nutrition_entries")
        .update({
          name: name.trim(),
          calories: Number(calories) || 0
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

  const updateWorkout = async (entryId, { type, durationMin, completed }) => {
    if (!supabase || !user?.id) return false;
    setDataError("");
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from("workout_entries")
        .update({
          type,
          duration_min: Number(durationMin) || 0,
          completed: Boolean(completed)
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

  const totals = useMemo(() => {
    const caloriesToday = nutrition.reduce((sum, f) => sum + Number(f.calories), 0);
    const completedWorkouts = workouts.filter((w) => w.completed).length;
    return { caloriesToday, completedWorkouts };
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
    refreshAll
  };
}
