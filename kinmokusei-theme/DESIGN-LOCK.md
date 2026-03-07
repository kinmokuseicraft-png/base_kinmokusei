# 金杢犀 WordPress テーマ — 設計ロック

「ほとんど修正しない」前提で、実装側が扱いやすいように選択した内容。

---

## 確定事項

| 項目 | 選択 | 理由 |
|------|------|------|
| テーマ種別 | **Classic（PHPテーマ）** | ローディング・スクロール連動を自由に書ける。ブロックテーマは今回見送り。 |
| ショップ | **WooCommerce 使用** | 導線は `/shop` と商品詳細で統一。標準なので情報も多い。 |
| 4種SVG | **JS 内に文字列で保持** | 外部ファイル管理不要。`loading.js` 1本で完結。 |
| テーマ配置 | **`kinmokusei-theme/`** | 既存の `templates/` や `data/` と並列。 |

---

## ディレクトリ構成

```
kinmokusei-theme/
├── style.css
├── functions.php
├── index.php
├── front-page.php
├── header.php
├── footer.php
├── inc/
│   └── enqueue.php
├── template-parts/
│   ├── loading-screen.php   （ラッパーのみ。中身はJSが差し替え）
│   ├── hero.php
│   └── content-product-preview.php
├── assets/
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── loading.js       （4種SVGを文字列で保持＋ランダム選択＋アニメ）
│       └── scroll-animation.js
└── screenshot.png（後で追加可）
```

---

## 導線

- ヘッダー「SHOP」→ `get_permalink( wc_get_page_id( 'shop' ) )`
- トップCTA・「すべての商品を見る」→ 同上
- 商品カード→ 商品詳細（WooCommerce の通常リンク）

---

## 今後のステップ

- **Step 2** 4種SVGを `loading.js` 用の文字列として作成
- **Step 3** マークアップ（front-page, header, footer）と main.css（余白・タイポ）
- **Step 4** ローディング＋モノクロ→カラーを実装して完成

このファイルは参照用。実装は上記に従う。
