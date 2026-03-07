# 銘木図鑑 自動化システム セットアップガイド

## システム概要

```
木材名を入力するだけで、以下を自動実行:
1. Claude AIで木材情報をリサーチ
2. Wikimedia/Unsplashから著作権フリー画像を収集
3. 銘木図鑑形式のブログ記事HTMLを生成
4. WordPressにドラフト投稿（確認後に公開）
5. BASE用商品説明文も同時生成
```

---

## 初回セットアップ

### 1. Python 環境

```bash
cd c:\Users\tsuba\Desktop\base_kinmokusei
pip install -r requirements.txt
```

### 2. Anthropic API キーの取得

1. https://console.anthropic.com にアクセス
2. アカウント作成 → API Keys → Create Key
3. `.env` の `ANTHROPIC_API_KEY=` に貼り付け

### 3. WordPress アプリケーションパスワードの取得

1. https://kinmokuseijp.blog/wp-admin にログイン
2. 「ユーザー」→「プロフィール」→ 下部「アプリケーションパスワード」
3. 名前に「pipeline」と入力 → 「新しいアプリケーションパスワードを追加」
4. 表示されたパスワード（xxxx xxxx xxxx xxxx xxxx xxxx 形式）を `.env` に設定:
   ```
   WP_USERNAME=（WordPressのログインユーザー名）
   WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
   ```

### 4. .env の確認

```
ANTHROPIC_API_KEY=sk-ant-...（取得したキー）
WP_URL=https://kinmokuseijp.blog
WP_USERNAME=（WordPressユーザー名）
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
UNSPLASH_ACCESS_KEY=（任意）
```

---

## 使い方

すべてのコマンドは `scripts/` フォルダ内で実行します。

### 基本: 新しい木材を追加する（フルパイプライン）

```bash
cd scripts
python run_pipeline.py パドウク
```

実行すると：
- `data/woods/パドウク.json` に研究データを保存
- `data/woods/パドウク_images.json` に画像候補を保存
- `output/パドウク_article.html` にHTMLを保存
- WordPress に **ドラフト** として投稿
- ブラウザで確認 → 問題なければ WordPress で公開

### HTMLだけ生成（WordPressには投稿しない）

```bash
python run_pipeline.py エボニー --html-only
```

### 既存データを使い直す（再調査なし）

```bash
python run_pipeline.py かりん --skip-research
```

### BASE 商品説明だけ生成

```bash
python run_pipeline.py パロサント --description-only
```

### 直接公開（確認なし）

```bash
python run_pipeline.py ローズウッド --publish
```

### BASE 自動出品（確認をスキップして進める）

チェック項目などを自動で YES にして進めたい場合は、各スクリプトに **`--yes`**（または **`-y`**）を付けて実行します。

| スクリプト | 用途 | コマンド例 |
|-----------|------|------------|
| **uploader.py** | 写真割り当て確認・終了時の Enter をスキップ | `python scripts/uploader.py --yes` |
| **prepare_pens.py** | 「保存しますか？」を自動で YES | `python scripts/prepare_pens.py --yes` |
| **scrape_base_items.py** | 終了時の Enter 待ちをスキップ | `python scripts/scrape_base_items.py --yes` |

```bash
# 撮影フォルダを指定する場合
python scripts/uploader.py --yes --date 20260307
```

### サンプル: 通常出品と抽選出品を同時に（1本で2件）

1本目のペンを「通常販売」と「抽選販売」の2件として、同じ内容でまとめて登録するサンプルです。

```bash
python scripts/uploader.py --sample-both --yes
```

- 1本目のみ対象。同じ写真・説明で **【通常販売】** と **【抽選販売】** の2商品が下書きに保存されます。
- 商品名の末尾に「【通常販売】」「【抽選販売】」が付くので、管理画面で見分けられます。

---

## ファイル構成

```
base_kinmokusei/
├── .env                          ← APIキー・パスワード（Git管理外）
├── requirements.txt              ← Python依存パッケージ
├── data/
│   ├── pens.csv                  ← ペン作品データ（追記していく）
│   └── woods/
│       ├── かりん.json           ← 木材リサーチデータ
│       ├── かりん_images.json    ← 画像候補リスト
│       └── ...
├── scripts/
│   ├── run_pipeline.py           ← ★ メインコマンド
│   ├── research_wood.py          ← Claude APIでリサーチ
│   ├── search_images.py          ← 画像検索
│   ├── generate_article.py       ← WordPress記事HTML生成
│   ├── publish_to_wp.py          ← WordPress投稿
│   └── generate_description.py  ← BASE商品説明生成
├── output/
│   ├── かりん_article.html       ← 生成された記事HTML
│   └── かりん_description.txt   ← BASE商品説明文
└── templates/
    └── description_template.txt ← BASE商品説明テンプレート
```

---

## pens.csv への追記方法

新しい作品を作ったら `data/pens.csv` に1行追加:

```csv
wood_name,catch_copy,technique,color,pen_type,artwork_name,price,sale_type,memo
かりん,木が宿す命の赤,木象嵌,gold,BP,緋色の記憶,22800,抽選販売,
パロサント,聖なる薫りを纏う,木象嵌,silver,MP,聖樹,22800,通常販売,
新しい木材,キャッチコピー,技法,gold/silver/black,BP/MP/FP,作品名,価格,販売方式,備考
```

---

## 運用フロー（毎回）

```
1. pens.csv に新作品を追加
   ↓
2. python run_pipeline.py <木材名>
   ↓
3. output/<木材名>_article.html を確認
   ↓
4. WordPressのドラフト記事を確認・修正
   ↓
5. 写真を手動でアップロード（実物写真・ペン写真）
   ↓
6. WordPress で「公開」
   ↓
7. output/<木材名>_description.txt をBASEの商品説明にコピー
```

---

## トラブルシューティング

### `ANTHROPIC_API_KEY が設定されていません`
→ `.env` の `ANTHROPIC_API_KEY=` にAPIキーを設定してください

### `WordPress接続失敗: HTTP 401`
→ `WP_USERNAME` と `WP_APP_PASSWORD` を確認してください
→ アプリケーションパスワードは `xxxx xxxx xxxx xxxx xxxx xxxx` 形式（スペース含む）

### 画像が見つからない
→ Wikimediaにその木材の画像がない場合があります
→ `photos/` フォルダに自分で画像を置いて、WordPressに手動アップロードしてください

### JSON解析エラー
→ Claude APIの応答が不安定な場合があります。もう一度実行してみてください
