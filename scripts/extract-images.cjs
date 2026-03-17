const fs = require('fs');
const html = fs.readFileSync('c:/Users/tsuba/Downloads/kinmokusei_backbone (1).html', 'utf8');
const outDir = 'c:/Users/tsuba/Desktop/base_kinmokusei/public/liff/craftsman/tsuba';
fs.mkdirSync(outDir, { recursive: true });

const all = [];
const r1 = /src="(data:image\/[^;]+;base64,([^"]+))"/g;
let m;
while ((m = r1.exec(html)) !== null) all.push({ pos: m.index, data: m[2] });

const r2 = /background-image:\s*url\('(data:image\/[^;]+;base64,([^']+))'\)/g;
while ((m = r2.exec(html)) !== null) all.push({ pos: m.index, data: m[2], bg: true });

all.sort((a, b) => a.pos - b.pos);

const names = ['hero-bg', 'ep1', 'ep2', 'ep3', 'future'];
all.forEach((img, i) => {
  const buf = Buffer.from(img.data, 'base64');
  const name = (names[i] || 'img' + i) + '.jpg';
  fs.writeFileSync(outDir + '/' + name, buf);
  console.log('saved', name, Math.round(buf.length / 1024) + 'KB');
});
