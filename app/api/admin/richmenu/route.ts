/**
 * POST /api/admin/richmenu
 *
 * action: 'deploy'       — 旧デプロイ（1枚画像 + imageVariant 指定）
 * action: 'deploy-tabs'  — 新2タブデプロイ（Tab A / Tab B 自動）
 * action: 'list'         — 登録済みメニュー一覧
 * action: 'delete'       — 指定IDを削除
 *
 * deploy-tabs の flow:
 *   1. 古いエイリアスを削除（存在しなければスキップ）
 *   2. Tab A / Tab B の richMenu を作成
 *   3. PNG 画像をアップロード（designs/richmenu-tab-a.png / richmenu-tab-b.png）
 *   4. エイリアス kinmokusei-menu-a / kinmokusei-menu-b を登録
 *   5. Tab A をデフォルトに設定
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
  createRichMenuAlias,
  deleteRichMenuAlias,
  buildMenuTabA,
  buildMenuTabB,
  ALIAS_A,
  ALIAS_B,
  KINMOKUSEI_MENU,
} from '@/lib/line/richmenu'

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
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
  const { action, richMenuId, imageVariant = 'richmenu-f', liffUrl } = body as {
    action: string
    richMenuId?: string
    imageVariant?: string
    liffUrl?: string
  }

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

    // ── deploy（旧: 1枚画像）──
    if (action === 'deploy') {
      const imgPath = path.join(process.cwd(), 'designs', `${imageVariant}.png`)
      if (!fs.existsSync(imgPath)) {
        return NextResponse.json({ error: `Image not found: designs/${imageVariant}.png` }, { status: 400 })
      }
      const imageBuffer = fs.readFileSync(imgPath)
      const newId = await createRichMenu(TOKEN, KINMOKUSEI_MENU)
      await uploadRichMenuImage(TOKEN, newId, imageBuffer)
      await setDefaultRichMenu(TOKEN, newId)
      return NextResponse.json({ ok: true, richMenuId: newId, image: imageVariant })
    }

    // ── deploy-tabs（新: 2タブ）──
    if (action === 'deploy-tabs') {
      const imgPathA = path.join(process.cwd(), 'designs', 'richmenu-tab-a.png')
      const imgPathB = path.join(process.cwd(), 'designs', 'richmenu-tab-b.png')

      if (!fs.existsSync(imgPathA)) {
        return NextResponse.json({ error: 'designs/richmenu-tab-a.png が見つかりません。先に node scripts/generate-richmenu.cjs を実行してください。' }, { status: 400 })
      }
      if (!fs.existsSync(imgPathB)) {
        return NextResponse.json({ error: 'designs/richmenu-tab-b.png が見つかりません。先に node scripts/generate-richmenu.cjs を実行してください。' }, { status: 400 })
      }

      const log: string[] = []

      // 1. 古いエイリアスを削除（エラーは無視）
      await deleteRichMenuAlias(TOKEN, ALIAS_A).catch(() => null)
      await deleteRichMenuAlias(TOKEN, ALIAS_B).catch(() => null)
      log.push('古いエイリアス削除（または未存在）')

      // 2. メニュー作成
      const menuA = buildMenuTabA(liffUrl)
      const menuB = buildMenuTabB()
      const idA = await createRichMenu(TOKEN, menuA)
      const idB = await createRichMenu(TOKEN, menuB)
      log.push(`Tab A 作成: ${idA}`)
      log.push(`Tab B 作成: ${idB}`)

      // 3. 画像アップロード
      const bufA = fs.readFileSync(imgPathA)
      const bufB = fs.readFileSync(imgPathB)
      await uploadRichMenuImage(TOKEN, idA, bufA)
      await uploadRichMenuImage(TOKEN, idB, bufB)
      log.push('画像アップロード完了')

      // 4. エイリアス登録
      await createRichMenuAlias(TOKEN, ALIAS_A, idA)
      await createRichMenuAlias(TOKEN, ALIAS_B, idB)
      log.push(`エイリアス登録: ${ALIAS_A} → ${idA}`)
      log.push(`エイリアス登録: ${ALIAS_B} → ${idB}`)

      // 5. Tab A をデフォルトに
      await setDefaultRichMenu(TOKEN, idA)
      log.push('Tab A をデフォルトに設定')

      return NextResponse.json({ ok: true, idA, idB, log })
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
