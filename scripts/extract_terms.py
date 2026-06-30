#!/usr/bin/env python3
"""
data.json から用語サブセットを抽出して stdout に出力する。
Claude がデータを直接読む代わりに使う。

使い方:
  python3 scripts/extract_terms.py --type official --theme 1        # テーマ1のofficialカード
  python3 scripts/extract_terms.py --type official --theme 1-10     # テーマ1-10のofficialカード
  python3 scripts/extract_terms.py --type official --theme 1,3,5    # 指定テーマ複数
  python3 scripts/extract_terms.py --type detail                    # detailカードのみ
  python3 scripts/extract_terms.py --search "TCP"                   # 用語名/解説で検索
  python3 scripts/extract_terms.py --theme 5                        # テーマ5の全カード
  python3 scripts/extract_terms.py --type official --limit 50       # 最初の50件
"""

import json
import sys
import argparse

DATA_PATH = "data/data.json"


def parse_theme_arg(theme_str):
    """1, 1-10, 1,3,5 などをテーマ番号のsetに変換"""
    themes = set()
    for part in theme_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            themes.update(range(int(start), int(end) + 1))
        else:
            themes.add(int(part))
    return themes


def main():
    parser = argparse.ArgumentParser(description="data.jsonから用語を抽出")
    parser.add_argument("--type", choices=["official", "detail"], help="カード種別")
    parser.add_argument("--theme", help="テーマ番号 (例: 1 / 1-10 / 1,3,5)")
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

    # フィルタ: theme
    if args.theme:
        target_themes = parse_theme_arg(args.theme)
        terms = [t for t in terms if t.get("sourceTheme") in target_themes]

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
