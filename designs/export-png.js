const puppeteer = require('puppeteer');
const path = require('path');

async function exportRichMenu(filename) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setViewport({ width: 2500, height: 1686, deviceScaleFactor: 1 });

  const filePath = path.resolve(__dirname, filename);
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle2', timeout: 30000 });

  // フォント読み込み待機
  await new Promise(r => setTimeout(r, 2500));

  const outName = filename.replace('.html', '.png');
  await page.screenshot({ path: path.resolve(__dirname, outName), fullPage: false });
  console.log(`✓ Saved: ${outName}`);

  await browser.close();
}

(async () => {
  const targets = ['richmenu-f.html', 'richmenu-e.html', 'richmenu-a.html', 'richmenu-c2.html'];
  for (const f of targets) {
    try {
      await exportRichMenu(f);
    } catch (e) {
      console.error(`✗ ${f}:`, e.message);
    }
  }
})();
