import { NextRequest, NextResponse } from 'next/server'
import { getBaseAccessToken } from '@/lib/base_api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET ?? ''
  if (cronSecret) {
    const auth = request.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const token = await getBaseAccessToken()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'not set'
  if (!token) return NextResponse.json({ token: null, supabaseUrl })
  return NextResponse.json({ tokenFirst10: token.slice(0, 10), tokenLength: token.length, supabaseUrl })
}
