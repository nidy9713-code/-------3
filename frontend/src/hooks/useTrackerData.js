import { useCallback, useEffect, useMemo, useState } from "react";
import { humanizeDataError, translateAuthError } from "../lib/supabaseErrors";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { 
  registerSchema, 
  loginSchema, 
  profileUpdateSchema, 
  nutritionSchema, 
  workoutSchema, 
  weightLogSchema, 
  goalSchema,
  idSchema,
  formatZodError 
} from "../lib/validation";

function getTodayRangeIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function useTrackerData() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [dataError, setDataError] = useState("");

  const [profile, setProfile] = useState({
    displayName: "",
    avatarUrl: "",
    telegramChatId: "",
    role: "user",
    gender: "male",
    height: "",
    weight: "",
    age: "",
    dailyCalorieGoal: 2000,
    isEditing: false
  });

  const [nutrition, setNutrition] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);

  const user = session?.user ?? null;
  const isAdmin = profile.role === "admin";

  // Auth State
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!cancelled) setSession(s ?? null);
    });

    (async () => {
      try {
        const { data: { session: initial }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) setAuthError(translateAuthError(error));
        let s = initial ?? null;
        if (!s && import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN === "true") {
          const email = import.meta.env.VITE_DEV_AUTO_LOGIN_EMAIL?.trim();
          const pass = import.meta.env.VITE_DEV_AUTO_LOGIN_PASSWORD;
          if (email && pass) {
            const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (!cancelled && !signErr) s = data.session;
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

  // Data Loading
  const loadProfile = useCallback(async (uid) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name,avatar_url,role,gender,height_cm,weight_kg,age,daily_calorie_goal,telegram_chat_id")
      .eq("id", uid)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      setProfile(p => ({ ...p, isEditing: true }));
      return;
    }

    setProfile((p) => ({
      ...p,
      displayName: data.display_name ?? "",
      avatarUrl: data.avatar_url ?? "",
      telegramChatId: data.telegram_chat_id ?? "",
      role: data.role ?? "user",
      gender: data.gender ?? "male",
      height: data.height_cm != null ? String(data.height_cm) : "",
      weight: data.weight_kg != null ? String(data.weight_kg) : "",
      age: data.age != null ? String(data.age) : "",
      dailyCalorieGoal: data.daily_calorie_goal ?? 2000,
      isEditing: false
    }));
  }, []);

  const loadAllProfiles = useCallback(async () => {
    if (!supabase || profile.role !== "admin") return;
    const { data, error } = await supabase.from("profiles").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    setAllProfiles(data ?? []);
  }, [profile.role]);

  const loadNutritionToday = useCallback(async (uid) => {
    if (!supabase) return;
    const { startIso, endIso } = getTodayRangeIso();
    const { data, error } = await supabase
      .from("nutrition_entries")
      .select("*")
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
      .select("*")
      .eq("user_id", uid)
      .gte("logged_at", startIso)
      .lte("logged_at", endIso)
      .order("logged_at", { ascending: false });
    if (error) throw error;
    setWorkouts((data ?? []).map(w => ({ ...w, duration: w.duration_min, caloriesBurned: w.calories_burned })));
  }, []);

  const loadWeightLogs = useCallback(async (uid) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("weight_logs").select("*").eq("user_id", uid).order("logged_at", { ascending: false }).limit(30);
    if (error) throw error;
    setWeightLogs(data ?? []);
  }, []);

  const loadGoals = useCallback(async (uid) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("goals").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    if (error) throw error;
    setGoals(data ?? []);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    setDataError("");
    setIsRefreshing(true);
    try {
      const tasks = [loadProfile(user.id), loadNutritionToday(user.id), loadWorkoutsToday(user.id), loadWeightLogs(user.id), loadGoals(user.id)];
      if (profile.role === "admin") tasks.push(loadAllProfiles());
      await Promise.all(tasks);
    } catch (e) {
      const message = humanizeDataError(e);
      setDataError(message);
      // Если ошибка 401 (Unauthorized) - разлогиниваем пользователя
      if (message.includes("401")) {
        signOut();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, loadProfile, loadNutritionToday, loadWorkoutsToday, loadWeightLogs, loadGoals, loadAllProfiles, profile.role]);

  useEffect(() => {
    if (user?.id) refreshAll();
    else {
      setNutrition([]); setWorkouts([]); setWeightLogs([]); setGoals([]); setAllProfiles([]);
    }
  }, [user?.id, refreshAll]);

  // Actions with Validation
  const signIn = async (email, password) => {
    const val = loginSchema.safeParse({ email, password });
    if (!val.success) {
      setAuthError(val.error.errors[0].message);
      return false;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setAuthError(translateAuthError(error));
    return !error;
  };

  const signUp = async (email, password, name) => {
    const val = registerSchema.safeParse({ email, password, name });
    if (!val.success) {
      setAuthError(val.error.errors[0].message);
      return false;
    }
    const { data, error } = await supabase.auth.signUp({ 
      email: email.trim(), 
      password, 
      options: { data: { display_name: name } } 
    });
    if (error) {
      setAuthError(translateAuthError(error));
      return false;
    }
    if (data.user && !data.session) setAuthInfo("Подтвердите email и войдите.");
    return Boolean(data.session);
  };

  const signOut = async () => { if (supabase) await supabase.auth.signOut(); };

  const saveProfile = async () => {
    if (!user?.id) return false;
    const data = {
      display_name: profile.displayName,
      telegram_chat_id: profile.telegramChatId || null,
      gender: profile.gender,
      height_cm: profile.height === "" ? null : Number(profile.height),
      weight_kg: profile.weight === "" ? null : Number(profile.weight),
      age: profile.age === "" ? null : Number(profile.age),
      daily_calorie_goal: profile.dailyCalorieGoal ? Number(profile.dailyCalorieGoal) : 2000
    };
    const val = profileUpdateSchema.safeParse(data);
    if (!val.success) {
      setDataError(val.error.errors[0].message);
      return false;
    }
    setIsMutating(true);
    try {
      const { error } = await supabase.from("profiles").upsert({ id: user.id, ...data });
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
    const data = { name, calories: Number(calories), meal_type: mealType, weight_g: weightG ? Number(weightG) : null };
    const val = nutritionSchema.safeParse(data);
    if (!val.success) { setDataError(val.error.errors[0].message); return false; }
    setIsMutating(true);
    try {
      const { error } = await supabase.from("nutrition_entries").insert({ user_id: user.id, ...data });
      if (error) throw error;
      await loadNutritionToday(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const updateFood = async (id, name, calories, mealType, weightG) => {
    const data = { name, calories: Number(calories), meal_type: mealType, weight_g: weightG ? Number(weightG) : null };
    if (!idSchema.safeParse(id).success) return false;
    const val = nutritionSchema.safeParse(data);
    if (!val.success) { setDataError(val.error.errors[0].message); return false; }
    setIsMutating(true);
    try {
      const { error } = await supabase.from("nutrition_entries").update(data).eq("id", id);
      if (error) throw error;
      await loadNutritionToday(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const deleteFood = async (id) => {
    if (!idSchema.safeParse(id).success) return false;
    setIsMutating(true);
    try {
      const { error } = await supabase.from("nutrition_entries").delete().eq("id", id);
      if (error) throw error;
      await loadNutritionToday(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const addWorkout = async (type, durationMin, completed, caloriesBurned = 0, notes = "") => {
    const data = { type, duration_min: Number(durationMin), completed: Boolean(completed), calories_burned: Number(caloriesBurned), notes };
    const val = workoutSchema.safeParse(data);
    if (!val.success) { setDataError(val.error.errors[0].message); return false; }
    setIsMutating(true);
    try {
      const { error } = await supabase.from("workout_entries").insert({ user_id: user.id, ...data });
      if (error) throw error;
      await loadWorkoutsToday(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const updateWorkout = async (id, { type, durationMin, completed, caloriesBurned, notes }) => {
    const data = { type, duration_min: Number(durationMin), completed: Boolean(completed), calories_burned: Number(caloriesBurned), notes };
    if (!idSchema.safeParse(id).success) return false;
    const val = workoutSchema.safeParse(data);
    if (!val.success) { setDataError(val.error.errors[0].message); return false; }
    setIsMutating(true);
    try {
      const { error } = await supabase.from("workout_entries").update(data).eq("id", id);
      if (error) throw error;
      await loadWorkoutsToday(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const deleteWorkout = async (id) => {
    if (!idSchema.safeParse(id).success) return false;
    setIsMutating(true);
    try {
      const { error } = await supabase.from("workout_entries").delete().eq("id", id);
      if (error) throw error;
      await loadWorkoutsToday(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const addWeightLog = async (weightKg) => {
    const data = { weight_kg: Number(weightKg) };
    const val = weightLogSchema.safeParse(data);
    if (!val.success) { setDataError(val.error.errors[0].message); return false; }
    setIsMutating(true);
    try {
      const { error } = await supabase.from("weight_logs").insert({ user_id: user.id, ...data });
      if (error) throw error;
      await supabase.from("profiles").update({ weight_kg: data.weight_kg }).eq("id", user.id);
      await Promise.all([loadWeightLogs(user.id), loadProfile(user.id)]);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const deleteWeightLog = async (id) => {
    if (!idSchema.safeParse(id).success) return false;
    setIsMutating(true);
    try {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id);
      if (error) throw error;
      await loadWeightLogs(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const addGoal = async (title, targetValue, unit) => {
    const data = { title, target_value: Number(targetValue), unit };
    const val = goalSchema.safeParse(data);
    if (!val.success) { setDataError(val.error.errors[0].message); return false; }
    setIsMutating(true);
    try {
      const { error } = await supabase.from("goals").insert({ user_id: user.id, ...data });
      if (error) throw error;
      await loadGoals(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const updateGoal = async (id, { title, target_value, current_value, unit, deadline, completed }) => {
    const data = { title, target_value: Number(target_value), current_value: Number(current_value), unit, deadline, completed };
    if (!idSchema.safeParse(id).success) return false;
    const val = goalSchema.safeParse(data);
    if (!val.success) { setDataError(val.error.errors[0].message); return false; }
    setIsMutating(true);
    try {
      const { error } = await supabase.from("goals").update(data).eq("id", id);
      if (error) throw error;
      await loadGoals(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const deleteGoal = async (id) => {
    if (!idSchema.safeParse(id).success) return false;
    setIsMutating(true);
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
      await loadGoals(user.id);
      return true;
    } catch (e) { setDataError(humanizeDataError(e)); return false; }
    finally { setIsMutating(false); }
  };

  const totals = useMemo(() => ({
    caloriesToday: nutrition.reduce((sum, f) => sum + Number(f.calories), 0),
    caloriesBurnedToday: workouts.filter(w => w.completed).reduce((sum, w) => sum + Number(w.caloriesBurned || 0), 0)
  }), [nutrition, workouts]);

  return {
    isSupabaseConfigured, user, isAdmin, authLoading, authError, setAuthError, authInfo, setAuthInfo,
    isRefreshing, isMutating, dataError, setDataError, profile, setProfile, allProfiles,
    nutrition, workouts, weightLogs, goals, totals, calorieGoal: Number(profile.dailyCalorieGoal) || 2000,
    signIn, signUp, signOut, saveProfile, addFood, updateFood, deleteFood, addWorkout, updateWorkout, deleteWorkout,
    addWeightLog, deleteWeightLog, addGoal, updateGoal, deleteGoal, refreshAll
  };
}
