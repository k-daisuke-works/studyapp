#!/usr/bin/env python3
"""
data.json を複数ファイルに分割する。

出力:
  data-meta.json              — themes, calc, afternoon
  data-glossary.json          — officialGlossary
  data-terms-{slug}.json × 9 — allTerms を dai（大分類）単位で分割

data.json がマスター。patch_terms.py で更新後にこのスクリプトを実行して
分割ファイルを再生成する。

使い方:
  python3 scripts/split_data.py
"""

import json
from pathlib import Path

DATA_PATH = Path("data/data.json")

DAI_TO_SLUG = {
    "基礎理論": "kiso-riron",
    "コンピュータシステム": "computer-system",
    "技術要素": "gijutsu-yoso",
    "開発技術": "kaihatsu-gijutsu",
    "プロジェクトマネジメント": "project-mgmt",
    "サービスマネジメント": "service-mgmt",
    "企業と法務": "kigyo-homu",
    "経営戦略": "keiei-senryaku",
    "システム戦略": "system-senryaku",
}


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = path.stat().st_size / 1024
    print(f"  {path}  ({size_kb:.0f} KB)")


def main():
    print("data.json を読み込み中...")
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    # dai → slug のマッピングをテーマから構築
    theme_dai = {t["subNo"]: t["dai"] for t in data["themes"]}

    # sourceTheme → dai のマッピング（テーマ番号は1-based index）
    theme_no_to_dai = {i + 1: t["dai"] for i, t in enumerate(data["themes"])}

    # data-meta.json
    print("\n分割ファイルを生成中...")
    write_json(
        Path("data/data-meta.json"),
        {
            "themes": data["themes"],
            "calc": data["calc"],
            "afternoon": data["afternoon"],
        },
    )

    # data-glossary.json
    write_json(Path("data/data-glossary.json"), data["officialGlossary"])

    # allTerms を dai で振り分け
    buckets = {slug: [] for slug in DAI_TO_SLUG.values()}
    unknown = []
    for term in data["allTerms"]:
        dai = theme_no_to_dai.get(term.get("sourceTheme"))
        slug = DAI_TO_SLUG.get(dai)
        if slug:
            buckets[slug].append(term)
        else:
            unknown.append(term)

    for slug, terms in buckets.items():
        write_json(Path(f"data/data-terms-{slug}.json"), terms)

    if unknown:
        print(f"\n⚠ dai 不明で未分類: {len(unknown)} 件")

    total = sum(len(v) for v in buckets.values())
    print(f"\n完了: allTerms {len(data['allTerms'])} 件 → 9 ファイルに分割（計 {total} 件）")


if __name__ == "__main__":
    main()
