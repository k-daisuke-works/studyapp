# studyapp — 応用情報技術者試験 96日学習ナビ

## ファイル構成

| ファイル | サイズ | 役割 |
|---|---|---|
| `index.html` | 2KB | HTML骨格のみ |
| `style.css` | 12KB | 全CSS（可読形式・875行） |
| `app.js` | 25KB | 全ロジック（可読形式・996行） |
| `data.json` | 5.4MB | 全学習データ — **直接読まないこと** |
| `index.html.bak` | 5.5MB | 分割前バックアップ（触らない） |

> **重要**: `data.json` は巨大すぎてトークン爆死します。
> 読む場合は必ず `scripts/extract_terms.py` でサブセット抽出してから。

## 開発サーバー

```bash
python3 -m http.server 8080
# → http://localhost:8080 で開く
# fetch() を使うため file:// では動かない
```

## data.json のスキーマ

### トップレベル

```
{
  days: Day[96],
  allTerms: Term[5098],   // detail: 601件 + official: 4497件
  calc: Calc[20],
  afternoon: Afternoon[11],
  officialGlossary: OfficialGlossary[4641]
}
```

### Term（allTerms の各要素）

```
{
  w: string,           // 用語名（主キー的な役割）
  full: string,        // 英語正式名
  ja: string,          // 日本語名
  d: string,           // 解説文
  example: string,     // 身近な使用例
  sourceDay: number,   // 所属 Day (1-96)
  sourceName: string,  // テーマ名（Day の subName と一致）
  sourceType?: "official",  // 公式細目カードのみ付与
  sourceRealWorld?: string  // detail カードのみ（Day 共通の背景説明）
}
```

### officialGlossary（IPA公式細目索引、検索用途のみ）

```
{
  term: string,
  middle: string,     // 中分類名
  topic: string,      // 大項目
  subsection: string, // 細目
  covered: boolean    // allTerms に詳説カードがあるか
}
```

### Day（days の各要素）

```
{
  kei: "テクノロジ系" | "マネジメント系" | "ストラテジ系",
  dai: string,        // 大分類
  chuNo: number,
  chuName: string,
  subNo: string,
  subName: string,    // テーマ名
  url: string,        // 過去問リンク
  urlNote: string,
  intro: string,
  tables: Table[],
  terms: Term[]       // 未使用。app.js は allTerms を sourceDay で絞って使う
}
```

### Calc（計算公式集、20件）

```
{
  name: string,     // 計算名（例: "稼働率"）
  ex: string,       // 例題文
  ans: string,      // 答え
  formula: string,  // 公式
  tip: string       // 解法のコツ
}
```

### Afternoon（午後問題分野、11件）

```
{
  name: string,    // 分野名（例: "セキュリティ"）
  focus: string,   // 重点説明
  method: string   // 攻略法
}
```

## localStorage キー一覧

| キー | 型 | 内容 |
|---|---|---|
| `ap96_done` | number[] | 完了済み Day 番号の配列 |
| `ap96_review` | number[] | 要復習 Day 番号の配列 |
| `ap96_mastery` | object | `"day::term"` → `"known"\|"unsure"\|"unknown"` |
| `ap96_minutes` | 15\|30\|45\|60 | 1日の学習時間（分） |
| `ap96_exam_date` | "YYYY-MM-DD" | 受験予定日 |
| `ap96_plan_mode` | "time"\|"exam" | 計画モード |
| `ap96_daily_terms` | object | `"YYYY-MM-DD"` → termKey[] の日別プラン |
| `ap96_plan_version` | string | プランバージョン（現在 "balanced-v2"） |
| `ap96_last_activity` | "YYYY-MM-DD" | 最終学習日 |
| `ap96_onboarding_complete` | "1" | 初回画面表示済みフラグ |
| `ap96_start_date` | "YYYY-MM-DD" | 学習開始日（省略時 2026-06-24） |

## 既知の課題（TODO）

1. **official カードの解説が劣悪** — `d` フィールドがテンプレ文言、`example` も使い回し
   - 4497件を一括修正予定
   - 作業手順: `scripts/extract_terms.py` → 修正 → `scripts/patch_terms.py`

2. **開始日が固定値** — `app.js` の `const START=new Date(2026,5,24)` がハードコード
   - `ap96_start_date` localStorage キーを追加して設定UIから変更できるようにする

## データ操作スクリプト

```bash
# official カードを Day 単位で抽出（出力先はセッションのスクラッチパスを使う）
python3 scripts/extract_terms.py --type official --day 1

# 特定テーマの用語を検索
python3 scripts/extract_terms.py --search "TCP"

# 修正済みJSONをdata.jsonに書き戻す（引数はスクラッチパス上の一時ファイル）
python3 scripts/patch_terms.py <一時ファイルパス>
```
