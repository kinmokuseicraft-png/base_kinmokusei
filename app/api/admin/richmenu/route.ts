/**
 * POST /api/admin/richmenu
 * body: { action: 'deploy' | 'list' | 'delete', richMenuId?: string, imageVariant?: string }
 *
 * deploy: 指定バリアントの画像でリッチメニューを作成・アップロード・デフォルト設定
 * list:   現在登録されているリッチメニュー一覧を返す
 * delete: 指定 richMenuId を削除
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
  listRichMenus,
  deleteRichMenu,
  KINMOKUSEI_MENU,
} from '@/lib/line/richmenu'

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

// 簡易管理認証（CRON_SECRET を流用）
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // 未設定なら開放
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!TOKEN) {
    return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { action, richMenuId, imageVariant = 'richmenu-f' } = body

  try {
    // ── list ──
    if (action === 'list') {
      const data = await listRichMenus(TOKEN)
      return NextResponse.json(data)
    }

    // ── delete ──
    if (action === 'delete') {
      if (!richMenuId) return NextResponse.json({ error: 'richMenuId required' }, { status: 400 })
      await deleteRichMenu(TOKEN, richMenuId)
      return NextResponse.json({ ok: true, deleted: richMenuId })
    }

    // ── deploy ──
    if (action === 'deploy') {
      // 画像ファイルを読み込む（designs/ からの相対パス）
      const imgPath = path.join(process.cwd(), 'designs', `${imageVariant}.png`)
      if (!fs.existsSync(imgPath)) {
        return NextResponse.json(
          { error: `Image not found: designs/${imageVariant}.png` },
          { status: 400 }
        )
      }
      const imageBuffer = fs.readFileSync(imgPath)

      // 1. メニュー作成
      const newId = await createRichMenu(TOKEN, KINMOKUSEI_MENU)

      // 2. 画像アップロード
      await uploadRichMenuImage(TOKEN, newId, imageBuffer)

      // 3. デフォルト設定
      await setDefaultRichMenu(TOKEN, newId)

      return NextResponse.json({ ok: true, richMenuId: newId, image: imageVariant })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const data = await listRichMenus(TOKEN).catch((e) => ({ error: String(e) }))
  return NextResponse.json(data)
}
