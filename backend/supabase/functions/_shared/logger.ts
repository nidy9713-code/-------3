import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""

// Поля, которые мы НЕ логируем никогда (пароли, токены)
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'auth_token']

/**
 * Очистка объекта от чувствительных данных перед логированием
 */
function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj }
  
  for (const key in sanitized) {
    if (SENSITIVE_FIELDS.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key])
    }
  }
  return sanitized
}

export class Logger {
  private static supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  /**
   * Запись лога в консоль (в JSON формате) и в таблицу БД
   */
  static async log(params: {
    level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL',
    eventType: 'REQUEST' | 'BUSINESS_EVENT' | 'SYSTEM_ERROR',
    userId?: string,
    method?: string,
    url?: string,
    statusCode?: number,
    durationMs?: number,
    payload?: any,
    response?: any,
    errorDetails?: { message: string, stack?: string },
    metadata?: any
  }) {
    const logData = {
      timestamp: new Date().toISOString(),
      ...params,
      payload: sanitize(params.payload),
      response: sanitize(params.response),
      metadata: sanitize(params.metadata)
    }

    // 1. Вывод в стандартный вывод (для облачных логов Supabase/Deno)
    console.log(JSON.stringify(logData))

    // 2. Асинхронная запись в БД (не ждем завершения, чтобы не тормозить основной ответ)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase.from('backend_logs').insert([logData]).then(({ error }) => {
        if (error) console.error(`[LOGGER ERROR] Failed to save log to DB: ${error.message}`)
      })
    }
  }

  static async info(eventType: string, metadata: any = {}) {
    return this.log({ level: 'INFO', eventType: 'BUSINESS_EVENT', metadata })
  }

  static async error(message: string, stack?: string, metadata: any = {}) {
    return this.log({ 
      level: 'ERROR', 
      eventType: 'SYSTEM_ERROR', 
      errorDetails: { message, stack },
      metadata 
    })
  }

  static async request(req: Request, statusCode: number, durationMs: number, payload?: any, response?: any) {
    return this.log({
      level: statusCode >= 400 ? 'ERROR' : 'INFO',
      eventType: 'REQUEST',
      method: req.method,
      url: req.url,
      statusCode,
      durationMs,
      payload,
      response
    })
  }
}
