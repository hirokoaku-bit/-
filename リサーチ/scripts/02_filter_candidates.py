#!/usr/bin/env python3
"""
candidates_raw.tsv を読み込み、以下の条件でフィルタ・並べ替えして表示する。
  - 投稿日が直近Nヶ月以内(デフォルト6ヶ月)
  - チャンネル登録者数が一定以下(デフォルト30,000人未満)
  - 再生回数が一定以上(デフォルト5,000回以上)
  - 「再生回数 ÷ 登録者数」の比率が高い順にソート

使い方:
  python3 02_filter_candidates.py candidates_raw.tsv
  python3 02_filter_candidates.py candidates_raw.tsv --months 6 --max-followers 30000 --min-views 5000 --top 30
"""
import argparse
import datetime
import sys


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("tsv_path")
    p.add_argument("--months", type=int, default=6)
    p.add_argument("--max-followers", type=int, default=30000)
    p.add_argument("--min-views", type=int, default=5000)
    p.add_argument("--top", type=int, default=30)
    return p.parse_args()


def main():
    args = parse_args()
    today = datetime.date.today()
    cutoff = today - datetime.timedelta(days=30 * args.months)
    cutoff_str = cutoff.strftime("%Y%m%d")

    rows = {}
    with open(args.tsv_path, encoding="utf-8") as f:
        for raw in f:
            raw = raw.rstrip("\n")
            if not raw:
                continue
            parts = raw.split("|||")
            if len(parts) != 7:
                continue
            vid, title, channel, followers, views, upload_date, url = parts
            if vid in rows:
                continue
            if followers in ("NA", "None", ""):
                continue
            if views in ("NA", "None", ""):
                continue
            if upload_date in ("NA", "None", ""):
                continue
            try:
                followers_n = int(followers)
                views_n = int(views)
            except ValueError:
                continue
            if upload_date < cutoff_str:
                continue
            if followers_n <= 0 or followers_n > args.max_followers:
                continue
            if views_n < args.min_views:
                continue
            ratio = views_n / followers_n
            rows[vid] = {
                "id": vid,
                "title": title,
                "channel": channel,
                "followers": followers_n,
                "views": views_n,
                "upload_date": upload_date,
                "url": url,
                "ratio": ratio,
            }

    result = sorted(rows.values(), key=lambda r: r["ratio"], reverse=True)[: args.top]

    if not result:
        print("条件に合う動画が見つかりませんでした。閾値(--max-followers, --min-views, --months)を緩めて再実行してください。", file=sys.stderr)
        return

    print(f"投稿日カットオフ: {cutoff_str} 以降 / 登録者数 <= {args.max_followers} / 再生数 >= {args.min_views}")
    print(f"{len(rows)} 件がフィルタ条件に合致。上位 {len(result)} 件を表示:\n")
    print("順位\t倍率(再生/登録者)\t再生数\t登録者数\t投稿日\tチャンネル\tタイトル\tURL")
    for i, r in enumerate(result, 1):
        print(
            f"{i}\t{r['ratio']:.1f}倍\t{r['views']:,}\t{r['followers']:,}\t{r['upload_date']}\t{r['channel']}\t{r['title']}\t{r['url']}"
        )


if __name__ == "__main__":
    main()
