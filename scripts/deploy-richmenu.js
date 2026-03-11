/**
 * リッチメニューをLINE APIに直接デプロイするスクリプト
 * 実行: node scripts/deploy-richmenu.js [画像ファイル名]
 * 例:   node scripts/deploy-richmenu.js richmenu-f
 *       node scripts/deploy-richmenu.js richmenu-e
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN) { console.error('LINE_CHANNEL_ACCESS_TOKEN が .env にありません'); process.exit(1); }

const BASE_URL = 'https://api.line.me/v2/bot';
const DATA_URL = 'https://api-data.line.me/v2/bot';

// タップエリア定義（2500×1686, 3列×2行）
const W1 = 833, W2 = 834, H = 843;
const MENU_DEF = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: '金杢犀メインメニュー',
  chatBarText: 'メニューを開く',
  areas: [
    { bounds: { x: 0,      y: 0, width: W1, height: H }, action: { type: 'message', text: '銘木診断',  label: '銘木診断'  } },
    { bounds: { x: W1,     y: 0, width: W2, height: H }, action: { type: 'uri',     uri: 'https://kinmokuseijp.base.shop', label: 'ショップ' } },
    { bounds: { x: W1+W2,  y: 0, width: W1, height: H }, action: { type: 'uri',     uri: 'https://kinmokuseijp.blog',     label: '銘木図鑑' } },
    { bounds: { x: 0,      y: H, width: W1, height: H }, action: { type: 'message', text: '新作・入荷', label: '新作・入荷' } },
    { bounds: { x: W1,     y: H, width: W2, height: H }, action: { type: 'message', text: '職人に相談', label: '職人に相談' } },
    { bounds: { x: W1+W2,  y: H, width: W1, height: H }, action: { type: 'message', text: '注文状況',  label: '注文状況'  } },
  ],
};

async function lineApi(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${TOKEN}`, ...options.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const variant = process.argv[2] || 'richmenu-f';
  const imgPath = path.join(__dirname, '..', 'designs', `${variant}.png`);

  if (!fs.existsSync(imgPath)) {
    console.error(`画像が見つかりません: designs/${variant}.png`);
    console.error('先に node designs/export-png.js を実行してください');
    process.exit(1);
  }

  console.log(`使用画像: designs/${variant}.png`);
  console.log('');

  // 1. 既存メニュー一覧表示
  console.log('① 既存リッチメニューを確認...');
  const existing = await lineApi(`${BASE_URL}/richmenu/list`);
  if (existing.richmenus?.length) {
    console.log(`   ${existing.richmenus.length}件 登録済み`);
    existing.richmenus.forEach(m => console.log(`   - ${m.richMenuId} (${m.name})`));
  } else {
    console.log('   登録なし');
  }

  // 2. メニュー作成
  console.log('\n② リッチメニューを作成...');
  const { richMenuId } = await lineApi(`${BASE_URL}/richmenu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(MENU_DEF),
  });
  console.log(`   richMenuId: ${richMenuId}`);

  // 3. 画像を JPEG 圧縮（LINE 上限 1MB のため）してアップロード
  console.log('\n③ 画像を圧縮してアップロード...');
  const rawBuffer = fs.readFileSync(imgPath);
  const imageBuffer = await sharp(rawBuffer)
    .resize(2500, 1686, { fit: 'cover' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  const kb = Math.round(imageBuffer.length / 1024);
  console.log(`   圧縮後: ${kb}KB`);
  if (imageBuffer.length > 1024 * 1024) {
    console.warn(`   ⚠ 1MB 超 (${kb}KB)。品質を下げて再圧縮します...`);
    const smaller = await sharp(rawBuffer)
      .resize(2500, 1686, { fit: 'cover' })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();
    console.log(`   再圧縮後: ${Math.round(smaller.length / 1024)}KB`);
    await lineApi(`${DATA_URL}/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: smaller,
    });
  } else {
    await lineApi(`${DATA_URL}/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: imageBuffer,
    });
  }
  console.log('   アップロード完了');

  // 4. デフォルト設定
  console.log('\n④ デフォルトリッチメニューに設定...');
  await lineApi(`${BASE_URL}/user/all/richmenu/${richMenuId}`, { method: 'POST' });
  console.log('   設定完了');

  console.log(`\n✓ デプロイ完了: ${richMenuId}`);
  console.log('LINE公式アカウントのチャットを開いてリッチメニューを確認してください。');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
