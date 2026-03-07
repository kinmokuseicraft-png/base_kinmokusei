"""
木軸ペン工房 金木犀 - WordPress記事投稿スクリプト
----------------------------------------------
【使い方】

  # 接続テスト
  python scripts/wp_post.py --test

  # サンプル記事をドラフト投稿（動作確認用）
  python scripts/wp_post.py --sample

  # 木材記事を投稿（フルパイプライン）
  python scripts/wp_post.py パロサント
  python scripts/wp_post.py パロサント --publish          # 下書きでなく公開
  python scripts/wp_post.py パロサント --skip-research    # 既存JSONを再利用
  python scripts/wp_post.py パロサント --skip-images      # 画像検索をスキップ

【.env に必要な設定】
  WP_URL=https://kinmokuseijp.blog
  WP_USERNAME=（WordPressのユーザー名）
  WP_APP_PASSWORD=（アプリケーションパスワード: xxxx xxxx xxxx xxxx xxxx xxxx 形式）

  ※ アプリケーションパスワードの取得:
     WordPress管理画面 > ユーザー > プロフィール
     → 下部「アプリケーションパスワード」セクション
     → 名前: "Claude Code" などで「追加」
     → 表示された xxxx xxxx xxxx xxxx xxxx xxxx をコピー
"""

import sys
import json
import argparse
import os
from pathlib import Path
from datetime import datetime

# Windows での日本語文字化け対策
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")


def check_credentials() -> tuple[str, str, str]:
    """認証情報を確認し、未設定なら案内して終了"""
    wp_url = os.getenv("WP_URL", "").rstrip("/")
    username = os.getenv("WP_USERNAME", "")
    app_password = os.getenv("WP_APP_PASSWORD", "")

    missing = []
    if not wp_url or "kinmokusei" not in wp_url:
        missing.append("WP_URL")
    if not username or "your_wp" in username:
        missing.append("WP_USERNAME")
    if not app_password or "xxxx" in app_password:
        missing.append("WP_APP_PASSWORD")

    if missing:
        print("❌ .env に以下の項目が設定されていません:")
        for m in missing:
            print(f"   {m}")
        print()
        print("【取得手順】")
        print("  1. https://kinmokuseijp.blog/wp-admin/ にログイン")
        print("  2. ユーザー > プロフィール を開く")
        print("  3. 一番下の「アプリケーションパスワード」セクションへ")
        print("  4. 名前: 'Claude Code' で「追加」ボタンをクリック")
        print("  5. 表示された xxxx xxxx xxxx xxxx xxxx xxxx を .env に貼り付け")
        print()
        print("  .env の記載例:")
        print("    WP_USERNAME=tsuba  （またはあなたのWPユーザー名）")
        print("    WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx")
        sys.exit(1)

    return wp_url, username, app_password


def test_connection(wp_url: str, username: str, app_password: str) -> bool:
    """WordPress REST API への接続テスト"""
    import base64
    import requests

    creds = f"{username}:{app_password}"
    auth = base64.b64encode(creds.encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    }

    print(f"接続テスト: {wp_url}/wp-json/wp/v2/users/me")
    try:
        resp = requests.get(
            f"{wp_url}/wp-json/wp/v2/users/me",
            headers=headers,
            timeout=15,
        )
    except Exception as e:
        print(f"❌ 接続エラー: {e}")
        return False

    if resp.status_code == 200:
        user = resp.json()
        print(f"✅ 接続成功!")
        print(f"   ユーザー名: {user.get('name', '')}")
        print(f"   メール: {user.get('email', '非公開')}")
        print(f"   権限: {', '.join(user.get('roles', []))}")
        return True
    elif resp.status_code == 401:
        print(f"❌ 認証失敗 (HTTP 401)")
        print(f"   WP_USERNAME または WP_APP_PASSWORD が正しくありません。")
        print(f"   ユーザー名は「メールアドレス」ではなく「ユーザー名（ログインID）」を使ってください。")
        return False
    else:
        print(f"❌ エラー: HTTP {resp.status_code}")
        print(f"   {resp.text[:300]}")
        return False


def get_category_id(api_base: str, headers: dict, name: str) -> int | None:
    """カテゴリーIDを取得"""
    import requests
    resp = requests.get(
        f"{api_base}/categories",
        params={"search": name, "per_page": 20},
        headers=headers,
        timeout=10,
    )
    for cat in resp.json():
        if cat["name"] == name:
            return cat["id"]
    return None


def create_post(
    api_base: str,
    headers: dict,
    title: str,
    content: str,
    slug: str = "",
    excerpt: str = "",
    category_ids: list = None,
    tag_ids: list = None,
    status: str = "draft",
    featured_media_id: int = None,
) -> dict:
    """WordPress記事を作成"""
    import requests
    data = {
        "title": title,
        "content": content,
        "status": status,
        "categories": category_ids or [],
        "tags": tag_ids or [],
    }
    if slug:
        data["slug"] = slug
    if excerpt:
        data["excerpt"] = excerpt
    if featured_media_id:
        data["featured_media"] = featured_media_id

    resp = requests.post(f"{api_base}/posts", headers=headers, json=data, timeout=30)
    return resp.json()


def post_sample_article(api_base: str, headers: dict, status: str = "draft") -> dict:
    """動作確認用のサンプル記事を投稿"""

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    title = f"【テスト】サンプル記事 {now}"

    content = """<!-- wp:paragraph -->
<p>これは <strong>wp_post.py</strong> からの投稿テストです。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>WordPress REST API を使って自動投稿できることを確認しています。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2} -->
<h2>金木犀について</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>木軸ペン工房「金木犀」は、銘木を使った一点物の木軸ペンを制作しています。</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul>
<li>一本一本が異なる木目を持つ唯一無二の作品</li>
<li>厳選した銘木を使用</li>
<li>職人による手仕上げ</li>
</ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p><em>このサンプル記事は確認後に削除してください。</em></p>
<!-- /wp:paragraph -->"""

    print(f"  タイトル: {title}")
    print(f"  ステータス: {status}")

    result = create_post(
        api_base=api_base,
        headers=headers,
        title=title,
        content=content,
        status=status,
    )

    return result


def post_wood_article(
    wood_name: str,
    api_base: str,
    headers: dict,
    skip_research: bool = False,
    skip_images: bool = False,
    status: str = "draft",
) -> dict:
    """木材記事をフルパイプラインで投稿"""
    from research_wood import research_wood, load_wood_data
    from search_images import load_wood_images
    from generate_article import generate_article

    data_file = BASE_DIR / "data" / "woods" / f"{wood_name}.json"

    # STEP 1: リサーチ
    if not skip_research or not data_file.exists():
        print("📚 木材情報をリサーチ中... (Claude API)")
        wood_data = research_wood(wood_name)
    else:
        print("📚 既存データを使用")
        wood_data = load_wood_data(wood_name)

    wood_name_ja = wood_data.get("wood_name_ja", wood_name)
    print(f"   {wood_name_ja} / {wood_data.get('scientific_name', '')}")

    # STEP 2: 画像（Gemini生成 or Wikimedia検索）
    images = []
    if not skip_images:
        print("🖼  画像を収集中...")
        from search_images import find_images_for_wood
        images = find_images_for_wood(wood_data, limit=4)
        print(f"   {len(images)} 枚取得")

    # STEP 3: 画像をWordPressにアップロード（HTML生成の前に行う）
    import requests, tempfile, urllib.request
    featured_media_id = None
    if images:
        print(f"  📤 画像をWordPressにアップロード中... ({len(images)}枚)")
        for idx, img in enumerate(images):
            try:
                fname = f"wood_{idx+1:02d}.jpg"
                local_path = img.get("local_path", "")
                if local_path and os.path.exists(local_path):
                    with open(local_path, "rb") as f:
                        img_data = f.read()
                elif img.get("url"):
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                        urllib.request.urlretrieve(img["url"], tmp.name)
                        tmp_path = tmp.name
                    with open(tmp_path, "rb") as f:
                        img_data = f.read()
                    os.unlink(tmp_path)
                else:
                    continue

                upload_headers = {
                    "Authorization": headers["Authorization"],
                    "Content-Disposition": f'attachment; filename="{fname}"',
                    "Content-Type": "image/jpeg",
                }
                media_resp = requests.post(
                    f"{api_base}/media",
                    headers=upload_headers,
                    data=img_data,
                    timeout=60,
                )
                if media_resp.status_code in (200, 201):
                    media_id = media_resp.json().get("id")
                    # WP URLをimagesリストに書き戻す（この後のHTML生成で使用）
                    images[idx]["url"] = media_resp.json().get("source_url", "")
                    if idx == 0:
                        featured_media_id = media_id
                    src = img.get("source", "")
                    print(f"  ✅ [{idx+1}] アップロード完了 (ID:{media_id}) [{src}]")
                else:
                    print(f"  ⚠  [{idx+1}] アップロード失敗: HTTP {media_resp.status_code}")
            except Exception as e:
                print(f"  ⚠  [{idx+1}] 画像アップロードエラー: {e}")

    # STEP 4: HTML 生成（WP URLが確定した後）
    print("📝 記事HTMLを生成中...")
    html_content = generate_article(wood_data, images)

    # STEP 5: 投稿
    meiboku_cat_id = get_category_id(api_base, headers, "銘木図鑑")
    category_ids = [meiboku_cat_id] if meiboku_cat_id else []

    from generate_article import generate_post_title
    title = generate_post_title(wood_data)
    slug = wood_data.get("slug", wood_name_ja)
    excerpt = wood_data.get("seo_description", "")

    print(f"📤 投稿中: '{title}' [{status}]")
    result = create_post(
        api_base=api_base,
        headers=headers,
        title=title,
        content=html_content,
        slug=slug,
        excerpt=excerpt,
        category_ids=category_ids,
        status=status,
        featured_media_id=featured_media_id,
    )
    return result


def main():
    parser = argparse.ArgumentParser(
        description="WordPress記事投稿スクリプト",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("wood_name", nargs="?", help="木材名（例: パロサント）")
    parser.add_argument("--test", action="store_true", help="接続テストのみ")
    parser.add_argument("--sample", action="store_true", help="サンプル記事をドラフト投稿")
    parser.add_argument("--publish", action="store_true", help="下書きでなく公開")
    parser.add_argument("--skip-research", action="store_true", help="既存JSONを再利用（Claude API呼び出しなし）")
    parser.add_argument("--skip-images", action="store_true", help="画像検索をスキップ")
    args = parser.parse_args()

    if not args.test and not args.sample and not args.wood_name:
        parser.print_help()
        sys.exit(0)

    # 認証情報を確認
    wp_url, username, app_password = check_credentials()

    import base64
    creds = f"{username}:{app_password}"
    auth = base64.b64encode(creds.encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    }
    api_base = f"{wp_url}/wp-json/wp/v2"

    # ── 接続テスト ────────────────────────────────────────────
    if args.test:
        test_connection(wp_url, username, app_password)
        return

    # 接続確認（全モード共通）
    if not test_connection(wp_url, username, app_password):
        sys.exit(1)
    print()

    status = "publish" if args.publish else "draft"

    # ── サンプル記事モード ────────────────────────────────────
    if args.sample:
        print("📝 サンプル記事を投稿中...")
        result = post_sample_article(api_base, headers, status=status)

    # ── 木材記事モード ────────────────────────────────────────
    elif args.wood_name:
        print(f"📚 木材記事パイプライン: {args.wood_name}\n")
        result = post_wood_article(
            wood_name=args.wood_name,
            api_base=api_base,
            headers=headers,
            skip_research=args.skip_research,
            skip_images=args.skip_images,
            status=status,
        )

    # ── 結果表示 ──────────────────────────────────────────────
    if "id" in result:
        admin_url = f"{wp_url}/wp-admin/post.php?post={result['id']}&action=edit"
        print(f"\n✅ 投稿完了!")
        print(f"   記事ID: {result['id']}")
        print(f"   状態:   {result.get('status', status)}")
        print(f"   管理画面: {admin_url}")
        if result.get("link"):
            print(f"   URL:    {result['link']}")
    else:
        print(f"\n❌ 投稿エラー:")
        print(json.dumps(result, ensure_ascii=False, indent=2)[:500])
        sys.exit(1)


if __name__ == "__main__":
    main()
