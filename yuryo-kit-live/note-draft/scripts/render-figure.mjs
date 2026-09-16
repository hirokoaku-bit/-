import { chromium } from 'playwright';
import { resolve } from 'node:path';

const [, , htmlPath, outPath, wArg, hArg, fullArg] = process.argv;
if (!htmlPath || !outPath) {
  console.error('usage: node scripts/render-figure.mjs <html> <out.png> [width] [height] [full]');
  console.error('  full を付けると、中身の高さに合わせて切り出す（高さの指定と中身がずれても欠けない）');
  process.exit(1);
}
const full = fullArg === 'full';
const width = Number(wArg) || 1600;
const height = Number(hArg) || 900;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 2,
});
await page.goto('file://' + resolve(htmlPath), { waitUntil: 'networkidle' });
await page.screenshot({ path: outPath, fullPage: full });
await browser.close();
console.log(`${outPath} (${width}x${full ? '中身の高さ' : height} @2x)`);
