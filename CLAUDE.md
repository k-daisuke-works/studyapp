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

## カードの題材選び（全テーマ共通）

**例は必ずゲーム・ゲーム業界を題材にすること。**

テーマごとの対応例：

| テーマ | 使う題材 |
|---|---|
| 基礎理論（浮動小数点・シフト・論理演算） | ゲームエンジン内部の計算、スコア処理、グラフィック描画 |
| ネットワーク・セキュリティ | FF14・原神などのオンラインゲームの通信・ログイン認証・DDoS対策 |
| データベース | プレイヤーデータ・アイテム・ランキング管理 |
| プロジェクト管理 | ゲーム開発プロジェクト（スクエニ・任天堂規模のチーム開発） |
| サービス管理・運用 | ゲームサーバーの障害対応・パッチ配信 |
| 経営戦略・マーケティング | ゲーム会社の経営・タイトル戦略・DLC販売 |
| 法務・知財 | ゲームの著作権・ガチャ規制・キャラクター商標 |
| システム戦略 | ゲームエンジン選定・クラウド移行 |

ゲームで例えにくい場合でも、**ゲーム業界・ゲーム会社の業務**を軸に考えること。

## カードコンテンツの一括書き換えルール

**必須：Haiku サブエージェント並列処理で行うこと。Sonnet直列は禁止。**

### 並列数の目安

| 件数 | 並列数 | バッチサイズ |
|---|---|---|
| 〜20件 | 2並列 | 10件/バッチ |
| 21〜60件 | 3〜4並列 | 15件/バッチ |
| 61〜150件 | 5〜6並列 | 20〜25件/バッチ |
| 151件〜 | 8並列上限 | 20〜25件/バッチ |

### 手順

1. 対象用語リストを取得（`extract_terms.py` または `data-terms-*.json` を Read）
2. 件数に応じてバッチ分割し、**同一メッセージで Agent(model=haiku) を並列起動**
3. 各エージェントはバッチ分のパッチ JSON（`w` + `sourceTheme` + 更新フィールド）を生成して返す
4. 結果を結合して `patch_terms.py` で apply
5. `split_data.py` → `git commit` → `git push`

### 各サブエージェントへの指示テンプレート

```
以下N件の用語について example フィールドを書き直してください。
card-format スキルの5セクション形式（■困り事/■これで解決/■仕組みを追う/■ゲームでの実例/■落とし穴）で書くこと。
文章は一般人でもわかりやすい内容にし、専門用語は説明の後に（[[用語名]]）で添えること。
結果は JSON 配列で返してください：[{"w": "用語名", "sourceTheme": N, "example": "..."}, ...]

対象用語と現在の d フィールド：
（用語リスト）
```

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
