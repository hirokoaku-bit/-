# 投資・株 情報発信プロジェクト

X(旧Twitter)やウェブサイトで投資・株に関する情報をリサーチし、
「有料記事」＋「無料レター」のセットを作成して note で販売するための
作業フォルダです。

## 全体の流れ

1. **リサーチする** → `research/` に情報を貯める
   - X の投稿は `research/x_posts/`
   - ウェブ記事の要約・引用は `research/web_clips/`
   - 株価やチャートなどの生データは `research/market_data/`
   - 気になる銘柄は `research/watchlist.md`
   - 企画・ネタのアイデアは `research/ideas.md`

2. **1本の号（issue）を作る** → `issues/YYYY-MM-DD_タイトル/` を新規作成
   - `templates/` の雛形をコピーして使う
   - リサーチのまとめ → 下書き → 最終稿、の順に育てる
   - 詳しくは `issues/README.md` を参照

3. **公開前チェック** → `templates/publish_checklist.md` で確認

4. **note で公開・販売** → 公開したら `published/publish_log.csv` に記録
   - タイトル、公開日、URL、価格、無料/有料の構成などを記録して
     過去の実績を一覧管理する

## フォルダ構成

```
templates/     記事・レター・チェックリストの雛形
research/      継続的に貯めるリサーチ素材（号をまたいで使う）
issues/        号ごとの制作フォルダ（本体はここで育てる）
published/     note公開後の実績ログ
assets/        ロゴ・アイキャッチなど共通のブランド素材
```

## 命名ルール

- 号のフォルダ名: `issues/YYYY-MM-DD_短い英語スラッグ/`
  例: `issues/2026-09-06_fed-rate-outlook/`
- リサーチメモのファイル名: `YYYY-MM-DD_トピック.md`
  例: `research/x_posts/2026-09-06_semiconductor-rally.md`

## 新しい号を作るときの手順（コピペ用）

```bash
NEW_ISSUE="issues/YYYY-MM-DD_slug-here"
mkdir -p "$NEW_ISSUE/assets"
cp templates/research_note_template.md "$NEW_ISSUE/research_notes.md"
cp templates/letter_template.md "$NEW_ISSUE/letter_draft.md"
cp templates/article_template.md "$NEW_ISSUE/article_draft.md"
```
