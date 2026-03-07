"""
銘木図鑑 - メインパイプライン
一つのコマンドで「リサーチ → 画像収集 → 記事生成 → WordPress投稿」まで実行します。

使用方法:
  python run_pipeline.py <木材名> [オプション]

オプション:
  --skip-research    既存のJSONを使う（再調査しない）
  --skip-images      画像検索をスキップ
  --publish          ドラフトではなく直接公開
  --description-only BASEの商品説明文だけ生成
  --html-only        HTMLだけ生成してWordPressには投稿しない

例:
  python run_pipeline.py パドウク
  python run_pipeline.py エボニー --skip-research
  python run_pipeline.py かりん --html-only
"""
import sys
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def run_pipeline(
    wood_name: str,
    skip_research: bool = False,
    skip_images: bool = False,
    publish: bool = False,
    html_only: bool = False,
    description_only: bool = False,
):
    print(f"\n{'='*60}")
    print(f"  銘木図鑑パイプライン: {wood_name}")
    print(f"{'='*60}\n")

    from research_wood import research_wood, load_wood_data

    # ── STEP 1: リサーチ ──────────────────────────────────────
    data_file = Path(__file__).parent.parent / "data" / "woods" / f"{wood_name}.json"
    if not skip_research or not data_file.exists():
        print("📚 STEP 1/4: 木材情報をリサーチ中...")
        wood_data = research_wood(wood_name)
    else:
        print("📚 STEP 1/4: 既存データを使用")
        wood_data = load_wood_data(wood_name)

    wood_name_ja = wood_data.get("wood_name_ja", wood_name)
    print(f"   木材名: {wood_name_ja} / {wood_data.get('scientific_name', '')}\n")

    # ── STEP 2: 商品説明（description_only モード）─────────────
    if description_only:
        print("📝 BASE商品説明を生成中...")
        from generate_description import generate_description, load_pens_csv
        pens = load_pens_csv()
        pen_row = next((p for p in pens if p["wood_name"] == wood_name), None)
        if not pen_row:
            pen_row = {"wood_name": wood_name, "pen_type": "BP", "color": "silver",
                       "technique": "無垢", "catch_copy": "", "memo": ""}
        desc = generate_description(pen_row, wood_data)
        out = Path(__file__).parent.parent / "output" / f"{wood_name_ja}_description.txt"
        out.parent.mkdir(exist_ok=True)
        out.write_text(desc, encoding="utf-8")
        print(f"✅ 商品説明を保存: {out}")
        return

    # ── STEP 2: 画像検索 ──────────────────────────────────────
    images = []
    if not skip_images:
        print("🖼  STEP 2/4: 画像を検索中...")
        from search_images import find_images_for_wood, load_wood_images
        images = find_images_for_wood(wood_data, limit=6)
        if not images:
            print("   ⚠️  画像が見つかりませんでした（photos/ フォルダの画像を使用してください）")
    else:
        from search_images import load_wood_images
        images = load_wood_images(wood_name_ja)
        print(f"🖼  STEP 2/4: 既存画像データを使用 ({len(images)}件)")
    print()

    # ── STEP 3: 記事HTML生成 ──────────────────────────────────
    print("✍️  STEP 3/4: 記事HTMLを生成中...")
    from generate_article import generate_article, generate_post_title, save_article
    title = generate_post_title(wood_data)
    html_content = generate_article(wood_data, images)
    output_file = save_article(wood_name_ja, html_content, title)
    print(f"   タイトル: {title}")
    print(f"   保存先: {output_file}\n")

    # ── STEP 4: WordPress投稿 ─────────────────────────────────
    if html_only:
        print("✅ HTMLのみ生成完了（WordPress投稿はスキップ）")
        print(f"\n📄 出力ファイル:\n   {output_file}")
        return

    status = "publish" if publish else "draft"
    print(f"🚀 STEP 4/4: WordPress に {status} として投稿中...")
    from publish_to_wp import publish_wood_article
    result = publish_wood_article(wood_data, html_content, images, status=status)

    # ── 完了サマリー ──────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  ✅ パイプライン完了: {wood_name_ja}")
    print(f"{'='*60}")
    if "id" in result:
        print(f"  WordPress記事ID: {result['id']}")
        print(f"  記事URL: {result.get('link', '—')}")
        print(f"  ステータス: {result.get('status', status)}")
    print(f"  HTMLファイル: {output_file}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="銘木図鑑 パイプライン",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("wood_name", help="木材名（日本語 or 学名）")
    parser.add_argument("--skip-research", action="store_true", help="既存JSONを使用")
    parser.add_argument("--skip-images", action="store_true", help="画像検索スキップ")
    parser.add_argument("--publish", action="store_true", help="直接公開（デフォルト: ドラフト）")
    parser.add_argument("--html-only", action="store_true", help="HTML生成のみ")
    parser.add_argument("--description-only", action="store_true", help="BASE商品説明のみ生成")
    args = parser.parse_args()

    run_pipeline(
        wood_name=args.wood_name,
        skip_research=args.skip_research,
        skip_images=args.skip_images,
        publish=args.publish,
        html_only=args.html_only,
        description_only=args.description_only,
    )


if __name__ == "__main__":
    main()
