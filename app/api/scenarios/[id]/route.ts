/**
 * シナリオ詳細・更新・削除 API
 * GET    /api/scenarios/[id]
 * PATCH  /api/scenarios/[id]
 * DELETE /api/scenarios/[id]
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const [{ data: scenario }, { data: steps }] = await Promise.all([
    supabase.from('scenarios').select('*').eq('id', id).single(),
    supabase.from('scenario_steps').select('*').eq('scenario_id', id).order('step_order'),
  ])

  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ scenario, steps: steps ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const body = await req.json() as {
    name?: string
    description?: string | null
    trigger_type?: 'follow' | 'keyword' | 'manual'
    trigger_value?: string | null
    is_active?: boolean
    steps?: { delay_hours: number; text: string }[]
  }

  const { steps, ...scenarioData } = body

  const { error } = await supabase
    .from('scenarios')
    .update({ ...scenarioData, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (steps !== undefined) {
    await supabase.from('scenario_steps').delete().eq('scenario_id', id)
    if (steps.length > 0) {
      await supabase.from('scenario_steps').insert(
        steps.map((s, i) => ({
          scenario_id: id,
          step_order: i,
          delay_hours: s.delay_hours,
          message_type: 'text',
          message_content: { type: 'text', text: s.text },
        }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  await supabase.from('scenario_steps').delete().eq('scenario_id', id)
  const { error } = await supabase.from('scenarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
