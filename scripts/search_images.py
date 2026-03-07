"""
銘木図鑑 - 画像検索・生成スクリプト
優先順位:
  1. Gemini Imagen 4（GEMINI_API_KEY が設定されている場合）
  2. Wikimedia Commons（著作権フリー画像）
  3. Unsplash（UNSPLASH_ACCESS_KEY が設定されている場合）
"""
import os
import json
import sys
import requests
from pathlib import Path
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

IMAGES_CACHE_DIR = Path(__file__).parent.parent / "output" / "images"


def search_wikimedia(query: str, limit: int = 8) -> list:
    """Wikimedia Commons から画像を検索（APIキー不要）"""
    api_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrnamespace": "6",
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "iiextmetadatafilter": "LicenseShortName|Artist|ImageDescription",
        "format": "json",
    }
    try:
        resp = requests.get(api_url, params=params, timeout=10)
        data = resp.json()
    except Exception as e:
        print(f"  ⚠️  Wikimedia検索エラー: {e}")
        return []

    images = []
    for page in data.get("query", {}).get("pages", {}).values():
        for info in page.get("imageinfo", []):
            if not info.get("mime", "").startswith("image/"):
                continue
            meta = info.get("extmetadata", {})
            license_short = meta.get("LicenseShortName", {}).get("value", "")
            # CC0 / CC-BY / Public Domain のみ使用
            if not any(
                k in license_short
                for k in ("CC0", "CC BY", "Public domain", "CC-BY", "Attribution")
            ):
                continue
            artist_raw = meta.get("Artist", {}).get("value", "")
            # HTMLタグを除去
            import re
            artist = re.sub(r"<[^>]+>", "", artist_raw).strip()
            images.append(
                {
                    "url": info["url"],
                    "title": page["title"].replace("File:", ""),
                    "license": license_short,
                    "artist": artist,
                    "source": "Wikimedia Commons",
                    "source_url": f"https://commons.wikimedia.org/wiki/{quote(page['title'])}",
                }
            )
    return images


def search_unsplash(query: str, limit: int = 5) -> list:
    """Unsplash から画像を検索（APIキーが必要）"""
    api_key = os.getenv("UNSPLASH_ACCESS_KEY", "")
    if not api_key:
        return []

    url = "https://api.unsplash.com/search/photos"
    headers = {"Authorization": f"Client-ID {api_key}"}
    params = {"query": query, "per_page": limit, "orientation": "landscape"}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        data = resp.json()
    except Exception as e:
        print(f"  ⚠️  Unsplash検索エラー: {e}")
        return []

    images = []
    for photo in data.get("results", []):
        images.append(
            {
                "url": photo["urls"]["regular"],
                "url_thumb": photo["urls"]["small"],
                "title": photo.get("description") or photo.get("alt_description") or query,
                "license": "Unsplash License (無料利用可・帰属表示推奨)",
                "artist": photo["user"]["name"],
                "artist_url": photo["user"]["links"]["html"],
                "source": "Unsplash",
                "source_url": photo["links"]["html"],
            }
        )
    return images


def generate_images_gemini(wood_data: dict, count: int = 3) -> list:
    """
    Gemini Nano Banana 2 で木材画像を生成する。
    生成画像は output/images/<wood_name>/ に保存。
    戻り値: images リスト（local_path 付き）
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or "your_gemini" in api_key:
        return []

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("  ⚠  google-genai が未インストール: pip install google-genai")
        return []

    wood_name   = wood_data.get("wood_name_ja", "wood")
    wood_name_en = wood_data.get("wood_name_en", "wood")
    scientific  = wood_data.get("scientific_name", "")
    color       = wood_data.get("color_description", "")
    grain       = wood_data.get("grain_description", "")
    origins     = "、".join(wood_data.get("origin_countries", []))

    # 保存先ディレクトリ
    save_dir = IMAGES_CACHE_DIR / wood_name
    save_dir.mkdir(parents=True, exist_ok=True)

    prompts = [
        # 1. メイン: 木材クロスセクション・木目アップ
        (
            f"Ultra realistic close-up photograph of {wood_name_en} ({scientific}) wood material. "
            f"Showing beautiful {color[:60] if color else 'natural'} grain pattern. "
            f"Professional product photography, natural studio lighting, "
            f"sharp focus on wood texture and grain, 16:9 aspect ratio."
        ),
        # 2. 産地・自然環境
        (
            f"Beautiful landscape photograph of natural forest in {origins or 'tropical region'}, "
            f"natural habitat of {wood_name_en} trees ({scientific}). "
            f"Lush greenery, soft natural lighting, documentary photography style."
        ),
        # 3. 木の全景・樹木
        (
            f"Majestic {wood_name_en} tree in its natural environment. "
            f"Full tree view showing trunk and canopy, natural daylight, "
            f"photorealistic nature photography."
        ),
    ]

    client = genai.Client(api_key=api_key)
    images = []
    model = "imagen-4.0-generate-001"

    print(f"  🎨 Gemini Imagen 4 で画像生成中... ({wood_name})")
    for i, prompt in enumerate(prompts[:count]):
        try:
            response = client.models.generate_images(
                model=model,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="16:9",
                ),
            )
            for gen_img in response.generated_images:
                img_bytes = gen_img.image.image_bytes
                save_path = save_dir / f"{wood_name}_{i+1:02d}.jpg"
                save_path.write_bytes(img_bytes)
                images.append({
                    "local_path": str(save_path),
                    "url": "",
                    "title": f"{wood_name} AI生成画像 {i+1}",
                    "license": "AI生成（Gemini Imagen 4）",
                    "artist": "金木犀 × Gemini",
                    "source": "Gemini Imagen 4",
                    "source_url": "",
                    "prompt": prompt[:80],
                })
                print(f"  ✅ 画像{i+1}生成完了: {save_path.name}")
        except Exception as e:
            print(f"  ⚠  画像{i+1}生成エラー: {e}")

    return images


def find_images_for_wood(wood_data: dict, limit: int = 6) -> list:
    """木材データから適切な画像を検索"""
    scientific_name = wood_data.get("scientific_name", "")
    wood_name_en = wood_data.get("wood_name_en", "")
    wood_name_ja = wood_data.get("wood_name_ja", "")

    images = []
    seen_urls = set()

    # ── 1. Gemini Nano Banana 2 で生成（優先） ──────────────
    gemini_images = generate_images_gemini(wood_data, count=min(3, limit))
    if gemini_images:
        images.extend(gemini_images)
        # Gemini で3枚取れたら追加検索は最小限でOK
        if len(images) >= limit:
            _save_image_cache(wood_name_ja, images)
            return images[:limit]

    # ── 2. Wikimedia Commons ───────────────────────────────
    queries = [
        scientific_name,
        f"{wood_name_en} wood",
        f"{wood_name_en} tree",
        wood_name_ja,
    ]

    print(f"  🖼  Wikimedia Commons を検索中...")
    for q in queries:
        if not q:
            continue
        results = search_wikimedia(q, limit=4)
        for img in results:
            if img["url"] not in seen_urls:
                seen_urls.add(img["url"])
                images.append(img)
        if len(images) >= limit:
            break

    if len(images) < limit:
        print(f"  🖼  Unsplash を検索中...")
        unsplash_results = search_unsplash(
            f"{wood_name_en} wood grain texture", limit - len(images)
        )
        for img in unsplash_results:
            if img["url"] not in seen_urls:
                seen_urls.add(img["url"])
                images.append(img)

    _save_image_cache(wood_name_ja, images)
    return images[:limit]


def _save_image_cache(wood_name_ja: str, images: list):
    if not images:
        return
    data_dir = Path(__file__).parent.parent / "data" / "woods"
    data_dir.mkdir(parents=True, exist_ok=True)
    img_file = data_dir / f"{wood_name_ja}_images.json"
    with open(img_file, "w", encoding="utf-8") as f:
        json.dump(images, f, ensure_ascii=False, indent=2)
    print(f"  ✅ {len(images)}件の画像候補を保存: {img_file}")


def load_wood_images(wood_name_ja: str) -> list:
    img_file = (
        Path(__file__).parent.parent / "data" / "woods" / f"{wood_name_ja}_images.json"
    )
    if not img_file.exists():
        return []
    with open(img_file, "r", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方法: python search_images.py <木材名>")
        sys.exit(1)
    wood_name = sys.argv[1]

    from research_wood import load_wood_data

    sys.path.insert(0, str(Path(__file__).parent))
    wood_data = load_wood_data(wood_name)
    images = find_images_for_wood(wood_data)
    print(f"\n=== 画像候補 ({len(images)}件) ===")
    for i, img in enumerate(images, 1):
        print(f"  {i}. {img['title'][:50]}")
        print(f"     ライセンス: {img['license']}")
        print(f"     URL: {img['url'][:80]}")