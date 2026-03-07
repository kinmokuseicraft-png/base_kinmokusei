"""
木軸ペン工房 金木犀 - 漆塗りデザインアイデア生成ツール
---------------------------------------------------------
Gemini 画像生成 API を使って木軸ペンの漆塗りデザインをビジュアル化する。

【事前準備】
  1. https://aistudio.google.com/apikey で Gemini API キーを取得
  2. .env の GEMINI_API_KEY に設定
  3. pip install google-genai

【使い方】
  python scripts/design_ideation.py               # 対話形式
  python scripts/design_ideation.py --wood チーク --style 黒漆 --motif 桜
  python scripts/design_ideation.py --count 2     # 生成枚数を指定（デフォルト: 4）
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

# Windows での日本語文字化け対策
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
DESIGNS_DIR = BASE_DIR / "output" / "designs"

# ─── 選択肢定義 ──────────────────────────────────────────
LACQUER_STYLES = {
    "1": ("黒漆",   "matte jet-black urushi lacquer, mirror-smooth finish"),
    "2": ("朱漆",   "vermillion red urushi lacquer, deep glossy finish"),
    "3": ("溜塗",   "amber-brown tame-nuri semi-transparent lacquer revealing wood grain"),
    "4": ("蒔絵",   "maki-e gold powder decoration on polished black lacquer"),
    "5": ("変り塗", "creative mixed-technique decorative lacquer with color gradients"),
    "6": ("錆漆",   "textured sabi-urushi rough surface lacquer, earthy matte brown"),
}

MOTIFS = {
    "1": ("桜",     "delicate cherry blossom sakura flowers and petals"),
    "2": ("波",     "flowing ocean waves in traditional Japanese seigaiha style"),
    "3": ("竹",     "bamboo stalks and leaves"),
    "4": ("菊",     "chrysanthemum flowers"),
    "5": ("龍",     "detailed Japanese dragon"),
    "6": ("幾何学", "geometric asanoha hemp-leaf lattice pattern"),
    "7": ("なし",   "plain, no additional motif, focus on lacquer texture"),
}


# ─── プロンプト生成 ───────────────────────────────────────
def build_prompt(wood_name: str, style_en: str, motif_en: str, color_tone: str) -> str:
    return f"""Professional product photograph of a handcrafted Japanese wooden ballpoint pen.

Materials and finish:
- Pen body: {wood_name} wood
- Lacquer: {style_en}
- Decorative motif: {motif_en}
- Color palette: {color_tone}

Style requirements:
- Traditional Japanese urushi lacquerwork, master craftsman quality
- Studio product photography, pure white background
- Soft directional lighting showing lacquer depth and sheen
- Macro close-up of the pen barrel surface
- Luxury artisan craft aesthetic
- The pen is oriented diagonally, showing the full barrel"""


# ─── メイン ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="漆塗りデザインアイデア生成")
    parser.add_argument("--wood",  help="木材名（例: チーク、ツヤバール）")
    parser.add_argument("--style", help="漆スタイル（例: 黒漆）")
    parser.add_argument("--motif", help="モチーフ（例: 桜）")
    parser.add_argument("--color", help="カラートーン（例: 黒×金）")
    parser.add_argument("--count", type=int, default=4, help="生成枚数（デフォルト: 4）")
    args = parser.parse_args()

    load_dotenv(BASE_DIR / ".env")
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or "your_" in api_key:
        print("エラー: .env に GEMINI_API_KEY を設定してください。")
        print("  取得先: https://aistudio.google.com/apikey")
        sys.exit(1)

    # ── 入力収集 ──────────────────────────────────────────
    print("\n" + "=" * 50)
    print("  木軸ペン 漆塗りデザイン生成")
    print("=" * 50)

    wood = args.wood or input("\n木材名（例: チーク、ツヤバール）: ").strip() or "Japanese exotic wood"

    if not args.style:
        print("\n【漆スタイルを選択】")
        for k, (ja, _) in LACQUER_STYLES.items():
            print(f"  {k}. {ja}")
        choice = input("番号: ").strip()
        style_ja, style_en = LACQUER_STYLES.get(choice, ("黒漆", "matte jet-black urushi lacquer"))
    else:
        style_ja = args.style
        style_en = next((en for ja, en in LACQUER_STYLES.values() if ja == args.style), args.style)

    if not args.motif:
        print("\n【モチーフを選択】")
        for k, (ja, _) in MOTIFS.items():
            print(f"  {k}. {ja}")
        choice = input("番号: ").strip()
        motif_ja, motif_en = MOTIFS.get(choice, ("なし", "plain, no additional motif"))
    else:
        motif_ja = args.motif
        motif_en = next((en for ja, en in MOTIFS.values() if ja == args.motif), args.motif)

    color_tone = args.color or input("\nカラートーン（例: 黒×金、朱×銀 ※ Enterでスキップ）: ").strip()
    if not color_tone:
        color_tone = "classic black and gold"

    count = args.count

    # ── 生成開始 ──────────────────────────────────────────
    prompt = build_prompt(wood, style_en, motif_en, color_tone)
    print(f"\n設定: {wood} × {style_ja} × {motif_ja} × {color_tone}")
    print(f"{count} 枚を生成中...\n")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("エラー: google-genai パッケージがインストールされていません。")
        print("  pip install google-genai")
        sys.exit(1)

    try:
        client = genai.Client(api_key=api_key)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        save_dir = DESIGNS_DIR / f"{timestamp}_{wood}_{style_ja}_{motif_ja}"
        save_dir.mkdir(parents=True, exist_ok=True)

        saved = []
        for i in range(count):
            print(f"  [{i + 1}/{count}] 生成中...")
            response = client.models.generate_content(
                model="gemini-2.0-flash-preview-image-generation",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"]
                ),
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data is not None:
                    out_path = save_dir / f"design_{i + 1:02d}.png"
                    out_path.write_bytes(part.inline_data.data)
                    saved.append(out_path)
                    print(f"       保存: {out_path.name}")
                    break

        print(f"\n完了！ {len(saved)} 枚を保存しました。")
        print(f"フォルダ: {save_dir}")

        # Windows でフォルダを自動で開く
        if sys.platform == "win32" and saved:
            os.startfile(str(save_dir))

    except Exception as e:
        print(f"\nエラー: {e}")
        print("\n考えられる原因:")
        print("  - API キーが間違っている")
        print("  - Gemini API の画像生成が無効（Google AI Studio で確認）")
        print("  - ネットワーク接続の問題")


if __name__ == "__main__":
    main()
