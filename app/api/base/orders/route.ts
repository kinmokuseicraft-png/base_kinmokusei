/**
 * GET /api/base/orders
 * BASE API から注文一覧を取得し、LINE ユーザーとのマッチング状況を付与して返す。
 * クエリパラメータ:
 *   status=1|2|3|4  (1=未確認, 2=確認済み, 3=発送済み, 4=キャンセル。省略=全件)
 *   limit=N         (デフォルト 20)
 *   offset=N        (デフォルト 0)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getBaseAccessToken } from '@/lib/base_api'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

const BASE_API = 'https://api.thebase.in'

export async function GET(request: NextRequest) {
  const token = await getBaseAccessToken()
  if (!token) {
    return NextResponse.json({ error: 'BASE access token not set' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? ''
  const limit  = searchParams.get('limit')  ?? '20'
  const offset = searchParams.get('offset') ?? '0'

  // BASE API から注文取得
  const params = new URLSearchParams({ limit, offset, ...(status ? { status } : {}) })
  const res = await fetch(`${BASE_API}/1/orders?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `BASE API ${res.status}: ${text}` }, { status: res.status })
  }

  const data = await res.json()
  const orders: BaseOrder[] = data?.orders ?? []

  // LINE ユーザーとのマッチング（email で突合）
  const emails = orders
    .map((o) => o.customer_mail)
    .filter((e): e is string => !!e)

  let lineUsersByEmail: Record<string, { line_user_id: string; display_name: string }> = {}
  if (emails.length > 0) {
    const { data: lineUsers } = await supabase
      .from('line_users')
      .select('line_user_id, display_name, email')
      .in('email', emails)

    ;(lineUsers ?? []).forEach((u: { line_user_id: string; display_name: string; email: string | null }) => {
      if (u.email) lineUsersByEmail[u.email] = { line_user_id: u.line_user_id, display_name: u.display_name }
    })
  }

  const enriched = orders.map((o) => ({
    ...o,
    line_user: o.customer_mail ? (lineUsersByEmail[o.customer_mail] ?? null) : null,
  }))

  return NextResponse.json({ orders: enriched, total: data?.total ?? enriched.length })
}

// BASE API の注文型（最低限）
interface BaseOrder {
  unique_key: string
  order_date: string
  order_status: number
  customer_name: string
  customer_mail: string | null
  customer_tel: string | null
  customer_zipcode: string | null
  customer_prefecture: string | null
  customer_address: string | null
  total_price: number
  ordered_products: {
    item_id: number
    title: string
    variation: string | null
    num: number
    price: number
  }[]
  delivery_tracking_number: string | null
  delivery_service_name: string | null
  [key: string]: unknown
}
