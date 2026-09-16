import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { paywallHeading, profileValue, postDraftLines, articlePrice } from '../src/postDraftInfo.js';

// 入稿後に「あなたの手で設定してください」と出す4行を組み立てる部分
const TMP = resolve(process.cwd(), 'tests/.tmp-postdraft');
const PROFILE = resolve(TMP, 'profile.md');

function article(name: string, body: string, extraFrontmatter = '') {
  const dir = resolve(TMP, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'article.md'), `---\ntitle: テスト\n${extraFrontmatter}---\n\n${body}\n`, 'utf8');
  return dir;
}

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(PROFILE, [
    '## 6. 売る記事のこと',
    '| 項目 | 内容 |',
    '|---|---|',
    '| 何を教える記事か | AIで議事録を作る |',
    '| 価格帯（いくらで売りたいか） | 1,980円 |',
    '',
    '## 6-3. 返金について',
    '| 項目 | 内容 |',
    '|---|---|',
    '| 返金申請を受け付けるか（受け付ける／受け付けない） | 受け付けない |',
  ].join('\n'), 'utf8');
});

describe('有料ラインの位置', () => {
  it('目印の直後にくる見出しを返す', () => {
    const dir = article('ok', '無料。\n\n<!-- ここから有料 -->\n\n## 第1章：はじめの一歩\n\n本文。');
    expect(paywallHeading(dir)).toBe('第1章：はじめの一歩');
  });

  it('目印が無ければ undefined', () => {
    const dir = article('none', '## 第1章\n\n本文。');
    expect(paywallHeading(dir)).toBeUndefined();
  });

  it('目印のあとに見出しが無ければ undefined', () => {
    const dir = article('nohead', '無料。\n\n<!-- ここから有料 -->\n\n本文だけ。');
    expect(paywallHeading(dir)).toBeUndefined();
  });
});

describe('profile.md から読む', () => {
  it('価格帯と返金の設定を読む', () => {
    expect(profileValue('価格帯', PROFILE)).toBe('1,980円');
    expect(profileValue('返金申請を受け付けるか', PROFILE)).toBe('受け付けない');
  });

  it('空欄なら undefined', () => {
    const empty = resolve(TMP, 'empty.md');
    writeFileSync(empty, '| 価格帯（いくらで売りたいか） | |', 'utf8');
    expect(profileValue('価格帯', empty)).toBeUndefined();
  });
});

describe('記事フォルダの値段', () => {
  it('数字だけなら、3桁区切りと「円」を付ける', () => {
    expect(articlePrice(article('p1', '本文。', 'price: 1280\n'))).toBe('1,280円');
  });

  it('「円」付きで書いてあれば、そのまま出す', () => {
    expect(articlePrice(article('p2', '本文。', 'price: "1,480円"\n'))).toBe('1,480円');
  });

  it('書いていなければ undefined', () => {
    expect(articlePrice(article('p3', '本文。'))).toBeUndefined();
  });
});

describe('入稿後に出す4行', () => {
  it('そろっていれば、そのまま設定できる内容が出る', () => {
    const dir = article('full', '無料。\n\n<!-- ここから有料 -->\n\n## 手順\n\n本文。', 'price: 1280\n');
    const lines = postDraftLines(dir, ['note', 'AI副業'], PROFILE);
    expect(lines[0]).toContain('見出し「手順」の直前');
    expect(lines[1]).toContain('1,280円');
    expect(lines[1]).not.toContain('1,980円');
    expect(lines[2]).toContain('受け付けない');
    expect(lines[3]).toContain('note / AI副業');
  });

  it('記事フォルダに値段が無ければ、価格帯を販売価格として出さない', () => {
    const dir = article('noprice', '本文。');
    const lines = postDraftLines(dir, undefined, PROFILE);
    expect(lines[1]).toContain('price:');
    expect(lines[1]).toContain('目安は 1,980円');
  });

  it('空欄のときは、どこを埋めればよいかを出す', () => {
    const dir = article('empty2', '本文だけ。');
    const empty = resolve(TMP, 'empty2.md');
    writeFileSync(empty, '（表なし）', 'utf8');
    const lines = postDraftLines(dir, undefined, empty);
    expect(lines[0]).toContain('ここから有料');
    expect(lines[1]).toContain('空欄');
    expect(lines[2]).toContain('受け付ける');
    expect(lines[3]).toContain('なし');
  });
});
