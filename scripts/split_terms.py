#!/usr/bin/env python3
"""
集約カードを個別カードに分割して data.json に書き戻す。

入力JSONの形式:
  {
    "splits": [
      {
        "original_w": "元の用語名（data.json と完全一致）",
        "sourceDay": 42,
        "replace_with": [
          {
            "w": "新用語名",
            "d": "解説文",
            "example": "使用例"
          },
          ...
        ]
      }
    ]
  }

- replace_with の各用語には sourceDay/sourceName/sourceType/full/ja は
  元のカードから自動引き継ぎ（明示的に指定した場合はそちら優先）
- 元のカードは削除され、replace_with の用語が元の位置に挿入される
- original_w にマッチしないエントリは警告を出してスキップ

使い方:
  python3 scripts/split_terms.py /tmp/splits.json
  python3 scripts/split_terms.py /tmp/splits.json --dry-run
"""

import json
import sys
import argparse
import shutil
from pathlib import Path

DATA_PATH = Path("data.json")
BACKUP_PATH = Path("data.json.bak")


def main():
    parser = argparse.ArgumentParser(description="集約カードを個別カードに分割")
    parser.add_argument("split_file", help="分割定義JSONファイルのパス")
    parser.add_argument("--dry-run", action="store_true", help="変更内容を表示するだけ（書き込まない）")
    args = parser.parse_args()

    with open(args.split_file, encoding="utf-8") as f:
        split_def = json.load(f)

    splits = split_def.get("splits", [])

    # sourceDay::original_w → split定義 のマップ
    split_map = {}
    for s in splits:
        key = f"{s['sourceDay']}::{s['original_w']}"
        split_map[key] = s

    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    new_terms = []
    matched_keys = set()
    split_count = 0
    new_card_count = 0

    for term in data["allTerms"]:
        key = f"{term.get('sourceDay')}::{term.get('w')}"
        if key not in split_map:
            new_terms.append(term)
            continue

        s = split_map[key]
        matched_keys.add(key)
        split_count += 1

        if args.dry_run:
            print(f"\n[分割] {key}")
            print(f"  → {len(s['replace_with'])} 件に分割:")

        for new_t in s["replace_with"]:
            # 元のカードからメタデータを引き継ぐ
            merged = {
                "w":          term.get("w", ""),
                "full":       term.get("full", ""),
                "ja":         term.get("ja", ""),
                "d":          term.get("d", ""),
                "example":    term.get("example", ""),
                "sourceDay":  term.get("sourceDay"),
                "sourceName": term.get("sourceName", ""),
                "sourceType": term.get("sourceType"),
            }
            # sourceRealWorld は detail カードのみ
            if "sourceRealWorld" in term:
                merged["sourceRealWorld"] = term["sourceRealWorld"]

            # replace_with の内容で上書き
            merged.update(new_t)

            if args.dry_run:
                print(f"    - {merged['w']}")
                print(f"      d: {merged['d'][:60]}...")
            else:
                new_terms.append(merged)
            new_card_count += 1

    unmatched = set(split_map.keys()) - matched_keys
    if unmatched:
        print(f"\n⚠ マッチしなかった original_w ({len(unmatched)} 件):")
        for k in sorted(unmatched):
            print(f"  {k}")

    print(f"\n分割対象: {split_count} カード → {new_card_count} カード（差分 +{new_card_count - split_count}）")
    print(f"allTerms 合計: {len(data['allTerms'])} → {len(new_terms)}")

    if args.dry_run:
        print("（dry-run モード: data.json は変更していません）")
        return

    if split_count == 0:
        print("変更なし。data.json は更新しませんでした。")
        return

    shutil.copy(DATA_PATH, BACKUP_PATH)
    print(f"バックアップ作成: {BACKUP_PATH}")

    data["allTerms"] = new_terms
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"data.json を更新しました")


if __name__ == "__main__":
    main()
