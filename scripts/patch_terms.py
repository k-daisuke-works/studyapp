#!/usr/bin/env python3
"""
修正済み用語JSONを data.json に書き戻す。

パッチファイルの形式（extract_terms.py の出力を直接使える）:
  {
    "terms": [
      { "w": "用語名", "sourceDay": 1, "d": "新しい解説", "example": "新しい例" },
      ...
    ]
  }

使い方:
  python3 scripts/patch_terms.py /tmp/batch.json
  python3 scripts/patch_terms.py /tmp/batch.json --dry-run   # 変更内容を確認のみ
"""

import json
import sys
import argparse
import shutil
from pathlib import Path

DATA_PATH = Path("data.json")
BACKUP_PATH = Path("data.json.bak")


def term_key(term):
    return f"{term['sourceDay']}::{term['w']}"


def main():
    parser = argparse.ArgumentParser(description="修正済み用語をdata.jsonに書き戻す")
    parser.add_argument("patch_file", help="パッチJSONファイルのパス")
    parser.add_argument("--dry-run", action="store_true", help="変更内容を表示するだけ（書き込まない）")
    parser.add_argument("--fields", default="d,example", help="更新するフィールド (デフォルト: d,example)")
    args = parser.parse_args()

    update_fields = [f.strip() for f in args.fields.split(",")]

    with open(args.patch_file, encoding="utf-8") as f:
        patch = json.load(f)

    patch_terms = patch.get("terms", patch) if isinstance(patch, dict) else patch
    patch_map = {term_key(t): t for t in patch_terms if "w" in t and "sourceDay" in t}

    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    updated = 0
    skipped = 0
    for term in data["allTerms"]:
        key = term_key(term)
        if key not in patch_map:
            continue
        patch_term = patch_map[key]
        changed = False
        for field in update_fields:
            if field in patch_term and patch_term[field] != term.get(field):
                if args.dry_run:
                    print(f"[{key}] {field}:")
                    print(f"  OLD: {term.get(field)}")
                    print(f"  NEW: {patch_term[field]}")
                else:
                    term[field] = patch_term[field]
                changed = True
        if changed:
            updated += 1
        else:
            skipped += 1

    print(f"\n更新対象: {updated}件 / スキップ（変更なし）: {skipped}件")

    if args.dry_run:
        print("（dry-run モード: data.json は変更していません）")
        return

    if updated == 0:
        print("変更なし。data.json は更新しませんでした。")
        return

    shutil.copy(DATA_PATH, BACKUP_PATH)
    print(f"バックアップ作成: {BACKUP_PATH}")

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"data.json を更新しました（{updated}件）")


if __name__ == "__main__":
    main()
