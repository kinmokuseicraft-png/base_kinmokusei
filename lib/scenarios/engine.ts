/**
 * シナリオエンジン
 * - startScenario: Step 0 を即時送信し、次のステップを設定
 * - runScenarioEngine: Cron で定期実行し、時間遅延ステップを処理
 */
import { supabase } from '@/lib/supabase_client'

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push'
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

type MessageContent = { type?: string; text?: string; [key: string]: unknown }

function buildLineMessage(messageType: string, content: MessageContent) {
  if (messageType === 'text') {
    return { type: 'text', text: content.text ?? '' }
  }
  return { type: 'text', text: String(content.text ?? '') }
}

async function pushMessages(userId: string, messages: unknown[]) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not set')
  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`LINE push failed: ${res.status} ${t}`)
  }
}

/**
 * シナリオ開始: Step 0 を即時 push 送信し、次ステップの送信予定を設定する。
 * follow イベントおよびキーワードトリガー時に呼び出す。
 */
export async function startScenario(userId: string, scenarioId: string) {
  const { data: steps } = await supabase
    .from('scenario_steps')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('step_order', { ascending: true })

  if (!steps?.length) return

  const step0 = steps[0]
  const msg = buildLineMessage(step0.message_type, step0.message_content as MessageContent)
  await pushMessages(userId, [msg])

  await supabase.from('messages').insert({
    line_user_id: userId,
    direction: 'outbound',
    message_type: step0.message_type,
    content: (step0.message_content as MessageContent).text ?? null,
  })

  const step1 = steps[1]
  if (step1) {
    const nextSendAt = new Date(Date.now() + step1.delay_hours * 3600000).toISOString()
    await supabase.from('line_users').update({
      active_scenario_id: scenarioId,
      scenario_step: 1,
      scenario_next_send_at: nextSendAt,
    }).eq('line_user_id', userId)
  } else {
    await supabase.from('line_users').update({
      active_scenario_id: null,
      scenario_step: 0,
      scenario_next_send_at: null,
    }).eq('line_user_id', userId)
  }
}

/**
 * Cron エンジン: scenario_next_send_at <= now のユーザーに次ステップを送信。
 * POST /api/cron/scenario-delivery から呼び出す。
 */
export async function runScenarioEngine(): Promise<{ processed: number }> {
  const now = new Date().toISOString()

  const { data: users } = await supabase
    .from('line_users')
    .select('line_user_id, active_scenario_id, scenario_step, scenario_next_send_at')
    .eq('status', 'active')
    .not('active_scenario_id', 'is', null)
    .lte('scenario_next_send_at', now)

  if (!users?.length) return { processed: 0 }

  let processed = 0

  for (const user of users) {
    try {
      const { data: steps } = await supabase
        .from('scenario_steps')
        .select('*')
        .eq('scenario_id', user.active_scenario_id)
        .order('step_order', { ascending: true })

      const clearScenario = () =>
        supabase.from('line_users').update({
          active_scenario_id: null,
          scenario_step: 0,
          scenario_next_send_at: null,
        }).eq('line_user_id', user.line_user_id)

      if (!steps?.length) {
        await clearScenario()
        continue
      }

      const currentStep = steps[user.scenario_step as number]
      if (!currentStep) {
        await clearScenario()
        continue
      }

      const message = buildLineMessage(currentStep.message_type, currentStep.message_content as MessageContent)
      await pushMessages(user.line_user_id, [message])

      await supabase.from('messages').insert({
        line_user_id: user.line_user_id,
        direction: 'outbound',
        message_type: currentStep.message_type,
        content: (currentStep.message_content as MessageContent).text ?? null,
      })

      const nextStepIndex = (user.scenario_step as number) + 1
      const nextStep = steps[nextStepIndex]

      if (nextStep) {
        const nextSendAt = new Date(Date.now() + nextStep.delay_hours * 3600000).toISOString()
        await supabase.from('line_users').update({
          scenario_step: nextStepIndex,
          scenario_next_send_at: nextSendAt,
        }).eq('line_user_id', user.line_user_id)
      } else {
        await clearScenario()
      }

      processed++
    } catch (e) {
      console.error(`[scenario-engine] error for ${(user.line_user_id as string).slice(0, 8)}:`, e)
    }
  }

  return { processed }
}
