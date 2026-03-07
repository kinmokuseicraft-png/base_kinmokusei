# 人間が次に手動で行うべきテスト手順と環境変数の設定リスト

## 環境変数（.env または Vercel の Environment Variables）

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Webhook 用 | LINE Developers の「Messaging API」> チャネルアクセストークン（長期） |
| `LINE_CHANNEL_SECRET` | Webhook 用 | LINE Developers の「Messaging API」> チャネルシークレット |
| `BASE_ACCESS_TOKEN` | 商品取得用 | BASE API の OAuth2 アクセストークン（未設定時はモック商品で動作） |
| `BASE_SHOP_ITEM_BASE_URL` | 任意 | 商品ページのベース URL（例: `https://kinmokusei.thebase.in`） |
| `NEXT_PUBLIC_SUPABASE_URL` | CRM 用 | Supabase プロジェクトの URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | CRM 用 | Supabase の anon key（公開可） |
| `SUPABASE_SERVICE_ROLE_KEY` | CRM 用 | Supabase の service_role key（サーバー専用・厳重に管理） |
| `NEXT_PUBLIC_LIFF_ID` | LIFF 用 | LINE Developers で作成した LIFF アプリの ID |

---

## 手動テスト手順

### 1. ローカル起動

```bash
cd c:\Users\tsuba\Desktop\base_kinmokusei
npm run dev
```

ブラウザで以下を確認する。

- `http://localhost:3000` … トップ → 「ダッシュボードへ」で遷移
- `http://localhost:3000/dashboard` … ダッシュボードトップ
- `http://localhost:3000/dashboard/products` … 商品一覧（モック or BASE 取得）
- `http://localhost:3000/dashboard/analytics` … 分析グラフ（モックデータ）
- `http://localhost:3000/dashboard/users` … 顧客一覧（モックデータ）
- `http://localhost:3000/liff` … LIFF 画面（LIFF ID 未設定時はエラー表示で正常）

### 2. LINE Webhook のテスト

1. **ngrok などでローカルを公開**

   ```bash
   ngrok http 3000
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

3. `.env` に `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY`（または `NEXT_PUBLIC_SUPABASE_ANON_KEY`）を設定。

4. Webhook 内で `upsertLineUser` / `saveMessageLog` を呼び出す実装を追加すると、顧客一覧・分析が実データで動く（現状は枠組みのみ）。

### 5. 本番デプロイ（Vercel）後の確認

1. Vercel に環境変数をすべて設定。
2. LINE Webhook URL を `https://<本番ドメイン>/api/webhook` に変更。
3. LIFF のエンドポイントを本番 URL に変更。
4. 上記「2. LINE Webhook」「3. LIFF」の手順を本番 URL で再実施。

---

以上が、人間が次に手動で行うべきテスト手順と環境変数の設定リストです。
