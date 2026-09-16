import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parseArticle } from './articleParser.js';
import { validateArticle } from './articleValidator.js';
import { runLogin, hasSavedAuth } from './noteSession.js';
import { createDraft } from './noteDraftWriter.js';
import { resolveRuntimeOptions } from './config.js';
import { STORAGE_DIR, LOGS_DIR, SCREENSHOTS_DIR, ROOT, PROFILE_PATH } from './paths.js';
import { logger } from './logger.js';
import { postDraftLines } from './postDraftInfo.js';
import { resolve } from 'node:path';

/** 一覧が長くなりすぎないよう、上限まで並べて残りは件数で示す */
function listUpTo(items: string[], max: number): string {
  if (items.length <= max) return items.join(' / ');
  return `${items.slice(0, max).join(' / ')} ほか${items.length - max}件`;
}

/**
 * 設定ファイル（~/yuryo-kit-live/profile.md）を点検する。
 * ここが空だと、記事がその人の文章にならず、価格も有料ラインも決められない。
 */
function checkProfile(): void {
  console.log('\n== 設定ファイル ==');
  if (!existsSync(PROFILE_PATH)) {
    console.log(`✗ 設定ファイルが見つかりません: ${PROFILE_PATH}`);
    console.log('  キットは ~/yuryo-kit-live（ユーザーフォルダの直下）に置いてください。');
    return;
  }
  const text = readFileSync(PROFILE_PATH, 'utf8');

  // 埋まっていないと有料noteが作れない節（導入の質問で「粘る」と決めているもの）
  const CRITICAL = ['2. 誰に向けて書くか', '3. 文章のトーン', '6. 売る記事のこと'];
  // 空欄のままでも動く節
  const OPTIONAL = ['7. 画像の好み', '9. あなたらしさを深める'];

  const blanks: string[] = [];
  let section = '';
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      section = h[1].split('（')[0].trim();
      continue;
    }
    if (!section || OPTIONAL.includes(section)) continue;
    const t = line.trim();
    if (!/^\|.*\|$/.test(t)) continue;
    if (/^\|[\s:|-]+\|$/.test(t)) continue; // 区切り行
    const cells = t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 2) continue;
    if (cells[0] === '項目' && cells[1] === '内容') continue; // 見出し行
    if (cells.slice(1).every((c) => c.length === 0) && !blanks.includes(section)) blanks.push(section);
  }

  // 文章のサンプルが一番効く。ひな形の文字が残っていたら空とみなす
  const sampleEmpty = text.includes('（ここに貼る）');
  if (sampleEmpty && !blanks.includes('3. 文章のトーン')) blanks.push('3. 文章のトーン');

  if (blanks.length === 0) {
    console.log('✓ profile.md は必要なところが埋まっています');
    return;
  }

  const critical = blanks.filter((b) => CRITICAL.includes(b));
  const rest = blanks.filter((b) => !CRITICAL.includes(b));

  if (critical.length) {
    console.log(`✗ profile.md の次の項目が空です: ${listUpTo(critical, 5)}`);
    console.log('  ここが空だと、有料noteは作れません。Claudeに「セットアップして」と伝えれば、質問しながら埋めてくれます。');
  }
  if (rest.length) {
    console.log(`△ profile.md に空欄があります: ${listUpTo(rest, 5)}`);
    console.log('  空でも動きますが、埋めるほど記事が自分に近づきます。');
  }
  if (sampleEmpty) {
    console.log('  とくに「あなたが書いた文章のサンプル」は、埋めないと記事があなたの文章になりません。');
  }
}

const program = new Command();
program.name('note-auto-draft').description('note.com へ記事を自動で「下書き入稿」するローカルツール（公開はしない）');

// ---- doctor ----
program
  .command('doctor')
  .description('実行環境と設定を点検する')
  .action(() => {
    const ok = (b: boolean) => (b ? '✓' : '✗');
    let node = '', npm = '', pw = '', codex = '';
    try { node = process.version; } catch { /* noop */ }
    try { npm = execSync('npm -v').toString().trim(); } catch { /* noop */ }
    try { pw = execSync('npx playwright --version', { cwd: ROOT }).toString().trim(); } catch { /* noop */ }
    try { codex = execSync('codex --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* noop */ }

    const pwCache = process.platform === 'win32'
      ? resolve(process.env.LOCALAPPDATA ?? resolve(process.env.USERPROFILE ?? '', 'AppData/Local'), 'ms-playwright')
      : process.platform === 'darwin'
        ? resolve(process.env.HOME ?? '', 'Library/Caches/ms-playwright')
        : resolve(process.env.HOME ?? '', '.cache/ms-playwright');
    const chromium = existsSync(pwCache);
    const gi = existsSync(resolve(ROOT, '.gitignore')) ? readFileSync(resolve(ROOT, '.gitignore'), 'utf8') : '';
    const gitignoreOk = gi.includes('note-auth.json') && gi.includes('.env');

    console.log('== doctor ==');
    console.log(`${ok(!!node)} Node.js ${node}`);
    console.log(`${ok(!!npm)} npm ${npm}`);
    console.log(`${ok(!!pw)} Playwright ${pw}`);
    console.log(`${ok(chromium)} Chromium (ms-playwright cache)`);
    console.log(`${ok(existsSync(STORAGE_DIR))} storage/`);
    console.log(`${ok(existsSync(LOGS_DIR))} logs/`);
    console.log(`${ok(existsSync(SCREENSHOTS_DIR))} screenshots/`);
    console.log(`${ok(gitignoreOk)} .gitignore に秘密ファイル（note-auth.json / .env）が入っている`);
    console.log(`${ok(hasSavedAuth())} 保存済みログイン状態 storage/note-auth.json（無ければ npm run login）`);
    console.log(codex
      ? `✓ 画像づくりの道具 Codex ${codex}（見出し画像・図解・イラストが作れます）`
      : '- 画像づくりの道具 Codex（未導入）… 図解は作れます。見出し画像とイラストも作るなら npm install -g @openai/codex');

    checkProfile();
  });

// ---- login ----
program
  .command('login')
  .description('ブラウザで手動ログインし、ログイン状態だけを保存する')
  .action(async () => {
    await runLogin();
  });

// ---- dry-run ----
program
  .command('dry-run')
  .argument('<dir>', '記事フォルダ（例: articles/sample）')
  .description('note にアクセスせず、記事フォルダの中身だけ検証する')
  .action((dir: string) => {
    const article = parseArticle(dir);
    const result = validateArticle(article);
    console.log('\n== dry-run ==');
    console.log(`記事フォルダ: ${dir}`);
    console.log(`タイトル: ${article.frontmatter.title || '(なし)'}`);
    console.log(`本文文字数: ${article.bodyText.length.toLocaleString()}`);
    console.log(`本文画像: ${article.images.length}枚`);
    console.log(`サムネイル: ${article.frontmatter.thumbnail ?? '(なし)'}`);
    console.log(`タグ: ${article.frontmatter.tags?.join(', ') ?? '(なし)'}`);
    if (result.issues.length) {
      console.log('\n-- チェック --');
      for (const i of result.issues) console.log(`${i.level === 'error' ? '✗ ERROR' : '△ WARN '} ${i.message}`);
    }
    console.log(`\n結果: ${result.ok ? 'OK（note にはまだアクセスしていません）' : 'NG（上の ERROR を直してください）'}`);
    if (!result.ok) process.exitCode = 1;
  });

// ---- draft ----
program
  .command('draft')
  .argument('<dir>', '記事フォルダ（例: articles/sample）')
  .option('--headed', 'ブラウザを見える状態で実行（既定）', true)
  .option('--headless', 'ブラウザを見せずに実行')
  .option('--pause-on-error', '終了時/失敗時にブラウザを閉じない')
  .option('--no-inline-images', '画像を本文中に挿入せず末尾にまとめる（安定重視）')
  .description('記事を note の下書きまで入稿する（公開はしない）')
  .action(async (dir: string, options: { headed?: boolean; headless?: boolean; pauseOnError?: boolean; inlineImages?: boolean }) => {
    if (!hasSavedAuth()) {
      logger.error('保存済みログイン状態がありません。先に `npm run login` を実行してください。');
      process.exitCode = 1;
      return;
    }
    const article = parseArticle(dir);
    const validation = validateArticle(article);
    for (const i of validation.issues) {
      if (i.level === 'error') logger.error(i.message);
      else logger.warn(i.message);
    }
    if (!validation.ok) {
      logger.error('検証エラーのため中止します（note にはアクセスしていません）。');
      process.exitCode = 1;
      return;
    }

    const opts = resolveRuntimeOptions({
      headed: options.headless ? false : true,
      pauseOnError: !!options.pauseOnError,
      inlineImages: options.inlineImages !== false,
    });

    logger.info({ dir, headed: opts.headed, inlineImages: opts.inlineImages }, '下書き作成を開始します');
    const result = await createDraft(article, opts);

    console.log('\n== draft result ==');
    if (result.ok) {
      console.log('✓ 下書き保存まで完了しました（公開はしていません）');
      console.log(`  下書きURL: ${result.draftUrl}`);
      console.log(`  本文画像: ${result.imagesInserted}枚 挿入`);
      console.log(`  サムネイル: ${result.thumbnailSet ? '設定済み' : '未設定'}`);
      console.log(`  スクリーンショット: ${result.screenshot}`);

      // 有料noteは、下書きができただけでは売れる状態にならない。
      // AIの説明に頼らず、記事フォルダと profile.md から読める分は機械が必ず出す。
      console.log('\n  -- ここから先は、あなたの手で設定してください --');
      for (const line of postDraftLines(dir, article.frontmatter.tags)) console.log(line);
      console.log('\n  有料設定・価格の入力・有料ラインの設定・公開は、note の編集画面でご自身の手で行ってください。');
      console.log('  ここは自動化していません。');
    } else {
      console.log('✗ 失敗しました。');
      console.log(`  理由: ${result.error}`);
      console.log('  logs/ と screenshots/ を確認してください。--pause-on-error で画面を見ながら調べられます。');
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
