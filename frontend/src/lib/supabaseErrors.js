/**
 * Человекочитаемые сообщения об ошибках Supabase (Auth, PostgREST, сеть).
 */

export function isNetworkLikeError(error) {
  const raw = (error?.message || "").trim();
  const lower = raw.toLowerCase();
  const name = (error?.name || "").toLowerCase();

  return (
    name.includes("authretryablefetcherror") ||
    (name.includes("typeerror") && lower.includes("fetch")) ||
    lower.includes("failed to fetch") ||
    lower.includes("load failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("err_network") ||
    lower.includes("err_internet_disconnected") ||
    (lower.includes("fetch") && lower.includes("network"))
  );
}

/** Ошибки входа / регистрации */
export function translateAuthError(error) {
  const raw = (error?.message || "").trim();
  const lower = raw.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Неверный email или пароль.";
  }
  if (lower.includes("email not confirmed")) {
    return "Подтвердите email по ссылке из письма, затем войдите.";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "Этот email уже занят — нажмите «Войти».";
  }
  if (lower.includes("password") && lower.includes("6")) {
    return "Пароль не короче 6 символов.";
  }
  if (lower.includes("invalid email")) {
    return "Некорректный email.";
  }
  if (isNetworkLikeError(error)) {
    return [
      "Не удалось связаться с сервером.",
      "Проверьте интернет, файл .env и перезапустите npm run dev после правок.",
      raw ? `Подробнее: ${raw}` : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  return raw || "Ошибка входа.";
}

/** Ошибки загрузки/сохранения таблиц */
export function humanizeDataError(error) {
  const raw = (error?.message || "").trim();
  const lower = raw.toLowerCase();
  const code = String(error?.code ?? "").toLowerCase();

  if (isNetworkLikeError(error)) {
    return translateAuthError(error);
  }
  if (lower.includes("jwt expired") || lower.includes("invalid jwt")) {
    return "Сессия устарела — нажмите «Выйти» и войдите снова.";
  }
  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    code === "42501"
  ) {
    return "Нет прав на данные. Убедитесь, что вы вошли в аккаунт и в Supabase настроен RLS.";
  }
  if (lower.includes("relation") && lower.includes("does not exist")) {
    return "Таблицы в базе не найдены — выполните SQL из README в Supabase.";
  }

  return raw || "Не удалось выполнить запрос к серверу.";
}
