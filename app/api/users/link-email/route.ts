/**
 * POST /api/users/link-email
 * LIFF から LINE userId + email を受け取り、line_users.email を更新する。
 *
 * body: { line_user_id: string, email: string }
 *
 * セキュリティ: LINE userId はクライアントから送られるが、
 * LIFF SDK の getDecodedIDToken() はサーバー側で検証できないため
 * ここでは信頼ドメイン（LINE CDN）でのみ使われる前提で受け付ける。
 * 本番でより厳密にしたい場合は ID Token をサーバー検証する。
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { line_user_id, email } = body

  if (!line_user_id || !email) {
    return NextResponse.json({ error: 'line_user_id and email are required' }, { status: 400 })
  }

  // メールアドレスの簡易バリデーション
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  // line_users に email を保存
  const { error } = await supabase
    .from('line_users')
    .update({ email, last_linked_at: new Date().toISOString() })
    .eq('line_user_id', line_user_id)

  if (error) {
    // email unique 制約違反の場合は別ユーザーに紐付いている
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'このメールアドレスは既に別のアカウントに登録されています' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
