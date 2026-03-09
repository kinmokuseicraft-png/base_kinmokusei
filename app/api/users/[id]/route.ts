/**
 * 個別ユーザー更新 API
 * PATCH /api/users/[id]  → tags・note を更新
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const { tags, note } = await req.json()

  const normalizedTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : []

  // 既存の custom_fields を取得してメモだけ更新
  const { data: current } = await supabase
    .from('line_users')
    .select('custom_fields')
    .eq('id', id)
    .single()

  if (!current) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const customFields = {
    ...(current.custom_fields as Record<string, unknown> ?? {}),
    note: typeof note === 'string' ? note.trim() : '',
  }

  const { data: updated, error } = await supabase
    .from('line_users')
    .update({
      tags: normalizedTags,
      custom_fields: customFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user: updated })
}
