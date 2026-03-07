"""
銘木図鑑 - BASE商品説明文生成スクリプト
pens.csv のデータと木材JSONを組み合わせて、BASE用の商品説明文を生成します。
"""
import csv
import json
import sys
from pathlib import Path

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "description_template.txt"
OUTPUT_DIR = Path(__file__).parent.parent / "output"

# ペンタイプの日本語変換
PEN_TYPE_MAP = {
    "BP": "ボールペン",
    "MP": "シャープペンシル",
    "FP": "万年筆",
    "RP": "ローラーボール",
}

# 金具色の日本語変換
HARDWARE_COLOR_MAP = {
    "gold": "ゴールド",
    "silver": "シルバー",
    "black": "マットブラック",
    "rose_gold": "ローズゴールド",
    "gunmetal": "ガンメタル",
}

# 技法の説明
TECHNIQUE_MAP = {
    "木象嵌": "木象嵌（異なる樹種の木材を組み合わせて模様を描く、伝統的な技法）",
    "無垢": "無垢材（一本の原木から削り出した、素材本来の美しさを活かした仕上げ）",
    "ターニング": "旋盤加工（木材を回転させながら削り出す、ろくろ師の技）",
}


def load_pens_csv() -> list:
    pens_file = Path(__file__).parent.parent / "data" / "pens.csv"
    with open(pens_file, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_wood_data(wood_name: str) -> dict:
    data_file = Path(__file__).parent.parent / "data" / "woods" / f"{wood_name}.json"
    if not data_file.exists():
        return {}
    with open(data_file, "r", encoding="utf-8") as f:
        return json.load(f)


def load_template() -> str:
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        return f.read()


def generate_wood_description(wood_data: dict) -> str:
    """木材の特徴説明文（BASE商品説明の {wood_description} 部分）"""
    name = wood_data.get("wood_name_ja", "")
    reading = wood_data.get("wood_name_reading", "")
    overview = wood_data.get("overview", "")
    color = wood_data.get("color_description", "")
    pen_chars = wood_data.get("pen_characteristics", "")
    origins = "・".join(wood_data.get("origin_countries", []))

    lines = []
    if origins:
        lines.append(f"【原産】{origins}")
    if color:
        lines.append(f"【色・木目】{color}")
    if overview:
        lines.append(f"\n{overview}")
    if pen_chars:
        lines.append(f"\n{pen_chars}")

    return "\n".join(lines)


def generate_description(pen_row: dict, wood_data: dict) -> str:
    template = load_template()

    wood_name = pen_row.get("wood_name", "")
    catch_copy = pen_row.get("catch_copy", "").replace("【例：木材のキャッチコピー】", "")
    if not catch_copy:
        catch_copy = wood_data.get("catch_copy", f"{wood_name}の美しさ")

    pen_type_raw = pen_row.get("pen_type", "BP")
    pen_type = PEN_TYPE_MAP.get(pen_type_raw, pen_type_raw)

    hardware_color_raw = pen_row.get("color", "silver")
    hardware_color = HARDWARE_COLOR_MAP.get(hardware_color_raw, hardware_color_raw)

    technique_raw = pen_row.get("technique", "")
    technique_desc = TECHNIQUE_MAP.get(technique_raw, technique_raw)

    blog_url = f"https://kinmokuseijp.blog/{wood_data.get('slug', '')}" if wood_data.get("slug") else ""
    extra_notes = pen_row.get("memo", "")

    wood_description = generate_wood_description(wood_data) if wood_data else f"{wood_name}の木材を使用しています。"

    result = template.format(
        wood_name=wood_name,
        wood_description=wood_description,
        catch_copy=catch_copy,
        blog_url=blog_url if blog_url else "https://kinmokuseijp.blog/",
        extra_notes=f"\n{extra_notes}\n" if extra_notes else "",
        finish=technique_desc,
        hardware_color=hardware_color,
        mechanism=pen_type,
    )
    return result


def generate_all_descriptions():
    """pens.csv の全エントリーの商品説明を生成"""
    OUTPUT_DIR.mkdir(exist_ok=True)
    pens = load_pens_csv()
    generated = []

    for pen in pens:
        wood_name = pen.get("wood_name", "")
        if not wood_name:
            continue

        print(f"  📝 {wood_name} の商品説明を生成中...")
        wood_data = load_wood_data(wood_name)
        description = generate_description(pen, wood_data)

        out_file = OUTPUT_DIR / f"{wood_name}_description.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(description)

        generated.append({"wood_name": wood_name, "file": str(out_file)})
        print(f"  ✅ 保存: {out_file}")

    return generated


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        # 特定の木材のみ生成
        wood_name = sys.argv[1]
        pens = load_pens_csv()
        pen_row = next((p for p in pens if p["wood_name"] == wood_name), None)

        if not pen_row:
            # pens.csvにないが木材データがある場合は仮の行で生成
            pen_row = {"wood_name": wood_name, "pen_type": "BP", "color": "silver",
                       "technique": "無垢", "catch_copy": "", "memo": ""}

        wood_data = load_wood_data(wood_name)
        description = generate_description(pen_row, wood_data)

        OUTPUT_DIR.mkdir(exist_ok=True)
        out_file = OUTPUT_DIR / f"{wood_name}_description.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(description)

        print(f"✅ 商品説明生成完了: {out_file}")
        print("\n=== プレビュー（先頭200文字）===")
        print(description[:200] + "...")
    else:
        print("全エントリーの商品説明を生成します...")
        results = generate_all_descriptions()
        print(f"\n✅ {len(results)}件の商品説明を生成しました")
