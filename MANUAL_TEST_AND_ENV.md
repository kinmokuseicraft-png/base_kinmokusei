# 人間が次に手動で行うべきテスト手順と環境変数の設定リスト

## 環境変数（.env または Vercel の Environment Variables）

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Webhook 用 | LINE Developers の「Messaging API」> チャネルアクセストークン（長期） |
| `LINE_CHANNEL_SECRET` | Webhook 用 | LINE Developers の「Messaging API」> チャネルシークレット |
| `BASE_ACCESS_TOKEN` | 商品取得用 | BASE API の OAuth2 アクセストークン（未設定時は商品一覧は空） |
| `BASE_CLIENT_ID` | BASE連携用 | BASE API の Client ID（OAuth2・サーバー側のみ使用・公開しない） |
| `BASE_CLIENT_SECRET` | BASE連携用 | BASE API の Client Secret（OAuth2・サーバー側のみ使用・厳重に管理） |
| `BASE_OAUTH_REDIRECT_URI` | 任意 | OAuth2 コールバックURL。未設定時は本番URL＋`/api/base/oauth/callback`。ローカルでは `http://localhost:3001/api/base/oauth/callback` を指定し、BASEの開発者設定にも同じURLを登録すること。 |
| `BASE_SHOP_ITEM_BASE_URL` | 任意 | 商品ページのベース URL（例: `https://kinmokusei.thebase.in`） |
| `NEXT_PUBLIC_SUPABASE_URL` | CRM 用 | Supabase プロジェクトの URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | CRM 用 | Supabase の anon key（公開可） |
| `SUPABASE_SERVICE_ROLE_KEY` | CRM 用 | Supabase の service_role key（サーバー専用・厳重に管理） |
| `NEXT_PUBLIC_LIFF_ID` | LIFF 用 | LINE Developers で作成した LIFF アプリの ID |
| `CRON_SECRET` | 任意 | シナリオ配信 API（`/api/cron/scenario-delivery`）呼び出し時の Bearer トークン。未設定なら認証なしで呼べる（本番では設定推奨） |

**BASE連携が動かない・「トークン取得または保存に失敗しました」が出る場合**

1. **Supabase のテーブルを一度だけ修正する**  
   Supabase ダッシュボード > SQL Editor で **`scripts/fix-supabase-tables.sql`** の内容をすべて実行してください。  
   - `base_settings` を正しい型（TIMESTAMPTZ）で作り直します（保存済みトークンは消えます）。  
   - `broadcasts` に不足しているカラム（title など）を追加します。  
2. 実行後、ダッシュボードで「認可URLを発行」→「BASEで認証を開く」→ BASE で「アプリを認証する」で再度認証してください。

**BASE OAuth で「認証に失敗」「500」が出る場合**

- ローカルは **ポート 3001** で起動すること。`npm run dev` または `pnpm dev` で起動（`next dev -p 3001`）。
- BASE の開発者設定の「リダイレクトURL」を **`http://localhost:3001/api/base/oauth/callback`** にし、.env の `BASE_OAUTH_REDIRECT_URI` も同じにすること。一文字でも違うと BASE が 400 を返し、コールバックが失敗する。
- ターミナルに `[base/oauth/callback] BASE token API error: 400 ...` と出たら、redirect_uri の不一致か認可コードの期限切れ。もう一度「認可URLを発行」からやり直す。

---

## BASE 注文 → LINE 自動送信フロー（設計）

- BASE で注文が発生した際、Webhook で当サーバーに POST が飛ぶ想定。
- 受信 API で注文を検証し `base_orders` に保存。注文内の商品 ID に対し、`base_products.line_display_image_url` を参照して LINE メッセージに添付する。
- 商品 ID → LINE 表示用画像取得・メッセージ組み立ての枠組みは `lib/base_order_line.ts`（`getLineDisplayImagesForItems`, `buildPurchaseMessageStub`）を参照。Webhook 受信エンドポイントと LINE 送信呼び出しは別途実装する。

---

## 手動テスト手順

### 1. ローカル起動

```bash
cd c:\Users\tsuba\Desktop\base_kinmokusei
npm run dev
```

ブラウザで以下を確認する。

- `http://localhost:3001` … トップ → 「ダッシュボードへ」で遷移
- `http://localhost:3001/dashboard` … ダッシュボードトップ
- `http://localhost:3001/dashboard/products` … 商品一覧（モック or BASE 取得）
- `http://localhost:3001/dashboard/analytics` … 分析グラフ（message_logs / users 集計）
- `http://localhost:3001/dashboard/users` … 顧客一覧（Supabase users）
- `http://localhost:3001/liff` … LIFF 画面（LIFF ID 未設定時はエラー表示で正常）

### 2. LINE Webhook のテスト

1. **ngrok などでローカルを公開**

   ```bash
   ngrok http 3001
   ```

2. **LINE Developers** で対象チャネルの「Webhook URL」を  
   `https://<ngrokのURL>/api/webhook` に設定し、「検証」で成功することを確認。

3. **Webhook の利用** をオンにする。

4. 公式アカウントとトークで「ペン」を含むメッセージを送信。  
   → カルーセル形式で商品が返ってくれば OK。

5. 「ペン」を含まないメッセージでは何も返信されないことを確認。

### 3. LIFF のテスト

1. LINE Developers で LIFF アプリを追加し、エンドポイント URL を  
   `https://<本番ドメイン>/liff` に設定。  
   ローカル確認時は ngrok URL を指定しても可。

2. `.env.local` に `NEXT_PUBLIC_LIFF_ID=<LIFF ID>` を設定し、`npm run dev` で再起動。

3. LINE アプリ内で LIFF の URL を開く（または QR コードで）。  
   プロフィール（表示名・アイコン）と商品一覧が表示されれば OK。

### 4. Supabase（CRM）の準備（任意）

1. Supabase でプロジェクトを作成。

2. SQL エディタで以下を実行（テーブル作成）。

   ```sql
   -- users テーブル（LINE 顧客）
   CREATE TABLE IF NOT EXISTS users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     line_user_id TEXT UNIQUE NOT NULL,
     display_name TEXT,
     picture_url TEXT,
     status TEXT DEFAULT 'active',
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- message_logs テーブル（送受信ログ）
   CREATE TABLE IF NOT EXISTS message_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     line_user_id TEXT NOT NULL,
     direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
     message_type TEXT NOT NULL,
     payload JSONB,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

3. **拡張スキーマ（タグ・シナリオ配信用）** — 以下を同じく SQL エディタで実行。  
   **注意**: テーブル名が `users` ではなく `line_users` の場合は、`ALTER TABLE users` を `ALTER TABLE line_users` に読み替えて実行してください。

   ```sql
   -- line_users にタグ用カラム追加（キーワード反応で自動付与）
   ALTER TABLE line_users ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

   -- line_users に顧客紐付け用カラム追加（LINE メール・BASE 顧客突合用）
   ALTER TABLE line_users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
   ALTER TABLE line_users ADD COLUMN IF NOT EXISTS base_customer_id TEXT;
   ALTER TABLE line_users ADD COLUMN IF NOT EXISTS last_linked_at TIMESTAMPTZ;

   -- シナリオ配信：シナリオに紐づくメッセージ
   CREATE TABLE IF NOT EXISTS scenario_messages (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     scenario_id TEXT NOT NULL,
     step_order INT NOT NULL,
     message_text TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT now()
   );

   -- ユーザーごとのシナリオ進行
   CREATE TABLE IF NOT EXISTS user_scenario_progress (
     line_user_id TEXT NOT NULL,
     scenario_id TEXT NOT NULL,
     current_step INT NOT NULL DEFAULT 0,
     updated_at TIMESTAMPTZ DEFAULT now(),
     PRIMARY KEY (line_user_id, scenario_id)
   );

   -- 一斉配信（下書き・予約・送信済）
   CREATE TABLE IF NOT EXISTS broadcasts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL DEFAULT '',
     body TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
     scheduled_at TIMESTAMPTZ,
     sent_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- BASE連携：商品マスタ（LINE表示用画像URLを紐付け）
   CREATE TABLE IF NOT EXISTS base_products (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     base_item_id INT UNIQUE NOT NULL,
     title TEXT,
     image_url TEXT,
     item_url TEXT,
     price INT,
     stock INT,
     list_order INT DEFAULT 0,
     line_display_image_url TEXT,
     updated_at TIMESTAMPTZ DEFAULT now(),
     created_at TIMESTAMPTZ DEFAULT now()
   );
   **既存の base_products に list_order を追加する（一度だけ）**  
   Supabase ダッシュボード > SQL Editor で `scripts/add-list-order-base-products.sql` の内容を実行するか、以下を実行してください。  
   `ALTER TABLE base_products ADD COLUMN IF NOT EXISTS list_order INT DEFAULT 0;`

   -- BASE連携：注文（Webhook用・購入者への自動メッセージで利用）
   CREATE TABLE IF NOT EXISTS base_orders (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     base_order_id TEXT UNIQUE,
     payload JSONB,
     line_user_id TEXT,
     notified_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT now()
   );

   -- BASE連携：OAuth2 トークン保存（1ショップ1行を想定・id=1 で運用可）
   CREATE TABLE IF NOT EXISTS base_settings (
     id INT PRIMARY KEY DEFAULT 1,
     access_token TEXT NOT NULL,
     refresh_token TEXT NOT NULL,
     expires_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ DEFAULT now(),
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

   **「invalid input syntax for type bigint」が出る場合**  
   Supabase で `base_settings` の日付カラムが BIGINT になっている可能性があります。Supabase SQL エディタで次を実行し、テーブルを正しい型で作り直してください（保存済みトークンは消えますが、再度「認可URLを発行」で取得できます）。

   ```sql
   DROP TABLE IF EXISTS base_settings;
   CREATE TABLE base_settings (
     id INT PRIMARY KEY DEFAULT 1,
     access_token TEXT NOT NULL,
     refresh_token TEXT NOT NULL,
     expires_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ DEFAULT now(),
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

4. `.env` に `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY`（または `NEXT_PUBLIC_SUPABASE_ANON_KEY`）を設定。

5. Webhook でメッセージ受信時に `upsertLineUser` / `saveMessageLog` が呼ばれ、キーワード（エボニー・金桑など）で `addUserTag` によりタグが付与されます。顧客一覧・分析は Supabase の実データで表示されます。

### 6. 本番デプロイ（Vercel）後の確認

1. Vercel に環境変数をすべて設定。
2. LINE Webhook URL を `https://<本番ドメイン>/api/webhook` に変更。
3. LIFF のエンドポイントを本番 URL に変更。
4. 上記「2. LINE Webhook」「3. LIFF」の手順を本番 URL で再実施。

### 7. 検証の義務化（LINE → DB → ダッシュボード）

1. **LINE からメッセージを送る**  
   公式アカウントで「ペン」や「エボニー」などと送信。
2. **Vercel Logs で確認**  
   Vercel ダッシュボード → 対象プロジェクト → Logs。`[webhook] テキスト受信` や `[webhook] 署名検証: 成功`、`message_logs 保存` が出ていること。
3. **Supabase で確認**  
   `message_logs` に受信（direction=in）が 1 件増えていること。`users` にその `line_user_id` がいること。キーワード送信時は `users.tags` に該当タグが入っていること。
4. **ダッシュボードで確認**  
   `/dashboard` の総メッセージ数が 1 増えていること。`/dashboard/users` に該当ユーザーが表示されること。`/dashboard/analytics` のグラフが実データになっていること。

これらを満たして初めて「実機能として動作している」と判断してください。

---

以上が、人間が次に手動で行うべきテスト手順と環境変数の設定リストです。
