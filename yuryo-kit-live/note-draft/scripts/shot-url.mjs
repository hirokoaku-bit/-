import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// usage: node scripts/shot-url.mjs <url> <outPath> [width] [height] [full|viewport]
const [, , url, outRel, width = '1280', height = '800', mode = 'viewport'] = process.argv;
if (!url || !outRel) {
  console.error('usage: node scripts/shot-url.mjs <url> <outPath> [width] [height] [full|viewport]');
  process.exit(1);
}

const outputPath = path.resolve(process.cwd(), outRel);
await mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 2, // note掲載に耐える解像度で撮る
});

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(1500); // 画像の遅延読み込み待ち
  await page.screenshot({ path: outputPath, fullPage: mode === 'full' });
  console.log(outputPath);
} finally {
  await browser.close();
}
