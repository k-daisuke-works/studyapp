# 引き継ぎ資料 — official カード改善作業

最終更新: 2026-06-27

---

## プロジェクト概要

**studyapp** — 応用情報技術者試験 96日学習ナビ

`data.json` の `allTerms` 配列に含まれる `sourceType: "official"` の 4497 件について、
`d`（定義文）と `example`（身近な使用例）フィールドを書き直す作業。

---

## 現在の進捗

### 完了済み（コミット・プッシュ済み）

| コミット | 対象 Days | 件数（概算） |
|---------|-----------|------------|
| `09e679a` | Day 1–7 | 〜351 |
| `a194e1d` | Day 8–10 | 96 |
| `114bae9` `61f392a` | Day 11–16 | 357 |
| `65e5b3d` | Day 17–25 | 481 |
| `3148e84` | Day 26–28 | 116 |
| `c426640` | Day 29–31 | 269 |
| `c32a646` `cc66824` | Day 32–37 | 217+67 |
| `fa12f82` | Day 38 | 300 |
| `e494ece` `9d8355b` | Day 40–49 | 〜415 |
| `86d9057` | Day 50–64 | 296 |
| `a6184ef` | Day 66–70 | 169 |
| `30e8a05` | Day 71–73 | 118 |
| `10b2b32` | Day 74–77 | 117 |
| `3cd77fb` | Day 78–88 | 513 |

- Day 39、Day 65 は 0 件（スキップ済み）
- **完了済み合計：約 3,892 件 / 4,497 件**

### 残り作業

| Day | テーマ | 件数 |
|-----|--------|------|
| 89 | 経営・組織論 | 119 |
| 90 | 業務分析・データ利活用 | 139 |
| 91 | 会計・財務 | 116 |
| 92 | 知的財産権 | 40 |
| 93 | セキュリティ関連法規 | 40 |
| 94 | 労働関連・取引関連法規 | 46 |
| 95 | その他の法律・ガイドライン・技術者倫理 | 64 |
| 96 | 標準化関連 | 41 |
| **合計** | | **605 件** |

---

## 作業手順

### 環境セットアップ

```bash
git clone <repo>
cd studyapp
# 開発サーバー（確認用、任意）
python3 -m http.server 8080
```

### 1. 用語データの抽出

```bash
# スクラッチパスを設定（任意のディレクトリ）
SCRATCH=/tmp/scratch_studyapp
mkdir -p $SCRATCH

# Day 89-96 を一括抽出
for d in 89 90 91 92 93 94 95 96; do
  python3 scripts/extract_terms.py --type official --day $d > $SCRATCH/day${d}_orig.json
done
```

### 2. パッチ JSON の作成（Claude API で生成）

各 day のパッチ JSON は以下の形式：

```json
{
  "terms": [
    {
      "w": "用語名（extract_terms.py の出力をそのままコピーすること）",
      "sourceDay": 89,
      "d": "〜とは、〜する仕組み・概念のこと。",
      "example": "身近な日常生活・製品・サービスでの具体的な使用例。"
    }
  ]
}
```

**フィールド要件：**
- `d`：定義文。「〜とは、〜」形式。試験対策的な文言は不可。
- `example`：**日常生活・製品・サービスでの具体例**。「試験では〇〇と記述する」「午後問題では…」は禁止。

**重要な罠：**
1. `w` フィールドは `extract_terms.py` の出力をそのままコピーすること（余分なスペース・括弧が含まれる場合あり）
2. `sourceDay` を必ず含めること（ないと `patch_terms.py` がマッチしない）
3. 用語名が少しでも違うとサイレントスキップされる（エラーなし）

### 3. sourceDay を付与しながら結合

```python
import json, os

SCRATCH = '/tmp/scratch_studyapp'
combined = {'terms': []}

for n in range(89, 97):
    path = f'{SCRATCH}/day{n}_patch.json'
    if not os.path.exists(path):
        continue
    data = json.load(open(path, encoding='utf-8'))
    for t in data['terms']:
        if 'sourceDay' not in t:
            t['sourceDay'] = n
        combined['terms'].append(t)

with open(f'{SCRATCH}/batch_89_96.json', 'w', encoding='utf-8') as fp:
    json.dump(combined, fp, ensure_ascii=False)

print(f"合計 {len(combined['terms'])} 件")
```

### 4. 不一致チェック（apply 前に必須）

```python
import json

SCRATCH = '/tmp/scratch_studyapp'

# 元データ（Day 89 の例）
with open(f'{SCRATCH}/day89_orig.json') as f:
    orig = json.load(f)

# パッチ
with open(f'{SCRATCH}/day89_patch.json') as f:
    patch = json.load(f)

orig_ws  = {t['w'] for t in orig['terms']}
patch_ws = {t['w'] for t in patch['terms']}
missing  = orig_ws - patch_ws

if missing:
    print("未更新の用語名:")
    for w in sorted(missing):
        print(f"  {w}")
else:
    print("全件一致")
```

### 5. data.json に書き戻す

```bash
# ドライラン（確認）
python3 scripts/patch_terms.py /tmp/scratch_studyapp/batch_89_96.json --dry-run

# 本適用
python3 scripts/patch_terms.py /tmp/scratch_studyapp/batch_89_96.json
```

### 6. コミット＆プッシュ

```bash
git add data.json
git commit -m "Improve official card content for Days 89-96 (605 terms)"
git push
```

---

## 効率的な進め方（推奨）

- **Haiku × 3並列**がコスパ最良（Sonnet比 5〜6倍速、品質も問題なし）
- Day 単位でサブエージェントを並列起動してパッチ JSON を生成
- 不一致チェックを必ず実施してから apply

---

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `data.json` | 全学習データ（5.4MB）— **直接 cat/Read しないこと** |
| `scripts/extract_terms.py` | data.json からサブセット抽出 |
| `scripts/patch_terms.py` | 修正済み JSON を data.json に書き戻す |
| `app.js` | フロントエンドロジック（25KB） |
| `style.css` | スタイル（12KB） |

---

## 参考：過去の修正スタイル例（Day 1 相当）

**修正前（テンプレート文言）：**
```
d: "論理積（AND）は、二つの命題が両方とも真の場合にのみ真となる論理演算です。"
example: "試験では真理値表を使って論理演算を解くことが多い。"
```

**修正後（正しいスタイル）：**
```
d: "論理積（AND）とは、複数の条件がすべて成立したときだけ結果が真になる論理演算のこと。"
example: "スマートロックで「登録カードをかざす」かつ「PINを入力する」の両方を満たしたときだけ解錠される仕組みがANDの典型例。"
```
