import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROFILE_PATH } from './paths.js';

/**
 * 入稿が終わったあと、人が手で設定する項目を組み立てる。
 *
 * 有料noteは、下書きができただけでは売れる状態にならない。
 * AIの説明に頼ると忘れられるので、記事フォルダと profile.md から読める分は機械が必ず出す。
 */

/** profile.md の表から「| ラベル | 内容 |」の内容を1つ取る。空欄なら undefined */
export function profileValue(label: string, profilePath: string = PROFILE_PATH): string | undefined {
  if (!existsSync(profilePath)) return undefined;
  const m = readFileSync(profilePath, 'utf8').match(new RegExp(`\\|\\s*${label}[^|]*\\|([^|]*)\\|`));
  const v = m?.[1]?.trim();
  return v && v.length > 0 ? v : undefined;
}

/**
 * 有料ラインの直後にくる見出しを返す。
 * note側で「有料エリア設定」の帯を置く位置は、この見出しの直前になる。
 */
export function paywallHeading(dir: string): string | undefined {
  const p = resolve(dir, 'article.md');
  if (!existsSync(p)) return undefined;
  const lines = readFileSync(p, 'utf8').split('\n');
  const i = lines.findIndex((l) => /<!--\s*ここから有料\s*-->/.test(l));
  if (i === -1) return undefined;
  for (let j = i + 1; j < lines.length; j++) {
    const m = lines[j].match(/^#{2,3}\s+(.+)$/);
    if (m) return m[1].trim();
  }
  return undefined;
}

/**
 * 価格の工程で決めた値段を返す。article.md の先頭（frontmatter）の price: に書く。
 * profile.md の「価格帯」は決める前の目安なので、販売価格としては出さない。
 */
export function articlePrice(dir: string): string | undefined {
  const p = resolve(dir, 'article.md');
  if (!existsSync(p)) return undefined;
  const fm = readFileSync(p, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const raw = fm?.[1].match(/^price:[ \t]*(.*)$/m)?.[1];
  const v = raw?.replace(/^["']|["']$/g, '').trim();
  if (!v) return undefined;
  return /^\d+$/.test(v) ? `${Number(v).toLocaleString('ja-JP')}円` : v;
}

/** 入稿後に画面へ出す4行を作る */
export function postDraftLines(dir: string, tags: string[] | undefined, profilePath: string = PROFILE_PATH): string[] {
  const heading = paywallHeading(dir);
  const price = articlePrice(dir);
  const range = profileValue('価格帯', profilePath);
  const refund = profileValue('返金申請を受け付けるか', profilePath);
  const priceText = price
    ?? (range
      ? `記事フォルダに値段が書かれていません（article.md の price:）。決める前の目安は ${range} でした`
      : '記事フォルダの値段（article.md の price:）も、profile.md の「6. 売る記事のこと」の価格帯も空欄です');
  return [
    `  1. 有料ラインの位置 … ${heading ? `見出し「${heading}」の直前` : '本文に <!-- ここから有料 --> が無いため分かりません'}`,
    `  2. 販売価格 … ${priceText}`,
    `  3. 返金申請の設定 … ${refund ?? 'profile.md の「6-3」が空欄です。何もしないと「受け付ける」状態で公開されます'}`,
    `  4. タグ（下書き画面で貼る） … ${tags && tags.length ? tags.join(' / ') : '（なし）'}`,
  ];
}
