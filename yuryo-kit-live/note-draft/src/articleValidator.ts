import { existsSync, statSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { ParsedArticle, ValidationIssue, ValidationResult } from './types.js';
import { SUPPORTED_IMAGE_EXT } from './types.js';
import { PROFILE_PATH } from './paths.js';

/** コードブロックの中は、読者に見せる指示文のひな形なので検査から外す */
function linesOutsideCode(raw: string): string[] {
  const out: string[] = [];
  let fence = false;
  for (const line of raw.split('\n')) {
    if (/^\s*```/.test(line)) { fence = !fence; continue; }
    if (!fence) out.push(line);
  }
  return out;
}

/** frontmatter を落とす */
function stripFrontmatter(raw: string): string {
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? raw.slice(m[0].length) : raw;
}

/** 画像の行と空行を除いた、実際の文字数を数える（バイトではなく文字で数える） */
function countChars(lines: string[]): number {
  return lines
    .filter((l) => !/^!\[/.test(l.trim()) && l.trim() !== '')
    .join('')
    .replace(/[\s\u3000]/g, '').length;
}

/** profile.md の「6-2. 記事の長さ」から、文字数の上限を読む */
function readLengthLimits(): { free?: number; paid?: number } {
  if (!existsSync(PROFILE_PATH)) return {};
  const text = readFileSync(PROFILE_PATH, 'utf8');
  const pick = (label: string): number | undefined => {
    const m = text.match(new RegExp(`\\|\\s*${label}[^|]*\\|([^|]*)\\|`));
    if (!m) return undefined;
    const nums = [...m[1].matchAll(/([\d,]+)\s*字/g)].map((x) => Number(x[1].replace(/,/g, '')));
    return nums.length ? Math.max(...nums) : undefined;
  };
  return { free: pick('無料パートの文字数'), paid: pick('有料パートの文字数') };
}

function isSupportedImage(p: string): boolean {
  return (SUPPORTED_IMAGE_EXT as readonly string[]).includes(extname(p).toLowerCase());
}

/**
 * note にアクセスする前のローカル検証（依頼書 §12.3, §13.3）。
 * ここで弾ければ、ブラウザを開かずに止められる。
 */
export function validateArticle(article: ParsedArticle): ValidationResult {
  const issues: ValidationIssue[] = [];

  // article.md（呼び出し前に parse 済みなので存在は保証されるが、念のため）
  if (!existsSync(article.dir)) {
    issues.push({ level: 'error', message: `記事フォルダが見つかりません: ${article.dir}` });
  }

  // タイトル
  if (!article.frontmatter.title) {
    issues.push({ level: 'error', message: 'title が空です（frontmatter に title を書いてください）' });
  } else if (article.frontmatter.title.length > 100) {
    issues.push({ level: 'warn', message: `title が長すぎる可能性があります（${article.frontmatter.title.length}文字）` });
  }

  // 本文
  if (article.bodyText.trim().length === 0) {
    issues.push({ level: 'error', message: '本文が空です' });
  }

  // 本文画像
  for (const img of article.images) {
    if (!existsSync(img.absPath)) {
      issues.push({ level: 'error', message: `本文画像が存在しません: ${img.rawPath}` });
      continue;
    }
    if (!isSupportedImage(img.absPath)) {
      issues.push({
        level: 'error',
        message: `本文画像が非対応の拡張子です（対応: ${SUPPORTED_IMAGE_EXT.join(', ')}）: ${img.rawPath}`,
      });
    }
  }

  // サムネイル（任意）。指定があるのに無い/非対応ならエラー。
  if (article.frontmatter.thumbnail) {
    const t = article.thumbnailAbsPath!;
    if (!existsSync(t)) {
      issues.push({ level: 'error', message: `サムネイルが存在しません: ${article.frontmatter.thumbnail}` });
    } else if (!isSupportedImage(t)) {
      issues.push({ level: 'error', message: `サムネイルが非対応の拡張子です: ${article.frontmatter.thumbnail}` });
    } else if (statSync(t).size > 10 * 1024 * 1024) {
      issues.push({ level: 'warn', message: 'サムネイルが10MBを超えています。アップロードに失敗する可能性があります' });
    }
  } else {
    issues.push({ level: 'warn', message: 'サムネイル（thumbnail）が未指定です。noteの見出し画像は空になります' });
  }

  // リスト行の全角スペース：note のエディタがリスト変換に失敗し、
  // 以降の見出し・段落がすべてリストに巻き込まれる（2026-08-25に実機で確認）
  const bulletFullWidth = article.lines
    .filter((l) => (l.kind === 'bullet' || l.kind === 'ordered') && l.text.includes('\u3000'))
    .map((l) => (l as { text: string }).text);
  if (bulletFullWidth.length > 0) {
    issues.push({
      level: 'error',
      message:
        `リスト行に全角スペースがあります（${bulletFullWidth.length}件）。表から変換した行も含みます。` +
        'note のリスト変換が壊れて、以降が全部箇条書きになります。' +
        `「｜」などに置き換えてください。例: ${bulletFullWidth[0].slice(0, 24)}`,
    });
  }

  // ---- ここから、有料note向けの検査 ----
  const mdPath = resolve(article.dir, 'article.md');
  const raw = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
  const body = stripFrontmatter(raw);
  const plain = linesOutsideCode(body);

  // 差し込み待ちの印の消し忘れ。このまま入稿すると、本文にそのまま出る
  const leftover = plain
    .map((l) => l.trim())
    .filter((l) => /^(［図[：:].*］|［目次］)$/.test(l));
  if (leftover.length > 0) {
    const head = leftover.slice(0, 3).join(' / ');
    issues.push({
      level: 'error',
      message:
        `差し込み待ちの印が ${leftover.length} 件残っています: ${head}` +
        (leftover.length > 3 ? ` ほか${leftover.length - 3}件` : '') +
        '。このまま入稿すると、この文字がそのまま記事に出ます。' +
        '画像に差し替えるか、使わない図なら本文から消してください。',
    });
  }

  // ひな形の文字の残り（コードブロックの中は、読者に見せる指示文なので見ない）
  const placeholders = plain
    .flatMap((l) => [...l.matchAll(/（[^）]*(?:ここに|ここへ|要記入|未記入)[^）]*）/g)].map((m) => m[0]));
  if (placeholders.length > 0) {
    issues.push({
      level: 'warn',
      message: `書きかけらしき文字が ${placeholders.length} 件あります: ${placeholders.slice(0, 3).join(' / ')}`,
    });
  }

  // 個人情報。長い記事ほど、実績のスクリーンショットや文面から紛れ込みやすい
  const privacy = [
    ...body.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g),
    ...body.matchAll(/0\d{1,4}-\d{1,4}-\d{3,4}/g),
  ].map((m) => m[0]);
  if (privacy.length > 0) {
    issues.push({
      level: 'warn',
      message:
        `メールアドレスか電話番号らしき文字が ${privacy.length} 件あります: ${[...new Set(privacy)].slice(0, 3).join(' / ')}。` +
        '自分のものなら問題ありません。他人のものが混ざっていないか確かめてください。',
    });
  }

  // 有料ラインの位置と、無料／有料の文字数
  const PAYWALL = /<!--\s*ここから有料\s*-->/;
  const idx = body.split('\n').findIndex((l) => PAYWALL.test(l));
  if (idx === -1) {
    issues.push({
      level: 'warn',
      message: '有料ラインの目印（<!-- ここから有料 -->）がありません。どこで切るかが記事フォルダに残らないので、入稿後に位置を伝えられません',
    });
  } else {
    const all = body.split('\n');
    const limits = readLengthLimits();
    const free = countChars(all.slice(0, idx));
    const paid = countChars(all.slice(idx + 1));
    if (limits.free && free > limits.free) {
      issues.push({
        level: 'warn',
        message: `無料パートが ${free.toLocaleString()}字で、profile.md の上限 ${limits.free.toLocaleString()}字を超えています`,
      });
    }
    if (limits.paid && paid > limits.paid) {
      issues.push({
        level: 'warn',
        message: `有料パートが ${paid.toLocaleString()}字で、profile.md の上限 ${limits.paid.toLocaleString()}字を超えています`,
      });
    }
  }

  const ok = !issues.some((i) => i.level === 'error');
  return { ok, issues, article };
}
