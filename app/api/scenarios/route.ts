/**
 * シナリオ一覧・作成 API
 * GET  /api/scenarios
 * POST /api/scenarios
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*, scenario_steps(count)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scenarios: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name: string
    description?: string | null
    trigger_type: 'follow' | 'keyword' | 'manual'
    trigger_value?: string | null
    is_active?: boolean
    steps?: { delay_hours: number; text: string }[]
  }

  const { steps, ...scenarioData } = body

  const { data: scenario, error } = await supabase
    .from('scenarios')
    .insert(scenarioData)
    .select()
    .single()

  if (error || !scenario) {
    return NextResponse.json({ error: error?.message ?? '作成失敗' }, { status: 500 })
  }

  if (steps && steps.length > 0) {
    await supabase.from('scenario_steps').insert(
      steps.map((s, i) => ({
        scenario_id: scenario.id,
        step_order: i,
        delay_hours: s.delay_hours,
        message_type: 'text',
        message_content: { type: 'text', text: s.text },
      }))
    )
  }

  return NextResponse.json({ ok: true, scenario })
}
