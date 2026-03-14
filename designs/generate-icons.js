/**
 * Gemini Imagen 3 でリッチメニューアイコンを生成
 * 実行: node generate-icons.js
 */
require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY が .env にありません'); process.exit(1); }

const ICONS = [
  {
    file: 'icon1_diagnosis.png',
    prompt: 'Japanese minimalist icon, wood tree ring cross section, concentric circles like annual rings, slightly irregular rings, elegant gold ink line art on pure matte black background, zen aesthetic, woodcraft, no text, no letters, square format',
  },
  {
    file: 'icon2_shop.png',
    prompt: 'Japanese minimalist icon, luxury wood barrel fountain pen diagonal view, elegant silhouette with nib tip, gold ink line art on pure matte black background, artisan woodcraft pen, no text, no letters, square format',
  },
  {
    file: 'icon3_encyclopedia.png',
    prompt: 'Japanese botanical minimalist icon, single leaf with detailed elegant veins, gold ink line art on pure matte black background, zen nature illustration, no text, no letters, square format',
  },
  {
    file: 'icon4_new.png',
    prompt: 'Japanese traditional minimalist icon, paulownia kiri wood gift box open lid with elegant mizuhiki knot decoration, gold ink line art on pure matte black background, artisan craft, no text, no letters, square format',
  },
  {
    file: 'icon5_consult.png',
    prompt: 'Japanese craftsman minimalist icon, wood carving chisel tool with curled wood shaving, artisan nomi chisel, gold ink line art on pure matte black background, woodworking craft, no text, no letters, square format',
  },
  {
    file: 'icon6_order.png',
    prompt: 'Japanese traditional minimalist icon, furoshiki cloth wrapped package with elegant butterfly knot on top, gold ink line art on pure matte black background, traditional Japanese wrapping, no text, no letters, square format',
  },
];

async function generateIcon(icon) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`;
  const body = {
    instances: [{ prompt: icon.prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
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
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('画像データが返ってきませんでした: ' + JSON.stringify(data).slice(0, 200));

  const outPath = path.join(__dirname, 'icons', icon.file);
  fs.mkdirSync(path.join(__dirname, 'icons'), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log(`✓ ${icon.file} (${Math.round(fs.statSync(outPath).size / 1024)}KB)`);
}

(async () => {
  for (const icon of ICONS) {
    process.stdout.write(`生成中: ${icon.file} ... `);
    try {
      await generateIcon(icon);
      await new Promise(r => setTimeout(r, 1500)); // レート制限対策
    } catch (e) {
      console.error(`✗ ${e.message}`);
    }
  }
  console.log('\n完了。icons/ フォルダを確認してください。');
})();
