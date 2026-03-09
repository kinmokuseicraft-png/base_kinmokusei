/**
 * ウェルカムシナリオ一括作成 API
 * POST /api/scenarios/bootstrap
 */
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

const SCENARIO_NAME = '金杢犀 ウェルカム導線'

const WELCOME_STEPS = [
  {
    delay_hours: 0,
    text: `金杢犀のLINEへようこそ！🌿

木軸ペン工房「金杢犀」と申します。
世界中の希少銘木を旋盤で削り出した、一点物の木軸ペンをお届けしています。

以下から気になるものをご覧ください👇`,
  },
  {
    delay_hours: 0,
    text: `▼ 金杢犀の3つの入口

🛍️ 作品を見る
→ BASEショップで現在販売中の作品一覧

📖 銘木図鑑を読む
→ 各木材の歴史・特徴・産地を詳しく解説

💬 ご相談・お問い合わせ
→ 用途や贈る相手に合わせてご提案します

お気軽にどうぞ！`,
  },
]

export async function POST() {
  const { data: existing } = await supabase
    .from('scenarios')
    .select('id')
    .eq('name', SCENARIO_NAME)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      ok: true,
      created: false,
      message: 'おすすめ導線シナリオはすでに作成されています。',
    })
  }

  const { data: scenario, error: scenarioError } = await supabase
    .from('scenarios')
    .insert({
      name: SCENARIO_NAME,
      description: '友達追加直後に作品・図鑑・相談の3導線を案内するシナリオ',
      trigger_type: 'follow',
      trigger_value: null,
      is_active: true,
    })
    .select('id')
    .single()

  if (scenarioError || !scenario) {
    return NextResponse.json({ ok: false, error: scenarioError?.message ?? '作成失敗' }, { status: 500 })
  }

  const { error: stepsError } = await supabase
    .from('scenario_steps')
    .insert(
      WELCOME_STEPS.map((step, i) => ({
        scenario_id: scenario.id,
        step_order: i,
        delay_hours: step.delay_hours,
        message_type: 'text',
        message_content: { type: 'text', text: step.text },
      }))
    )

  if (stepsError) {
    return NextResponse.json({ ok: false, error: stepsError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    created: true,
    message: 'ウェルカムシナリオを作成しました。',
  })
}
