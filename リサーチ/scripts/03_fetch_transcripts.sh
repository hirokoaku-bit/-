#!/usr/bin/env bash
# 選んだ動画IDの字幕(手動字幕優先、なければ自動字幕)をダウンロードする
# 使い方: bash 03_fetch_transcripts.sh <videoID1> <videoID2> ... <videoID10>

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "使い方: bash 03_fetch_transcripts.sh <videoID1> <videoID2> ..." >&2
  exit 1
fi

mkdir -p transcripts

for id in "$@"; do
  echo "字幕取得中: ${id}" >&2
  yt-dlp --skip-download --write-sub --write-auto-sub --sub-lang "ja,ja-orig,ja-JP" \
    -o "transcripts/${id}.%(ext)s" \
    "https://www.youtube.com/watch?v=${id}" || echo "警告: ${id} の字幕取得に失敗しました" >&2
done

echo "完了。次は: python3 04_vtt_to_text.py transcripts/" >&2
