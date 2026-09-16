import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** プロジェクトルート（src の1つ上） */
export const ROOT = resolve(here, '..');

export const STORAGE_DIR = resolve(ROOT, 'storage');
export const LOGS_DIR = resolve(ROOT, 'logs');
export const SCREENSHOTS_DIR = resolve(ROOT, 'screenshots');
export const ARTICLES_DIR = resolve(ROOT, 'articles');

/** キットの置き場（note-draft の1つ上） */
export const KIT_ROOT = resolve(ROOT, '..');
/** 設定ファイル。読者・文体・価格帯・約束・有料ライン・分量・特典・誘導先を書く */
export const PROFILE_PATH = resolve(KIT_ROOT, 'profile.md');

/** 保存済みログイン状態の保存先（秘密情報扱い・.gitignore済み） */
export const AUTH_STATE_PATH = resolve(STORAGE_DIR, 'note-auth.json');
