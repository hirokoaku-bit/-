# issues/ - 号ごとの制作フォルダ

note で販売する「1回分の配信（号）」ごとにフォルダを作ります。

## フォルダ名

`YYYY-MM-DD_短い英語スラッグ`

例: `2026-09-06_fed-rate-outlook`

## 中身の構成と育て方

```
issues/YYYY-MM-DD_slug/
├── research_notes.md   1. この号のためにリサーチした内容のまとめ
├── letter_draft.md      2. 無料レターの下書き
├── article_draft.md     3. 有料記事の下書き
├── final_letter.md       4. note にそのまま貼る無料部分の最終稿
├── final_article.md      5. note にそのまま貼る有料部分の最終稿
└── assets/                この号専用の画像・図表・グラフ
```

1. `research/` から関連情報を集めて `research_notes.md` にまとめる
   （雛形: `templates/research_note_template.md`）
2. `letter_draft.md` / `article_draft.md` を雛形からコピーして執筆
   （雛形: `templates/letter_template.md`, `templates/article_template.md`）
3. 推敲が終わったら `final_letter.md` / `final_article.md` にコピーし、
   `templates/publish_checklist.md` で最終チェック
4. note に貼り付けて公開したら、`published/publish_log.csv` に記録

## サンプル

`2026-09-06_sample-issue/` は構成の見本です。新しい号を作るときは
このフォルダごとコピーして中身を書き換えるか、README のコピペ手順を使ってください。
