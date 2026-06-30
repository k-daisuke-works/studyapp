# studyapp — 応用情報技術者試験 96日学習ナビ

## ファイル構成

| ファイル | サイズ | 役割 |
|---|---|---|
| `index.html` | 2KB | HTML骨格のみ |
| `style.css` | 12KB | 全CSS（可読形式・875行） |
| `app.js` | 25KB | 全ロジック（可読形式・996行） |
| `data/data.json` | 5.1MB | 全学習データのマスター — **直接読まないこと** |
| `data/data-meta.json` | 600KB | themes / calc / afternoon（アプリが最初にロード） |
| `data/data-glossary.json` | 731KB | officialGlossary（検索専用） |
| `data/data-terms-*.json` | 140〜920KB | allTerms を dai（大分類）単位に分割した9ファイル |
| `bak/index.html.bak` | 5.5MB | 分割前バックアップ（触らない） |

> **重要**: `data/data.json` はマスターファイル。アプリは `data/data-meta.json` と `data/data-terms-*.json` を読む。
> Claude が用語データを読む場合は該当の `data/data-terms-*.json` を直接 Read すること（`extract_terms.py` 不要）。

### data-terms-*.json のファイル名対応

| ファイル名 | 大分類 | テーマ数 |
|---|---|---|
| `data-terms-kiso-riron.json` | 基礎理論 | 10 |
| `data-terms-computer-system.json` | コンピュータシステム | 13 |
| `data-terms-gijutsu-yoso.json` | 技術要素 | 19 |
| `data-terms-kaihatsu-gijutsu.json` | 開発技術 | 10 |
| `data-terms-project-mgmt.json` | プロジェクトマネジメント | 11 |
| `data-terms-service-mgmt.json` | サービスマネジメント | 7 |
| `data-terms-kigyo-homu.json` | 企業と法務 | 8 |
| `data-terms-keiei-senryaku.json` | 経営戦略 | 11 |
| `data-terms-system-senryaku.json` | システム戦略 | 7 |

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
  themes: Theme[96],
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
  sourceTheme: number, // 所属テーマ番号 (1-96)
  sourceName: string,  // テーマ名（テーマの subName と一致）
  sourceType?: "official",  // 公式細目カードのみ付与
  sourceRealWorld?: string  // detail カードのみ（テーマ共通の背景説明）
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

### テーマ（themes の各要素）

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
  terms: Term[]       // 未使用。app.js は allTerms を sourceTheme で絞って使う
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
| `ap96_mastery` | object | `"sourceTheme::term"` → `"known"\|"unsure"\|"unknown"` |
| `ap96_mastery_at` | object | `"sourceTheme::term"` → 最終評価日 "YYYY-MM-DD" |
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
# 用語データを直接読む場合は該当の data-terms-*.json を Read（extract_terms.py 不要）

# 用語をキーワード検索（全テーマ横断）
python3 scripts/extract_terms.py --search "TCP"

# テーマ単位で抽出したい場合（旧来の方法）
python3 scripts/extract_terms.py --type official --theme 1

# 修正済みJSONをdata.jsonに書き戻す（引数はスクラッチパス上の一時ファイル）
python3 scripts/patch_terms.py <一時ファイルパス>

# data.jsonを更新したら必ず分割ファイルを再生成する
python3 scripts/split_data.py
```
