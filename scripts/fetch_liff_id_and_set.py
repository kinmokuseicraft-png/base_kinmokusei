#!/usr/bin/env python3
"""
LIFF ID を kinmokusei-line の .env.local に書き込む（引数で指定のみ。ブラウザ操作なし）。

使い方:
  python scripts/fetch_liff_id_and_set.py 1234567890-AbCdEfGh
  LIFF ID は LINE Developers コンソール → チャネル → LIFF で確認してください。
"""
import os
import re
import sys
from pathlib import Path

LIFF_ID_PATTERN = re.compile(r"\b(\d{10}-[a-zA-Z0-9]{6,})\b")
ENV_LOCAL = Path(__file__).resolve().parent.parent.parent / "kinmokusei-line" / ".env.local"


def main():
    if not ENV_LOCAL.parent.exists():
        print("kinmokusei-line が見つかりません。")
        return 1

    raw = (sys.argv[1].strip() if len(sys.argv) >= 2 else None) or os.environ.get("LIFF_ID", "").strip()
    if not raw:
        print("使い方: python scripts/fetch_liff_id_and_set.py <LIFF_ID>")
        print("例: python scripts/fetch_liff_id_and_set.py 1234567890-AbCdEfGh")
        print("LIFF ID は https://developers.line.biz/console/ → チャネル → LIFF で確認してください。")
        return 1
    if not LIFF_ID_PATTERN.match(raw):
        print("無効な LIFF ID 形式です。例: 1234567890-AbCdEfGh")
        return 1

    content = ENV_LOCAL.read_text(encoding="utf-8") if ENV_LOCAL.exists() else ""
    if "NEXT_PUBLIC_LIFF_ID=" in content:
        new_content = re.sub(r"NEXT_PUBLIC_LIFF_ID=.*", f"NEXT_PUBLIC_LIFF_ID={raw}", content, count=1)
    else:
        new_content = (content.rstrip() + "\nNEXT_PUBLIC_LIFF_ID=" + raw + "\n").strip() + "\n"
    ENV_LOCAL.write_text(new_content, encoding="utf-8")
    print("書き込みました:", ENV_LOCAL)
    return 0


if __name__ == "__main__":
    sys.exit(main())
