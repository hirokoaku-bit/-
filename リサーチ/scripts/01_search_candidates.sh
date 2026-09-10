#!/usr/bin/env bash
# 「60歳の壁」関連動画をYouTube検索し、候補動画のメタデータを収集する
# 使い方: bash 01_search_candidates.sh
# 事前準備: pip install -U yt-dlp

set -euo pipefail

OUT="candidates_raw.tsv"
: > "$OUT"

# 検索クエリのバリエーション(表記ゆれ・関連ワードを網羅)
QUERIES=(
  "60歳の壁"
  "60歳の壁 再雇用"
  "60歳の壁 給料"
  "60歳の壁 定年後"
  "定年後 再雇用 給料 下がる"
  "60歳 再雇用 現実"
  "60歳 定年 契約社員"
  "60歳以降 働き方"
)

for q in "${QUERIES[@]}"; do
  echo "検索中: ${q}" >&2
  yt-dlp "ytsearch40:${q}" --skip-download --ignore-errors \
    --print "%(id)s|||%(title)s|||%(channel)s|||%(channel_follower_count)s|||%(view_count)s|||%(upload_date)s|||%(webpage_url)s" \
    >> "$OUT" || true
done

echo "完了: ${OUT} に $(wc -l < "$OUT") 件(重複含む)保存しました" >&2
echo "次は: python3 02_filter_candidates.py ${OUT}" >&2
