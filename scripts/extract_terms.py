#!/usr/bin/env python3
"""
data.json から用語サブセットを抽出して stdout に出力する。
Claude がデータを直接読む代わりに使う。

使い方:
  python3 scripts/extract_terms.py --type official --day 1        # Day1のofficialカード
  python3 scripts/extract_terms.py --type official --day 1-10     # Day1-10のofficialカード
  python3 scripts/extract_terms.py --type official --day 1,3,5    # 指定Day複数
  python3 scripts/extract_terms.py --type detail                  # detailカードのみ
  python3 scripts/extract_terms.py --search "TCP"                 # 用語名/解説で検索
  python3 scripts/extract_terms.py --day 5                        # Day5の全カード
  python3 scripts/extract_terms.py --type official --limit 50     # 最初の50件
"""

import json
import sys
import argparse

DATA_PATH = "data.json"


def parse_day_arg(day_str):
    """1, 1-10, 1,3,5 などをday番号のsetに変換"""
    days = set()
    for part in day_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            days.update(range(int(start), int(end) + 1))
        else:
            days.add(int(part))
    return days


def main():
    parser = argparse.ArgumentParser(description="data.jsonから用語を抽出")
    parser.add_argument("--type", choices=["official", "detail"], help="カード種別")
    parser.add_argument("--day", help="Day番号 (例: 1 / 1-10 / 1,3,5)")
    parser.add_argument("--search", help="w/d/example に含まれるキーワード")
    parser.add_argument("--limit", type=int, help="最大件数")
    parser.add_argument("--fields", help="出力フィールドをカンマ区切りで指定 (省略=全フィールド)")
    args = parser.parse_args()

    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    terms = data["allTerms"]

    # フィルタ: sourceType
    if args.type == "official":
        terms = [t for t in terms if t.get("sourceType") == "official"]
    elif args.type == "detail":
        terms = [t for t in terms if t.get("sourceType") != "official"]

    # フィルタ: day
    if args.day:
        target_days = parse_day_arg(args.day)
        terms = [t for t in terms if t.get("sourceDay") in target_days]

    # フィルタ: キーワード検索
    if args.search:
        q = args.search.lower()
        terms = [
            t for t in terms
            if q in (t.get("w") or "").lower()
            or q in (t.get("d") or "").lower()
            or q in (t.get("example") or "").lower()
            or q in (t.get("full") or "").lower()
        ]

    # 件数制限
    if args.limit:
        terms = terms[: args.limit]

    # フィールド選択
    if args.fields:
        fields = [f.strip() for f in args.fields.split(",")]
        terms = [{k: t.get(k) for k in fields} for t in terms]

    result = {
        "count": len(terms),
        "terms": terms,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
