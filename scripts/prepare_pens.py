"""
木軸ペン工房 金木犀 - 出品準備スクリプト
------------------------------------------
撮影後、uploader.py を実行する前に本スクリプトを実行して
data/pens.csv を生成する。

【使い方】
  python scripts/prepare_pens.py

【入力内容（ペン1本ごと）】
  - 木材名（data/woods/ の一覧から番号で選択）
  - ペン種別（BP / MP）
  - 金具カラー
  - 価格
  - 備考（任意）

【出力】
  data/pens.csv  ← uploader.py が読み込むCSV
"""

import csv
import json
import re
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
WOODS_DIR = BASE_DIR / "data" / "woods"
PENS_CSV = BASE_DIR / "data" / "pens.csv"

DEFAULT_FINISH = "天然成分100%カルナバ仕立て"
DEFAULT_MECHANISM_BP = "ノック式"
DEFAULT_MECHANISM_MP = "ノック式"

HARDWARE_COLORS = ["ゴールド", "マットブラック", "シルバー", "クローム"]
SALE_TYPES = ["通常販売", "抽選販売"]


# ─── ユーティリティ ────────────────────────────────────
def load_wood(wood_name: str) -> dict:
    safe_name = re.sub(r'[\\/:*?"<>|]', "_", wood_name)
    path = WOODS_DIR / f"{safe_name}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def list_woods() -> list[str]:
    return [
        f.stem for f in sorted(WOODS_DIR.glob("*.json"))
        if not f.stem.startswith("_")
    ]


def extract_wood_description(base_description: str) -> str:
    """base_description から ◆作品について セクションのテキストを抽出する"""
    m = re.search(
        r"◆作品について\n(.+?)(?=\n\n【|\n【)",
        base_description,
        re.DOTALL,
    )
    return m.group(1).strip() if m else ""


def ask(prompt: str, default: str = "") -> str:
    disp = f" [{default}]" if default else ""
    val = input(f"  {prompt}{disp}: ").strip()
    return val if val else default


def ask_choice(prompt: str, choices: list[str], default: str = "") -> str:
    print(f"  {prompt}")
    for i, c in enumerate(choices, 1):
        marker = " ◀" if c == default else ""
        print(f"    {i}. {c}{marker}")
    while True:
        val = input(f"  番号か直接入力 [{default}]: ").strip()
        if not val:
            return default
        if val.isdigit() and 1 <= int(val) <= len(choices):
            return choices[int(val) - 1]
        return val


# ─── 1本分の入力 ──────────────────────────────────────
def collect_pen_info(index: int) -> dict | None:
    print(f"\n{'─'*45}")
    print(f"  ペン {index}")
    print(f"  （木材名を空欄で Enter → 入力終了）")
    print(f"{'─'*45}")

    woods = list_woods()
    print("\n  使用可能な木材:")
    cols = 3
    for i, w in enumerate(woods, 1):
        end = "\n" if i % cols == 0 else "  "
        print(f"  {i:2}. {w:<20}", end=end)
    print()

    wood_input = input("\n  木材名（番号またはテキスト）: ").strip()
    if not wood_input:
        return None

    if wood_input.isdigit() and 1 <= int(wood_input) <= len(woods):
        wood_name = woods[int(wood_input) - 1]
    else:
        wood_name = wood_input

    wood = load_wood(wood_name)
    if not wood:
        print(f"  ※ data/woods/{wood_name}.json が見つかりません（新規木材として扱います）")

    # ── ペン種別 ──────────────────────────────────────
    pen_type = ask_choice("ペン種別", ["BP", "MP"], default="BP")

    # ── 金具カラー ────────────────────────────────────
    default_hw = wood.get("hardware_color", "ゴールド")
    hardware_color = ask_choice("金具カラー", HARDWARE_COLORS, default=default_hw)

    # ── 生地仕立て ────────────────────────────────────
    finish = ask("生地仕立て", default=wood.get("finish", DEFAULT_FINISH))

    # ── メカニカル ────────────────────────────────────
    mech_default = DEFAULT_MECHANISM_MP if pen_type == "MP" else DEFAULT_MECHANISM_BP
    mechanism = ask("メカニカル", default=mech_default)

    # ── 販売形式 ──────────────────────────────────────
    sale_type = ask_choice("販売形式", SALE_TYPES, default="通常販売")

    # ── 価格 ──────────────────────────────────────────
    price = ask("価格（円）", default=wood.get("price", ""))

    # ── 備考 ──────────────────────────────────────────
    extra_notes = ask("備考 extra_notes（任意）", default=wood.get("extra_notes", ""))

    # ── wood_description を base_description から抽出 ──
    wood_description = ""
    if wood.get("base_description"):
        wood_description = extract_wood_description(wood["base_description"])
    if not wood_description:
        print("  ※ wood_description を自動抽出できませんでした。後で pens.csv を直接編集してください。")
        wood_description = ask("  wood_description（手動入力）", default="")

    return {
        "wood_name": wood_name,
        "catch_copy": wood.get("catch_copy", ""),
        "wood_description": wood_description,
        "blog_url": wood.get("blog_url", ""),
        "finish": finish,
        "hardware_color": hardware_color,
        "mechanism": mechanism,
        "pen_type": pen_type,
        "artwork_name": "",
        "price": price,
        "sale_type": sale_type,
        "extra_notes": extra_notes,
        "title": "",
    }


# ─── メイン ────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser(description="pens.csv 生成スクリプト")
    parser.add_argument("--output", "-o", default=str(PENS_CSV), help="出力CSVパス")
    parser.add_argument("--yes", "-y", action="store_true", help="確認プロンプトをスキップ（保存確認を自動でYES）")
    args = parser.parse_args()
    out_path = Path(args.output)

    print("\n" + "=" * 45)
    print("  出品準備スクリプト")
    print(f"  出力先: {out_path}")
    print("=" * 45)
    print("  ペン情報を1本ずつ入力してください。")
    print("  木材名を空欄にすると入力終了です。")

    pens = []
    i = 1
    while True:
        pen = collect_pen_info(i)
        if pen is None:
            break
        pens.append(pen)
        print(f"\n  ✓ ペン{i}: {pen['wood_name']} {pen['pen_type']} {pen['hardware_color']} ¥{pen['price']}")
        i += 1

    if not pens:
        print("\nペンが入力されていません。終了します。")
        return

    # ── 確認 ──────────────────────────────────────────
    print("\n" + "=" * 45)
    print("  入力内容の確認")
    print("=" * 45)
    for i, pen in enumerate(pens, 1):
        print(f"  ペン{i}: {pen['wood_name']}  {pen['pen_type']}  {pen['hardware_color']}  ¥{pen['price']}  {pen['sale_type']}")
    print()
    if args.yes:
        print("  （--yes のため自動で保存します）")
    else:
        confirm = input("  この内容で pens.csv を保存しますか？ [Y/n]: ").strip().lower()
        if confirm == "n":
            print("キャンセルしました。")
            return

    # ── CSV 書き出し ───────────────────────────────────
    fieldnames = [
        "wood_name", "catch_copy", "wood_description", "blog_url",
        "finish", "hardware_color", "mechanism", "pen_type",
        "artwork_name", "price", "sale_type", "extra_notes", "title",
    ]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(pens)

    print(f"\n  ✓ {len(pens)} 件を {out_path} に保存しました。")
    print("\n  次のステップ:")
    print("    python scripts/uploader.py --yes")


if __name__ == "__main__":
    main()