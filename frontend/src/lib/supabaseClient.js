import { createClient } from "@supabase/supabase-js";

/**
 * Снимаем лишние кавычки из .env (часто копируют значения в "…").
 */
function envTrim(s) {
  let v = String(s ?? "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

const rawUrl = envTrim(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = envTrim(import.meta.env.VITE_SUPABASE_ANON_KEY);

/** Хвостовой слэш в URL иногда даёт сбои при запросах к Auth API */
const supabaseUrl = rawUrl.replace(/\/+$/, "");

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"))
);

/** Имя хоста из URL — для подсказки на экране входа (ключ не показываем) */
export let supabaseDisplayHost = "";
try {
  if (isSupabaseConfigured) {
    supabaseDisplayHost = new URL(supabaseUrl).hostname;
  }
} catch {
  supabaseDisplayHost = "";
}

/** null, если .env не заполнен — приложение покажет подсказку, а не «белый экран». */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;
