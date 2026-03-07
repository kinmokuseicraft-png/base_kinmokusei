"""
木軸ペン工房 金木犀 - ペン彫刻デザイン案生成ツール
-----------------------------------------------------
ペンの写真を渡すと、その軸に合う彫刻デザインを5案提案し、
各案を「彫刻を施したペン写真」として画像生成する。

【使い方】
  python scripts/pen_design.py
  python scripts/pen_design.py --photo photos/20260303_test/DSC03649.jpg
  python scripts/pen_design.py --photo pen.jpg --technique 沈金 --count 5

【出力】
  output/designs/<timestamp>_<technique>/
    ideas.md        ← 5案のテキスト概要
    design_01.png   ← 案1の完成イメージ画像
    design_02.png   ← 案2の完成イメージ画像
    ...
"""

import argparse
import base64
import json
import os
import re
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

# ─── 彫刻技法の選択肢 ───────────────────────────────────
TECHNIQUES = {
    "1": ("沈金",   "chinkin gold engraving, fine gold lines inlaid into carved grooves"),
    "2": ("蒔絵",   "maki-e gold powder sprinkled decoration"),
    "3": ("レーザー彫刻", "laser engraving with gold or contrasting color fill"),
    "4": ("木象嵌", "wood inlay with contrasting wood pieces"),
}

# ─── Gemini へのプロンプト ────────────────────────────────
IDEA_PROMPT = """この木軸ペンの写真を見て、{technique}技法で表現するのに適した彫刻デザイン案を{count}つ考えてください。

軸の木目・色調・素材感をよく観察して、それに映えるデザインを提案してください。

以下のJSON形式で返してください（JSON以外のテキスト不要）：
[
  {{
    "id": 1,
    "theme": "テーマ名（日本語、例: 翡翠と葦）",
    "concept": "デザインのコンセプト（2〜3文で説明）",
    "elements": "描く要素の具体的な説明（モチーフ・構図・配置）",
    "prompt_en": "Detailed English description of the design for image generation"
  }}
]"""

IMAGE_PROMPT = """Look at this wooden pen photo carefully. Render a photorealistic visualization of this engraving design applied to the pen barrel:

Design: {prompt_en}
Technique: {technique_en}

Critical requirements:
- Keep the EXACT same pen angle, hand position, background, and lighting as the original photo
- Apply {technique_en} design ONLY on the pen barrel surface
- The design wraps naturally around the cylindrical barrel
- Gold/metallic colored engraving lines on the wood surface
- The engraving has realistic depth, texture, and metallic sheen
- Do NOT change anything else in the photo (hand, background, top/bottom of pen)
- High detail, photorealistic quality"""


# ─── ユーティリティ ──────────────────────────────────────
def load_image_bytes(photo_path: Path) -> bytes:
    with open(photo_path, "rb") as f:
        return f.read()


def get_mime_type(photo_path: Path) -> str:
    suffix = photo_path.suffix.lower()
    return {"jpg": "image/jpeg", ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg", ".png": "image/png"}.get(suffix, "image/jpeg")


def parse_json_from_response(text: str) -> list:
    """レスポンステキストからJSONを抽出してパース"""
    # コードブロック内のJSONを取得
    m = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if m:
        return json.loads(m.group(1))
    # 生のJSON配列を取得
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if m:
        return json.loads(m.group(0))
    raise ValueError(f"JSONが見つかりませんでした。\nレスポンス:\n{text[:500]}")


def save_ideas_md(ideas: list, save_dir: Path, technique: str):
    lines = [f"# 彫刻デザイン案（{technique}）\n"]
    for idea in ideas:
        lines += [
            f"## 案{idea['id']}：{idea['theme']}\n",
            f"**コンセプト:** {idea['concept']}\n",
            f"**図案の要素:** {idea['elements']}\n",
        ]
    (save_dir / "ideas.md").write_text("\n".join(lines), encoding="utf-8")


# ─── メイン ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="ペン彫刻デザイン案生成")
    parser.add_argument("--photo",     help="ペン写真のパス")
    parser.add_argument("--technique", help="彫刻技法（例: 沈金）")
    parser.add_argument("--count",     type=int, default=5, help="案の数（デフォルト: 5）")
    args = parser.parse_args()

    load_dotenv(BASE_DIR / ".env")
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or "your_" in api_key:
        print("エラー: .env に GEMINI_API_KEY を設定してください。")
        print("  取得先: https://aistudio.google.com/apikey")
        sys.exit(1)

    # ── ペン写真を選択 ────────────────────────────────────
    print("\n" + "=" * 50)
    print("  木軸ペン 彫刻デザイン案生成")
    print("=" * 50)

    if args.photo:
        photo_path = Path(args.photo)
    else:
        photo_str = input("\nペン写真のパス（またはファイルをドラッグ＆ドロップ）: ").strip().strip('"')
        photo_path = Path(photo_str)

    if not photo_path.exists():
        print(f"エラー: 写真が見つかりません: {photo_path}")
        sys.exit(1)

    # ── 彫刻技法を選択 ────────────────────────────────────
    if not args.technique:
        print("\n【彫刻技法を選択】")
        for k, (ja, _) in TECHNIQUES.items():
            print(f"  {k}. {ja}")
        choice = input("番号: ").strip()
        technique_ja, technique_en = TECHNIQUES.get(choice, ("沈金", "chinkin gold engraving"))
    else:
        technique_ja = args.technique
        technique_en = next((en for ja, en in TECHNIQUES.values() if ja == args.technique), args.technique)

    count = args.count

    # ── Gemini クライアント初期化 ─────────────────────────
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("エラー: google-genai パッケージが必要です。")
        print("  pip install google-genai")
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    image_bytes = load_image_bytes(photo_path)
    mime_type = get_mime_type(photo_path)

    # 出力フォルダ作成
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    save_dir = DESIGNS_DIR / f"{timestamp}_{technique_ja}"
    save_dir.mkdir(parents=True, exist_ok=True)

    # ── STEP 1: デザインアイデアをテキストで生成 ────────────
    print(f"\n[1/2] {count} 案のアイデアを生成中...")

    idea_prompt = IDEA_PROMPT.format(technique=technique_ja, count=count)

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            idea_prompt,
        ],
    )

    try:
        ideas = parse_json_from_response(response.text)
    except (ValueError, json.JSONDecodeError) as e:
        print(f"アイデアのパースに失敗: {e}")
        # パース失敗時はレスポンスをそのまま保存して続行できるようにする
        (save_dir / "ideas_raw.txt").write_text(response.text, encoding="utf-8")
        print(f"生テキストを保存: {save_dir / 'ideas_raw.txt'}")
        sys.exit(1)

    save_ideas_md(ideas, save_dir, technique_ja)
    print(f"  アイデア保存: {save_dir / 'ideas.md'}")
    for idea in ideas:
        print(f"  案{idea['id']}: {idea['theme']}")

    # ── STEP 2: 各案を画像化 ─────────────────────────────
    print(f"\n[2/2] {len(ideas)} 枚の完成イメージを生成中...")

    saved_images = []
    for idea in ideas:
        print(f"\n  案{idea['id']}: {idea['theme']} を生成中...")

        img_prompt = IMAGE_PROMPT.format(
            prompt_en=idea["prompt_en"],
            technique_en=technique_en,
        )

        try:
            resp = client.models.generate_content(
                model="gemini-2.0-flash-preview-image-generation",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    img_prompt,
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"]
                ),
            )

            for part in resp.candidates[0].content.parts:
                if part.inline_data is not None:
                    out_path = save_dir / f"design_{idea['id']:02d}_{idea['theme']}.png"
                    out_path.write_bytes(part.inline_data.data)
                    saved_images.append(out_path)
                    print(f"    保存: {out_path.name}")
                    break

        except Exception as e:
            print(f"    エラー（案{idea['id']}）: {e}")

    # ── 完了 ─────────────────────────────────────────────
    print(f"\n{'=' * 50}")
    print(f"完了！")
    print(f"  アイデア: {len(ideas)} 案")
    print(f"  画像生成: {len(saved_images)} 枚")
    print(f"  フォルダ: {save_dir}")

    if sys.platform == "win32" and (save_dir / "ideas.md").exists():
        os.startfile(str(save_dir))


if __name__ == "__main__":
    main()
