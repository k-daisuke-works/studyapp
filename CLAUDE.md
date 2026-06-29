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
  allTerms: Term[5496],   // detail: 621件 + official: 4875件
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
| `ap96_done_dates` | string[] | 学習完了した日付の配列（"YYYY-MM-DD"[]）|
| `ap96_mastery` | object | `"sourceDay::term"` → `"known"\|"unsure"\|"unknown"` |
| `ap96_mastery_at` | object | `"sourceDay::term"` → 最終評価日 "YYYY-MM-DD" |
| `ap96_minutes` | 15\|30\|45\|60 | 1日の学習時間（分） |
| `ap96_exam_date` | "YYYY-MM-DD" | 受験予定日 |
| `ap96_plan_mode` | "time"\|"exam" | 計画モード |
| `ap96_daily_terms` | object | `"p:学習日番号"` → termKey[] の固定済み日別プラン |
| `ap96_plan_version` | string | プランバージョン（現在 "queue-v4"） |
| `ap96_last_activity` | "YYYY-MM-DD" | 最終学習日 |
| `ap96_onboarding_complete` | "1" | 初回画面表示済みフラグ |
| `ap96_start_date` | "YYYY-MM-DD" | 学習開始日（省略時 2026-06-24） |

> **廃止キー**（旧バージョン残存分。読み込まず、import 時に削除される）
> `ap96_done`（テーマ番号配列）、`ap96_review`（テーマ番号配列）

## エクスポート JSON バージョン

| version | 内容 |
|---|---|
| `1` | 旧形式。`done`（number[]）と `review`（number[]）を持つ。import 時に mastery のみ復元、done/review は捨て。 |
| `2` | 旧形式。`doneDates`（string[]）と `masteryAt`（object）を持つ。 |
| `3` | 現行形式。学習日番号単位の固定カード割当を持つ。 |

## 既知の課題（TODO）

- 特になし（official カード4497件改訂済み・全体改修完了）

## データ操作スクリプト

```bash
# official カードを Day 単位で抽出（出力先はセッションのスクラッチパスを使う）
python3 scripts/extract_terms.py --type official --day 1

# 特定テーマの用語を検索
python3 scripts/extract_terms.py --search "TCP"

# 修正済みJSONをdata.jsonに書き戻す（引数はスクラッチパス上の一時ファイル）
python3 scripts/patch_terms.py <一時ファイルパス>
```
