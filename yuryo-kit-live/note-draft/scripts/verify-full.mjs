import { chromium } from 'playwright';
import { resolve } from 'node:path';
const url = process.argv[2];
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ storageState: resolve('storage/note-auth.json'), viewport: { width: 1000, height: 1400 } });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('textarea[placeholder="記事タイトル"]', { timeout: 45000 });
await page.waitForTimeout(2500);
// 画像の前後テキストで位置を確認：本文中のノード順に、段落テキスト先頭とimgをダンプ
const seq = await page.evaluate(() => {
  const editor = document.querySelector('div[contenteditable="true"][role="textbox"]');
  const out = [];
  editor.childNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    const el = n;
    if (el.querySelector && el.querySelector('img')) out.push('🖼️ [画像]');
    else { const t = (el.textContent||'').trim(); if (t) out.push(t.slice(0, 30)); }
  });
  return out;
});
console.log(seq.join('\n'));
// 見出しの番号（「## 1. タイトル」の 1.）が番号リストに変換されていないかを見る。
// 本文に番号リストを書いた記事では、その項目数ぶんだけ数が出るのが正常。
const ol = await page.evaluate(() => document.querySelectorAll('div[contenteditable="true"] ol li').length);
console.log('\n番号付きリストの項目数:', ol);
console.log('  → 本文に番号リストを書いていないのに0でないときは、見出しの番号が変換されています。');
await page.screenshot({ path: 'screenshots/verify-full.png', fullPage: true });
await browser.close();
