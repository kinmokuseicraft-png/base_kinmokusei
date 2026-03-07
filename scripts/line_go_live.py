#!/usr/bin/env python3
"""
本番デプロイと LINE 手動設定の案内のみ行う（Vercel CLI のみ使用）。

1. Vercel 管理画面で設定する環境変数の「キー名一覧」を出力
2. npx vercel deploy --prod を実行
3. 発行された本番 URL をターミナルに出力
4. LINE Developers で手動設定する旨の案内文を出力
"""
import re
import subprocess
import sys
from pathlib import Path

KINMOKUSEI_LINE = Path(__file__).resolve().parent.parent / "kinmokusei-line"

# Vercel 管理画面で手動設定する環境変数のキー名（値は .env.local を参照して手でコピー）
ENV_KEYS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "LINE_CHANNEL_SECRET",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "NEXT_PUBLIC_LIFF_ID",
    "CRON_SECRET",
    "NEXT_PUBLIC_APP_URL",  # 本番では空でも可（VERCEL_URL が自動で入る）
]


def main():
    if not KINMOKUSEI_LINE.exists():
        print("kinmokusei-line が見つかりません。")
        return 1

    print("=" * 60)
    print("Vercel で設定する環境変数（キー名の一覧）")
    print("  Vercel → kinmokusei-line → Settings → Environment Variables")
    print("  で、以下のキーを Production に追加し、値を設定してください。")
    print("=" * 60)
    for k in ENV_KEYS:
        print(" ", k)
    print("=" * 60)
    print()

    print("Vercel CLI で本番デプロイを実行します（npx vercel deploy --prod）...")
    print()
    try:
        r = subprocess.run(
            "npx vercel deploy --prod --yes",
            cwd=KINMOKUSEI_LINE,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300,
        )
        out = (r.stdout or "") + (r.stderr or "")
        print(out)
        if r.returncode != 0:
            print("デプロイに失敗しました。事前に npx vercel login を実行してください。")
            return 1
        m = re.search(r"https://[^\s\)\"]+\.vercel\.app", out)
        production_url = m.group(0).rstrip("/") if m else None
    except subprocess.TimeoutExpired:
        print("デプロイがタイムアウトしました。")
        return 1
    except FileNotFoundError:
        print("npx が見つかりません。Node.js をインストールしてください。")
        return 1

    if not production_url:
        production_url = "https://kinmokusei-line.vercel.app"
        print("（出力から URL を取得できなかったため、代表 URL を表示します）")

    print()
    print("=" * 60)
    print("本番 URL（エンドポイント）")
    print("=" * 60)
    print(" ", production_url)
    print("=" * 60)
    print()
    print("LINE Developers コンソールを開き、以下を手動で登録してください。")
    print()
    print("  Webhook URL:")
    print("    " + production_url + "/api/webhook")
    print()
    print("  LIFF の Endpoint URL（該当 LIFF アプリの設定）:")
    print("    " + production_url + "/")
    print()
    print("  https://developers.line.biz/console/")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
