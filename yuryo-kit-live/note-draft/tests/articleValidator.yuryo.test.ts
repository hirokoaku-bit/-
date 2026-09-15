import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArticle } from '../src/articleParser.js';
import { validateArticle } from '../src/articleValidator.js';

// 有料note向けの検査（差し込み待ちの印・書きかけの文字・個人情報・有料ライン・文字数）
const TMP = resolve(process.cwd(), 'tests/.tmp-yuryo');

function make(name: string, body: string) {
  const dir = resolve(TMP, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'article.md'), `---\ntitle: テスト\n---\n\n${body}\n`, 'utf8');
  return dir;
}
const check = (dir: string) => validateArticle(parseArticle(dir));
const msgs = (dir: string) => check(dir).issues.map((i) => i.message).join('\n');

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});

describe('差し込み待ちの印', () => {
  it('図と目次の印が残っていたら、入稿を止める', () => {
    const dir = make('marker', '本文。\n\n［目次］\n\n［図：3つの条件］');
    const r = check(dir);
    expect(r.ok).toBe(false);
    expect(msgs(dir)).toContain('差し込み待ちの印が 2 件');
  });

  it('印が無ければ、この検査では止めない', () => {
    const dir = make('no-marker', '本文だけです。');
    expect(msgs(dir)).not.toContain('差し込み待ちの印');
  });
});

describe('書きかけの文字', () => {
  it('コードブロックの外にあれば知らせる', () => {
    const dir = make('ph', '本文。\n\n（受け取り用のリンクをここに置きます）');
    expect(msgs(dir)).toContain('書きかけらしき文字');
  });

  it('コードブロックの中は、読者に見せる指示文なので数えない', () => {
    const dir = make('ph-code', '本文。\n\n```\n【対象URL】\n（ここに1つ貼る）\n```');
    expect(msgs(dir)).not.toContain('書きかけらしき文字');
  });
});

describe('個人情報', () => {
  it('メールアドレスと電話番号を知らせる', () => {
    const dir = make('privacy', '連絡先は sample@example.com です。電話は 03-1234-5678 です。');
    expect(msgs(dir)).toContain('メールアドレスか電話番号');
  });
});

describe('有料ライン', () => {
  it('目印が無ければ知らせる', () => {
    const dir = make('no-paywall', '本文だけです。');
    expect(msgs(dir)).toContain('有料ラインの目印');
  });

  it('目印があれば言わない', () => {
    const dir = make('paywall', '無料。\n\n<!-- ここから有料 -->\n\n有料。');
    expect(msgs(dir)).not.toContain('有料ラインの目印');
  });

  it('目印はnoteの本文に出ない', () => {
    const dir = make('paywall2', '無料。\n\n<!-- ここから有料 -->\n\n有料。');
    const texts = parseArticle(dir).lines.map((l) => ('text' in l ? l.text : ''));
    expect(texts.some((t) => t.includes('ここから有料'))).toBe(false);
  });
});
