import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  console.log(`[LOG] Request received: ${req.method} ${req.url}`)

  try {
    const payload = await req.json()
    const { record } = payload
    const userId = record.user_id

    console.log(`[LOG] Processing nutrition entry for user: ${userId}`)

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Получаем профиль пользователя и цель
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('telegram_chat_id, daily_calorie_goal, last_notified_date, display_name')
      .eq('id', userId)
      .single()

    if (profileErr || !profile?.telegram_chat_id) {
      console.log(`[LOG] Telegram integration not active or profile error: ${profileErr?.message || 'No chat ID'}`)
      return new Response(JSON.stringify({ skipped: 'No telegram ID' }), { status: 200 })
    }

    // 2. Проверяем, не отправляли ли уже сегодня уведомление
    const today = new Date().toISOString().split('T')[0]
    if (profile.last_notified_date === today) {
      console.log(`[LOG] Notification already sent today for user ${userId}`)
      return new Response(JSON.stringify({ skipped: 'Already notified today' }), { status: 200 })
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
    console.log(`[LOG] User ${userId} total calories: ${totalCalories}, goal: ${profile.daily_calorie_goal}`)

    // 4. Если цель достигнута — отправляем в Telegram
    if (totalCalories >= profile.daily_calorie_goal) {
      const message = `🔔 Внимание, ${profile.display_name || 'пользователь'}!\n\nДневная норма калорий (${profile.daily_calorie_goal} ккал) достигнута или превышена.\n\nТекущий показатель: ${totalCalories} ккал.`

      console.log(`[LOG] Sending telegram message to ${profile.telegram_chat_id}...`)
      
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
      console.log(`[LOG] Telegram response:`, JSON.stringify(tgData))

      if (!tgRes.ok) {
        console.error(`[ERROR] Telegram API failed: ${tgData.description}`)
        // Не блокируем действие, просто выходим
        return new Response(JSON.stringify({ error: 'Telegram failed' }), { status: 200 })
      }

      // 5. Помечаем, что уведомили сегодня
      await supabase
        .from('profiles')
        .update({ last_notified_date: today })
        .eq('id', userId)

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    return new Response(JSON.stringify({ status: 'Goal not yet reached' }), { status: 200 })

  } catch (err) {
    console.error(`[CRITICAL ERROR]`, err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 200 })
  }
})
