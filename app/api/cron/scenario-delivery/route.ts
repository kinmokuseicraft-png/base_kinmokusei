/**
 * シナリオ配信 Cron
 * POST /api/cron/scenario-delivery
 * Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { runScenarioEngine } from '@/lib/scenarios/engine'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function POST(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization')
    const secretHeader = request.headers.get('x-cron-secret')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : secretHeader
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await runScenarioEngine()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron/scenario-delivery]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
