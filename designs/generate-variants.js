/**
 * スタイルバリアント 4種を一括生成
 * 1プロンプトで6アイコンをグリッド描写 → 統一感を確保
 * 実行: node generate-variants.js
 */
require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY が .env にありません'); process.exit(1); }

// 6アイコンの内容説明（共通）
const ICON_SUBJECTS = `
top-left: concentric tree ring cross-section with natural irregular rings (wood diagnosis),
top-center: diagonal wood barrel fountain pen with nib tip (online shop),
top-right: single leaf with fine detailed veins (wood encyclopedia),
bottom-left: paulownia gift box with open lid and elegant mizuhiki knot (new arrivals),
bottom-center: woodcarving chisel with curled wood shaving (craftsman consult),
bottom-right: furoshiki cloth-wrapped package with butterfly knot on top (order status)
`.trim();

const VARIANTS = [
  {
    dir: 'variant-a',
    name: '黒金 — 漆黒×純金',
    prompt: `Japanese minimalist icon set, 6 icons arranged in a 3-column by 2-row grid on a single image, each icon in its own square cell separated by thin gold lines. Icons: ${ICON_SUBJECTS}. Style: ultra-thin gold ink line art on pure matte black background, each icon is a clean elegant silhouette, zen aesthetic, woodcraft artisan, consistent line weight across all icons, no text, no letters, no numbers, no labels`,
    aspectRatio: '4:3',
  },
  {
    dir: 'variant-b',
    name: '白墨 — 和紙×墨',
    prompt: `Japanese minimalist icon set, 6 icons arranged in a 3-column by 2-row grid on a single image, each icon in its own square cell with subtle dividers. Icons: ${ICON_SUBJECTS}. Style: thin ink brushwork on warm cream washi paper texture, each icon is a refined silhouette in dark sumi-ink, traditional Japanese illustration style, consistent brush weight across all icons, no text, no letters, no numbers, no labels`,
    aspectRatio: '4:3',
  },
  {
    dir: 'variant-c',
    name: '紫金 — 深紫×金',
    prompt: `Japanese minimalist icon set, 6 icons arranged in a 3-column by 2-row grid on a single image, each icon in its own square cell. Icons: ${ICON_SUBJECTS}. Style: thin line art using soft lavender purple and muted gold on very dark charcoal background, elegant Japanese craft aesthetic, each icon glows softly, consistent thin line weight across all icons, no text, no letters, no numbers, no labels`,
    aspectRatio: '4:3',
  },
  {
    dir: 'variant-d',
    name: '銀白 — ミニマル線画',
    prompt: `Japanese minimalist icon set, 6 icons arranged in a 3-column by 2-row grid on a single image, each icon in its own square cell. Icons: ${ICON_SUBJECTS}. Style: ultra-thin silver-white line art on deep navy-black background, geometric precision, clean modern Japanese design, each icon has minimal details only essential lines, consistent ultra-fine line weight across all icons, no text, no letters, no numbers, no labels`,
    aspectRatio: '4:3',
  },
];

async function generateVariant(variant) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`;
  const body = {
    instances: [{ prompt: variant.prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: variant.aspectRatio,
      outputOptions: { mimeType: 'image/png' },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('画像データなし: ' + JSON.stringify(data).slice(0, 200));

  const outDir = path.join(__dirname, 'icons', variant.dir);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'composite.png');
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`✓ ${variant.dir} (${kb}KB) — ${variant.name}`);
}

(async () => {
  console.log('4バリアントを順次生成中...\n');
  for (const v of VARIANTS) {
    process.stdout.write(`生成中: ${v.dir} (${v.name}) ... `);
    try {
      await generateVariant(v);
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`✗ ${e.message}`);
    }
  }
  console.log('\n完了。icons/variant-a〜d/composite.png を確認してください。');
})();
