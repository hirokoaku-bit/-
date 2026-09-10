# 「60歳の壁」動画リサーチ 手順書

## 背景

この作業環境(Claude Codeのリモートセッション)からは、ネットワークポリシーにより
YouTubeへのアクセスがブロックされています(`EGRESS_BLOCKED`)。
そのため、お手元のPC/Macでデータ収集を行っていただき、その結果をこのリポジトリの
`リサーチ/input/` フォルダに入れてpushしていただければ、Claude側で分析・
`リサーチ.md` の作成まで行います。

## 事前準備(お手元のPC)

```bash
pip install -U yt-dlp
```

このリポジトリをclone(またはpull)して、`リサーチ/scripts/` に移動してください。

```bash
cd リサーチ/scripts
```

## Step 1: 候補動画の検索

```bash
bash 01_search_candidates.sh
```

`candidates_raw.tsv` に、複数の検索ワードでヒットした動画のメタデータ
(動画ID・タイトル・チャンネル名・登録者数・再生数・投稿日・URL)が保存されます。
数分かかることがあります。

## Step 2: 条件でフィルタ・並べ替え

```bash
python3 02_filter_candidates.py candidates_raw.tsv
```

デフォルトで「直近6ヶ月以内・登録者3万人未満・再生5,000回以上」の動画を、
「再生数 ÷ 登録者数」の倍率が高い順に表示します。件数が少なすぎる/多すぎる場合は
閾値を調整してください。

```bash
python3 02_filter_candidates.py candidates_raw.tsv --max-followers 10000 --min-views 20000
```

表示された一覧から、実際に「60歳の壁」(60歳定年・再雇用・給料ダウンなど)の
テーマを扱っている動画を目視で10本選んでください(検索ノイズで無関係な動画が
混ざることがあります)。

## Step 3: 選んだ10本の字幕(文字起こし)を取得

選んだ動画のIDを指定して実行します(IDはURLの `watch?v=` の後ろの部分、または
`02_filter_candidates.py` の出力のURL列から取得できます)。

```bash
bash 03_fetch_transcripts.sh dQw4w9WgXcQ abcdEFghij ... (10個分)
```

`transcripts/` フォルダに `.vtt` ファイルが保存されます(手動字幕があればそちら、
なければ自動字幕)。

## Step 4: プレーンテキストに変換

```bash
python3 04_vtt_to_text.py transcripts/
```

`transcripts/*.txt` として、タイムスタンプなしの文字起こしテキストが出力されます。

## Step 5: このリポジトリにpush

以下のファイルを `リサーチ/input/` 以下にコピーし、コミット・pushしてください。

- `candidates_raw.tsv`(検索結果の生データ)
- Step2で選んだ10本のリスト(動画タイトル・URL・登録者数・再生数をメモしたものでOK)
- `transcripts/*.txt`(10本分の文字起こし)

```bash
cp candidates_raw.tsv ../input/
cp transcripts/*.txt ../input/transcripts/
git add ../input
git commit -m "add 60歳の壁 candidate videos and transcripts"
git push -u origin claude/serene-mayer-ofw1f6
```

push後、Claudeに「pushしました」と伝えてください。こちらでデータを取得し、
伸びている理由の分析と共通点の一覧表を `リサーチ/リサーチ.md` にまとめます。
