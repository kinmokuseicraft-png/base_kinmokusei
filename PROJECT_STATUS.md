# 金杢犀（Kinmokusei）LINE 公式アカウント管理システム — プロジェクト現状

---

## 1. 【最終目的】システムのゴール定義

**Lステップ等の外部ツールに依存せず、Next.js で構築された美しい独自ダッシュボードを持ち、BASE と連携した金杢犀専用の LINE 公式アカウント管理システムをフルスクラッチで完成させること。**

具体的には以下を満たすこととする。

- **LINE 公式アカウントの運用**  
  LINE からのメッセージ受信・自動返信（Webhook）、必要に応じた LIFF による LINE 内ショッピング・体験画面の提供。
- **BASE 連携**  
  受注生産の木軸ペンなどの商品データを BASE API で取得し、管理画面での表示および LINE 配信（Flex Message 等）に利用する。
- **CRM（顧客管理）**  
  LINE ユーザー（友だち）の登録・更新、メッセージ送受信履歴の保存、分析・顧客一覧の参照が可能であること。
- **運用ダッシュボード**  
  商品管理・BASE 連携、分析・顧客管理、設定などを一つのダッシュボードで行えること。デザインテーマ（配色・余白・角丸など）を統一した「美しい」UIを維持する。

---

## 2. 【完了済みの実装】現在までに完成している機能・UI・連携モジュール

| カテゴリ | 内容 | パス・備考 |
|----------|------|------------|
| **Next.js 基盤** | App Router、ルートレイアウト、グローバル CSS（テーマ変数） | `app/layout.tsx`, `app/globals.css`, `next.config.ts`, `tsconfig.json` |
| **ダッシュボード UI** | トップページ、サイドバー付きレイアウト、ダッシュボードトップ | `app/page.tsx`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/dashboard/page.tsx` |
| **商品管理・BASE 連携ページ** | BASE 商品の画像付き一覧（カード型）、価格・在庫・商品リンク表示 | `app/(dashboard)/dashboard/products/page.tsx` |
| **BASE API 連携** | 認証（Bearer）、商品一覧取得、型定義、トークン未設定時のモック | `lib/base_api.ts`（`BaseProduct`, `getBaseProducts` 等） |
| **LINE Flex Message 生成** | BASE 商品配列からカルーセル型 Flex Message JSON を生成 | `lib/line_flex_generator.ts`（`buildProductCarousel`, `buildFlexMessageForReply`） |
| **画像表示** | 外部画像（BASE CDN）の Next.js Image 利用のための設定 | `next.config.ts` の `images.remotePatterns` |
| **既存データ・他システム** | 木材・アートワーク JSON、BASE スクレイプ用 Python、WordPress テーマ、LINE 本番用案内スクリプト | `data/woods/`, `data/artworks/`, `scripts/`, `kinmokusei-theme/`, `docs/PRODUCTION_STATUS.md` 等 |

**補足**

- 本番 URL・Webhook・Supabase・Cron については `docs/PRODUCTION_STATUS.md` に「kinmokusei-line」向けの記載があるが、**当リポジトリ（base_kinmokusei）内には Webhook 実装・DB クライアント・LIFF・分析画面は含まれていない**。上記はあくまで当リポジトリ内で存在する実装のリストである。

---

## 3. 【未実装・不足している機能】

LINE の実稼働や CRM として成立するために、現時点で足りていない機能を挙げる。

| 優先度 | 機能 | 説明 |
|--------|------|------|
| **高** | **LINE Webhook API** | LINE プラットフォームからの POST を受けるエンドポイント（例: `app/api/webhook/route.ts`）。メッセージ受信時に「ペン」等のキーワードで BASE 商品を取得し、Flex Message（カルーセル）で返信するロジック。署名検証・`@line/bot-sdk` 等の利用。 |
| **高** | **データベース（CRM 基盤）** | Supabase または Prisma 等による DB 接続。Users（LINE userId、表示名、登録日等）・Logs（送受信履歴）等のスキーマと型定義。ユーザー登録・更新、メッセージ履歴保存の関数の枠組み。 |
| **高** | **LIFF アプリ** | LINE 内ブラウザで開く独自画面（例: `app/liff/page.tsx`, `app/liff/layout.tsx`）。`@line/liff` による初期化・ユーザー情報取得（React Hooks）。モバイル向け商品一覧などのベース UI。 |
| **中** | **分析・顧客管理ページ** | ダッシュボード内の「分析」ページ（例: `app/(dashboard)/dashboard/analytics/page.tsx`）。友だち追加数の推移、人気木材・商品などのグラフ（recharts 等）。見栄えの良いモックデータでの可視化。 |
| **中** | **顧客一覧ページ** | ダッシュボード内の「顧客」ページ（例: `app/(dashboard)/dashboard/users/page.tsx`）。LINE 顧客の一覧（アイコン、表示名、状態等）をテーブルで表示する UI。 |
| **中** | **環境変数・デプロイ設定** | `BASE_ACCESS_TOKEN`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, Supabase 関連、LIFF ID 等の整理と、Vercel 用 `vercel.json`（Cron 等）との整合。 |
| **低** | **Cron / 定期処理** | 友だち数集計やログ集約など、必要に応じたサーバー側の定期実行（例: `/api/cron`）。 |
| **低** | **認証・管理画面ガード** | ダッシュボードへのログインや、管理者以外のアクセス制限（必要に応じて）。 |

---

## 4. 【今後の開発ロードマップ】MVP として本番稼働させるための開発ステップ

MVP（実用最小限の製品）として本番稼働させるための優先順位の高い開発ステップを並べる。

1. **LINE Webhook の実装（心臓部）**  
   - `@line/bot-sdk` を導入し、`app/api/webhook/route.ts` を実装する。  
   - テキストメッセージで「ペン」を含む場合、`lib/base_api.ts` で商品取得 → `lib/line_flex_generator.ts` でカルーセル生成 → 返信。  
   - 署名検証とエラーハンドリングを必ず含める。

2. **顧客データベース（CRM）連携基盤の構築**  
   - Supabase（または Prisma + DB）のクライアントと、Users / Logs 等のスキーマ型定義を作成。  
   - LINE userId をキーにした新規登録・更新関数、メッセージ送受信履歴を保存する関数の枠組みを用意する。  
   - Webhook 内でフォロー時・メッセージ受信時に DB 登録・ログ保存を呼び出すようにする。

3. **LIFF アプリの基盤構築**  
   - `app/liff/page.tsx` と `app/liff/layout.tsx` を作成。  
   - `@line/liff` で初期化し、画面ロード時にユーザー情報を取得する React Hooks を実装。  
   - モバイルに最適化した商品一覧 UI のベースを用意する。

4. **ダッシュボード「分析・顧客管理」の高度化**  
   - 分析ページ: recharts 等で「友だち追加数の推移」「よく見られている木材・商品」等をモックデータで可視化。  
   - 顧客一覧ページ: LINE 顧客のテーブル UI（アイコン、表示名、状態等）。  
   - 既存のダッシュボードのデザインテーマを引き継ぎ、サイドバーに「分析」「顧客」リンクを追加する。

5. **環境変数・デプロイ・手動テストの整備**  
   - 必要な環境変数の一覧と説明をドキュメント化。  
   - Vercel デプロイ手順、LINE Developers の Webhook URL / LIFF エンドポイント登録手順を整備。  
   - 本番投入前に「Webhook 疎通」「Flex 返信」「LIFF 起動」「ダッシュボード表示」等の手動テスト手順をまとめる。

---

*最終更新: プロジェクト全体スキャンに基づく現状分析（コード変更・インストールは行っていない）。*
