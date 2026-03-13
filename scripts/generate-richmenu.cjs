/**
 * scripts/generate-richmenu.cjs
 *
 * 新デザインのリッチメニュー画像を生成する。
 *
 * 使用方法:
 *   node scripts/generate-richmenu.cjs
 *
 * 出力:
 *   designs/richmenu-tab-a.png  (2500×843 — Tab A: はじめての方)
 *   designs/richmenu-tab-b.png  (2500×843 — Tab B: ご愛用の方)
 */

const puppeteer = require('puppeteer');
const path = require('path');

const DESIGNS_DIR = path.resolve(__dirname, '..', 'designs');

const TARGETS = [
  { html: 'richmenu-tab-a.html', png: 'richmenu-tab-a.png', w: 2500, h: 843 },
  { html: 'richmenu-tab-b.html', png: 'richmenu-tab-b.png', w: 2500, h: 843 },
];

async function generate({ html, png, w, h }) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });

  const filePath = path.join(DESIGNS_DIR, html);
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle2', timeout: 30000 });

  // Google Fonts の読み込みを待機（ネット接続あり）
  await new Promise(r => setTimeout(r, 3000));

  const outPath = path.join(DESIGNS_DIR, png);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`✓ ${png}`);

  await browser.close();
}

(async () => {
  for (const target of TARGETS) {
    try {
      await generate(target);
    } catch (e) {
      console.error(`✗ ${target.html}:`, e.message);
    }
  }
  console.log('\n完了: designs/ に PNG が保存されました。');
  console.log('次のステップ: node scripts/deploy-richmenu.cjs を実行してLINEに登録してください。');
})();
