"""
銘木図鑑 - 木材リサーチスクリプト
Claude APIを使って木材の詳細情報を収集し、JSONで保存します。
"""
import anthropic
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

RESEARCH_PROMPT = """
以下の木材について、日本語のブログ記事「銘木図鑑」向けの詳細情報をJSON形式で返してください。
木材名: {wood_name}

以下のキーをすべて含むJSONを返してください。不明な項目は空文字列または空配列にしてください：

{{
  "wood_name_ja": "日本語名（例: 花梨）",
  "wood_name_reading": "読み仮名（例: かりん）",
  "wood_name_en": "英語名（例: Burmese Padauk）",
  "scientific_name": "学名（例: Pterocarpus macrocarpus）",
  "family": "科名（例: マメ科）",
  "genus": "属名（例: Pterocarpus）",
  "classification": "広葉樹 または 針葉樹",
  "aliases": ["別名1", "別名2"],
  "origin_countries": ["原産国1", "原産国2"],
  "specific_gravity": "気乾比重（例: 0.75〜0.90）",
  "hardness": "強度（非常に硬い / 硬い / やや硬い / 普通 / やや柔らかい のいずれか）",
  "janka_hardness": "ヤンカ硬度（例: 2,790 lbf (12,410 N) ）",
  "red_list": "IUCNレッドリスト状態（例: 絶滅危惧種 / 準絶滅危惧種 / 非絶滅種）",
  "color_description": "色合いの説明（80〜120字）。辺材・心材の色・経年変化を簡潔に",
  "grain_description": "木目の説明（80〜120字）。交錯木理・縞模様・油分などの特徴を簡潔に",
  "scent_description": "香りの説明（30〜60字）。香りがない場合は「特に香りはありません。」",
  "wood_motto": ["木言葉1", "木言葉2"],
  "wood_description": "BASE商品説明用の木材紹介文（60〜100字）。1〜2文で魅力を端的に伝える",
  "sections": [
    {{
      "h3": "第1セクションの大見出し（木の魅力・産地・特性などを象徴するタイトル）",
      "subsections": [
        {{
          "h4": "原産国と特徴",
          "paragraphs": [
            "段落1（150〜200字）: 産地・樹高・生育環境などの植物学的特徴",
            "段落2（100〜150字）: 追加情報（花・葉・実・成長速度など）"
          ]
        }},
        {{
          "h4": "名前の由来・語源",
          "paragraphs": [
            "段落1（100〜150字）: 学名・一般名の由来"
          ]
        }}
      ]
    }},
    {{
      "h3": "第2セクションの大見出し（文化・歴史・用途など）",
      "subsections": [
        {{
          "h4": "伝統的な用途と文化的背景",
          "paragraphs": [
            "段落1（150〜200字）: 家具・楽器・工芸品などへの利用と文化的意義",
            "段落2（100〜150字）: 歴史的・宗教的背景（あれば）"
          ]
        }},
        {{
          "h4": "日本との関わり",
          "paragraphs": [
            "段落1（100〜150字）: 日本での歴史・呼び名の由来・利用"
          ]
        }}
      ]
    }},
    {{
      "h3": "ペン軸素材としての魅力",
      "subsections": [
        {{
          "h4": "加工性と仕上がり",
          "paragraphs": [
            "段落1（150〜200字）: 加工性・磨き上がり・経年変化など、ペン素材としての特性"
          ]
        }},
        {{
          "h4": "お手入れについて",
          "paragraphs": [
            "段落1（80〜120字）: メンテナンス・保管方法の注意事項"
          ]
        }}
      ]
    }}
  ],
  "slug": "URLスラッグ（学名を英小文字ハイフン区切り。例: pterocarpus-macrocarpus）",
  "seo_description": "SEO用メタディスクリプション（120字以内）",
  "catch_copy": "キャッチコピー（10〜20字。木材の最大の魅力を端的に表現）"
}}

注意：
- JSONのみを返す（マークダウンコードブロック不要）
- すべての文章は日本語で
- ペン工房金木犀は木軸ペンを手作りする職人工房というコンテキストで書く
- sections は必ず3要素（産地・文化、ペン）の構成で返す
- paragraphs は必ず配列で返す（単一段落でも配列）
"""


def research_wood(wood_name: str) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        print("❌ ANTHROPIC_API_KEY が .env に設定されていません")
        print("   https://console.anthropic.com でAPIキーを取得し、.envに設定してください")
        sys.exit(1)

    print(f"🔍 '{wood_name}' の情報をClaude APIで調査中...")
    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[
            {"role": "user", "content": RESEARCH_PROMPT.format(wood_name=wood_name)}
        ],
    )

    raw = message.content[0].text.strip()
    # コードブロックで囲まれていた場合に除去
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    wood_data = json.loads(raw)

    # 保存
    data_dir = Path(__file__).parent.parent / "data" / "woods"
    data_dir.mkdir(parents=True, exist_ok=True)
    output_file = data_dir / f"{wood_name}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(wood_data, f, ensure_ascii=False, indent=2)

    print(f"✅ 保存完了: {output_file}")
    return wood_data


def load_wood_data(wood_name: str) -> dict:
    data_file = Path(__file__).parent.parent / "data" / "woods" / f"{wood_name}.json"
    if not data_file.exists():
        print(f"❌ {data_file} が見つかりません。先に research_wood.py を実行してください")
        sys.exit(1)
    with open(data_file, "r", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方法: python research_wood.py <木材名>")
        print("例:       python research_wood.py パドウク")
        sys.exit(1)
    wood_name = sys.argv[1]
    data = research_wood(wood_name)
    print("\n=== 調査結果 ===")
    print(f"  木材名:  {data.get('wood_name_ja')} ({data.get('wood_name_reading')})")
    print(f"  学名:    {data.get('scientific_name')}")
    print(f"  原産国:  {', '.join(data.get('origin_countries', []))}")
    print(f"  スラッグ: {data.get('slug')}")