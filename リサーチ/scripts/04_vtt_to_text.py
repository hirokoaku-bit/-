#!/usr/bin/env python3
"""
transcripts/ 内の .vtt / .srt ファイルからタイムスタンプ等を取り除き、
プレーンテキストの文字起こし(.txt)を同じディレクトリに出力する。

使い方: python3 04_vtt_to_text.py transcripts/
"""
import re
import sys
from pathlib import Path

TIMESTAMP_RE = re.compile(r"^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->.*$")
INDEX_RE = re.compile(r"^\d+$")
TAG_RE = re.compile(r"<[^>]+>")


def clean_vtt_or_srt(text: str) -> str:
    lines_out = []
    prev = None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
            continue
        if TIMESTAMP_RE.match(line):
            continue
        if INDEX_RE.match(line):
            continue
        line = TAG_RE.sub("", line)
        if line and line != prev:
            lines_out.append(line)
            prev = line
    return "\n".join(lines_out)


def main():
    if len(sys.argv) != 2:
        print("使い方: python3 04_vtt_to_text.py transcripts/", file=sys.stderr)
        sys.exit(1)
    directory = Path(sys.argv[1])
    files = list(directory.glob("*.vtt")) + list(directory.glob("*.srt"))
    if not files:
        print(f"{directory} に .vtt / .srt ファイルが見つかりませんでした。", file=sys.stderr)
        sys.exit(1)
    for path in files:
        text = clean_vtt_or_srt(path.read_text(encoding="utf-8", errors="ignore"))
        out_path = path.with_suffix(".txt")
        out_path.write_text(text, encoding="utf-8")
        print(f"変換完了: {out_path}")


if __name__ == "__main__":
    main()
