import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../_shared/logger.ts"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const startTime = Date.now()
  let statusCode = 200
  let payload: any = {}
  let result: any = {}

  try {
    payload = await req.json()
    const { record } = payload
    const userId = record.user_id

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Получаем профиль пользователя и цель
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('telegram_chat_id, daily_calorie_goal, last_notified_date, display_name')
      .eq('id', userId)
      .single()

    if (profileErr || !profile?.telegram_chat_id) {
      result = { skipped: 'No telegram ID', reason: profileErr?.message || 'No chat ID' }
      return new Response(JSON.stringify(result), { status: 200 })
    }

    // 2. Проверяем, не отправляли ли уже сегодня уведомление
    const today = new Date().toISOString().split('T')[0]
    if (profile.last_notified_date === today) {
      result = { skipped: 'Already notified today' }
      return new Response(JSON.stringify(result), { status: 200 })
    }

    // 3. Считаем сумму калорий за сегодня
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const { data: entries, error: sumErr } = await supabase
      .from('nutrition_entries')
      .select('calories')
      .eq('user_id', userId)
      .gte('logged_at', startOfDay.toISOString())

    if (sumErr) throw sumErr

    const totalCalories = (entries || []).reduce((sum, entry) => sum + (entry.calories || 0), 0)

    // 4. Если цель достигнута — отправляем в Telegram
    if (totalCalories >= profile.daily_calorie_goal) {
      const message = `🔔 Внимание, ${profile.display_name || 'пользователь'}!\n\nДневная норма калорий (${profile.daily_calorie_goal} ккал) достигнута или превышена.\n\nТекущий показатель: ${totalCalories} ккал.`

      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: profile.telegram_chat_id,
          text: message,
          parse_mode: 'HTML'
        })
      })

      const tgData = await tgRes.json()

      if (!tgRes.ok) {
        statusCode = 502
        result = { error: 'Telegram API failed', description: tgData.description }
        return new Response(JSON.stringify(result), { status: 200 })
      }

      // 5. Помечаем, что уведомили сегодня
      await supabase
        .from('profiles')
        .update({ last_notified_date: today })
        .eq('id', userId)

      // Бизнес-событие: уведомление успешно отправлено
      await Logger.log({
        level: 'INFO',
        eventType: 'BUSINESS_EVENT',
        userId,
        metadata: { action: 'TELEGRAM_GOAL_NOTIFIED', calories: totalCalories, goal: profile.daily_calorie_goal }
      })

      result = { success: true }
      return new Response(JSON.stringify(result), { status: 200 })
    }

    result = { status: 'Goal not yet reached', calories: totalCalories }
    return new Response(JSON.stringify(result), { status: 200 })

  } catch (err) {
    statusCode = 500
    result = { error: err.message }
    await Logger.error(err.message, err.stack, { context: 'notify-goal-reached' })
    return new Response(JSON.stringify(result), { status: 200 })
  } finally {
    // Логируем сам HTTP-запрос (метод, URL, статус, время)
    const durationMs = Date.now() - startTime
    await Logger.log({
      level: statusCode >= 400 ? 'ERROR' : 'INFO',
      eventType: 'REQUEST',
      method: req.method,
      url: req.url,
      statusCode,
      durationMs,
      payload: payload, // Санитизация внутри логгера
      response: result
    })
  }
})
