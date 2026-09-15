import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// usage: node scripts/annotate.mjs <in.png> <out.png> '<注釈のJSON>'
//
// 注釈のJSONは配列。座標は入力画像のピクセル（左上が 0,0）。
//   {"type":"box",  "x":10,"y":20,"w":300,"h":80}          … 赤い枠で囲む
//   {"type":"arrow","x1":10,"y1":20,"x2":300,"y2":80}      … 赤い矢印（x2,y2 が矢印の先）
//   {"type":"text", "x":10,"y":20,"value":"ここを押す"}      … 赤い太字（size で大きさ指定可）
const [, , inRel, outRel, jsonArg] = process.argv;
if (!inRel || !outRel || !jsonArg) {
  console.error('usage: node scripts/annotate.mjs <in.png> <out.png> \'[{"type":"box","x":10,"y":20,"w":300,"h":80}]\'');
  process.exit(1);
}

let items;
try {
  items = JSON.parse(jsonArg);
} catch {
  console.error('注釈の指定（JSON）が読み取れませんでした。引数はシングルクォートで囲んでください。');
  process.exit(1);
}
if (!Array.isArray(items) || items.length === 0) {
  console.error('注釈がひとつもありません。');
  process.exit(1);
}

const inPath = path.resolve(process.cwd(), inRel);
const outPath = path.resolve(process.cwd(), outRel);
const buf = await readFile(inPath);

// PNGのヘッダから元画像の大きさを読む
if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) {
  console.error('PNG以外の画像には未対応です。スクリーンショットはPNGで保存してください。');
  process.exit(1);
}
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

const RED = '#E03131';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const boxes = items
  .filter((it) => it.type === 'box')
  .map((it) => `<div style="position:absolute;left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px;`
    + `border:${it.weight ?? 6}px solid ${RED};border-radius:10px;box-sizing:border-box"></div>`)
  .join('');

const texts = items
  .filter((it) => it.type === 'text')
  .map((it) => `<div style="position:absolute;left:${it.x}px;top:${it.y}px;color:${RED};font-weight:900;`
    + `font-size:${it.size ?? 34}px;line-height:1.3;font-family:'Hiragino Sans','Noto Sans JP','Yu Gothic',sans-serif;`
    + `text-shadow:0 0 8px #fff,0 0 8px #fff,0 0 8px #fff,0 0 8px #fff;white-space:pre">${esc(it.value)}</div>`)
  .join('');

const arrows = items
  .filter((it) => it.type === 'arrow')
  .map((it) => `<line x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}" stroke="${RED}" `
    + `stroke-width="${it.weight ?? 10}" stroke-linecap="round" marker-end="url(#arrowhead)"/>`)
  .join('');

const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden}</style>
<div style="position:relative;width:${width}px;height:${height}px">
  <img src="data:image/png;base64,${buf.toString('base64')}" style="display:block;width:${width}px;height:${height}px">
  ${boxes}
  <svg style="position:absolute;left:0;top:0" width="${width}" height="${height}">
    <defs><marker id="arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
      <path d="M0,0 L5,2.5 L0,5 z" fill="${RED}"/>
    </marker></defs>
    ${arrows}
  </svg>
  ${texts}
</div>`;

await mkdir(path.dirname(outPath), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: outPath });
await browser.close();
console.log(`${outPath} (${width}x${height} / 注釈 ${items.length}件)`);
