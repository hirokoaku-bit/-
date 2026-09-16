import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArticle } from '../src/articleParser.js';

// 有料noteでは、有料ラインの目印をHTMLコメントで本文に書くことがある。
// これがそのままnoteに出てしまうと、読者に内部の目印が見えてしまう。
const TMP = resolve(process.cwd(), 'tests/.tmp-comment');

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(
    resolve(TMP, 'article.md'),
    [
      '---',
      'title: コメントのテスト',
      '---',
      '',
      '無料パートの最後の1行です。',
      '',
      '<!-- ここから有料 -->',
      '',
      '有料パートの1行目です。',
      '',
      '文の途中に<!-- メモ -->コメントがある段落です。',
      '',
      '<!--',
      '複数行にまたがる',
      'コメントです',
      '-->',
      '',
      '最後の段落。',
    ].join('\n'),
  );
});

describe('HTMLコメントの除去', () => {
  it('コメントだけの行は、本文のブロックにならない', () => {
    const a = parseArticle(TMP);
    const texts = a.lines.map((l) => ('text' in l ? l.text : ''));
    expect(texts.some((t) => t.includes('ここから有料'))).toBe(false);
    expect(texts).toContain('無料パートの最後の1行です。');
    expect(texts).toContain('有料パートの1行目です。');
  });

  it('文の途中のコメントだけが消え、前後の文は残る', () => {
    const a = parseArticle(TMP);
    const texts = a.lines.map((l) => ('text' in l ? l.text : ''));
    expect(texts).toContain('文の途中にコメントがある段落です。');
  });

  it('複数行にまたがるコメントも消える', () => {
    const a = parseArticle(TMP);
    const texts = a.lines.map((l) => ('text' in l ? l.text : ''));
    expect(texts.some((t) => t.includes('複数行にまたがる'))).toBe(false);
    expect(texts).toContain('最後の段落。');
  });

  it('文字数の計算にもコメントが混ざらない', () => {
    const a = parseArticle(TMP);
    expect(a.bodyText).not.toContain('ここから有料');
    expect(a.bodyText).not.toContain('メモ');
  });
});
