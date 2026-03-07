"""
銘木図鑑 - WordPress投稿スクリプト
WordPress REST API を使って記事をドラフト投稿します。
事前に WordPress の「アプリケーションパスワード」を .env に設定してください。
"""
import base64
import json
import os
import sys
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


class WordPressPublisher:
    def __init__(self):
        self.wp_url = os.getenv("WP_URL", "https://kinmokuseijp.blog").rstrip("/")
        self.username = os.getenv("WP_USERNAME", "")
        self.app_password = os.getenv("WP_APP_PASSWORD", "")
        self.api_base = f"{self.wp_url}/wp-json/wp/v2"

        if not self.username or not self.app_password or self.app_password == "xxxx xxxx xxxx xxxx xxxx xxxx":
            print("❌ WordPress認証情報が .env に設定されていません")
            print("   WordPress管理画面 > ユーザー > プロフィール > アプリケーションパスワード")
            print("   で生成したパスワードを WP_USERNAME, WP_APP_PASSWORD に設定してください")
            sys.exit(1)

        creds = f"{self.username}:{self.app_password}"
        self.auth_header = base64.b64encode(creds.encode()).decode()
        self.headers = {
            "Authorization": f"Basic {self.auth_header}",
            "Content-Type": "application/json",
        }

    def test_connection(self) -> bool:
        """WordPress接続テスト"""
        resp = requests.get(f"{self.api_base}/users/me", headers=self.headers, timeout=10)
        if resp.status_code == 200:
            user = resp.json()
            print(f"✅ WordPress接続OK: {user.get('name', '')} ({self.wp_url})")
            return True
        else:
            print(f"❌ WordPress接続失敗: HTTP {resp.status_code}")
            print(f"   {resp.text[:200]}")
            return False

    def get_category_id(self, category_name: str) -> int | None:
        """カテゴリー名からIDを取得"""
        resp = requests.get(
            f"{self.api_base}/categories",
            params={"search": category_name, "per_page": 20},
            headers=self.headers,
            timeout=10,
        )
        for cat in resp.json():
            if cat["name"] == category_name:
                return cat["id"]
        return None

    def get_or_create_tag(self, tag_name: str) -> int:
        """タグIDを取得（なければ作成）"""
        resp = requests.get(
            f"{self.api_base}/tags",
            params={"search": tag_name, "per_page": 10},
            headers=self.headers,
            timeout=10,
        )
        for tag in resp.json():
            if tag["name"] == tag_name:
                return tag["id"]
        # 新規作成
        create_resp = requests.post(
            f"{self.api_base}/tags",
            headers=self.headers,
            json={"name": tag_name},
            timeout=10,
        )
        return create_resp.json().get("id")

    def upload_image_from_url(self, image_url: str, filename: str, alt_text: str = "") -> dict | None:
        """URLから画像をWordPressにアップロード"""
        import urllib.request
        import tempfile
        import mimetypes

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                urllib.request.urlretrieve(image_url, tmp.name)
                tmp_path = tmp.name

            mime, _ = mimetypes.guess_type(filename)
            mime = mime or "image/jpeg"
            upload_headers = {
                "Authorization": f"Basic {self.auth_header}",
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": mime,
            }
            with open(tmp_path, "rb") as f:
                resp = requests.post(
                    f"{self.api_base}/media",
                    headers=upload_headers,
                    data=f,
                    timeout=30,
                )
            os.unlink(tmp_path)

            if resp.status_code in (200, 201):
                media = resp.json()
                # alt テキストを設定
                if alt_text:
                    requests.post(
                        f"{self.api_base}/media/{media['id']}",
                        headers=self.headers,
                        json={"alt_text": alt_text},
                        timeout=10,
                    )
                return media
        except Exception as e:
            print(f"  ⚠️ 画像アップロードエラー: {e}")
        return None

    def create_post(
        self,
        title: str,
        content: str,
        slug: str,
        category_ids: list,
        tag_ids: list,
        excerpt: str = "",
        featured_media_id: int = None,
        status: str = "draft",
    ) -> dict:
        """WordPress記事を作成"""
        data = {
            "title": title,
            "content": content,
            "slug": slug,
            "status": status,
            "categories": category_ids,
            "tags": tag_ids,
            "excerpt": excerpt,
        }
        if featured_media_id:
            data["featured_media"] = featured_media_id

        resp = requests.post(
            f"{self.api_base}/posts",
            headers=self.headers,
            json=data,
            timeout=30,
        )
        return resp.json()


def publish_wood_article(
    wood_data: dict,
    html_content: str,
    images: list = None,
    status: str = "draft",
) -> dict:
    """木材記事を WordPress に投稿"""
    publisher = WordPressPublisher()

    if not publisher.test_connection():
        sys.exit(1)

    # カテゴリー: 銘木図鑑
    meiboku_cat_id = publisher.get_category_id("銘木図鑑")
    if not meiboku_cat_id:
        print("⚠️  '銘木図鑑' カテゴリーが見つかりません。カテゴリーなしで投稿します。")
        category_ids = []
    else:
        category_ids = [meiboku_cat_id]

    # タグ
    tags_to_create = [
        wood_data.get("wood_name_ja", ""),
        wood_data.get("scientific_name", "").split()[0] if wood_data.get("scientific_name") else "",
        wood_data.get("wood_name_en", ""),
    ]
    tag_ids = []
    for tag in tags_to_create:
        if tag:
            tag_id = publisher.get_or_create_tag(tag)
            if tag_id:
                tag_ids.append(tag_id)

    # アイキャッチ画像のアップロード
    featured_media_id = None
    if images:
        print(f"  📤 アイキャッチ画像をアップロード中...")
        img = images[0]
        wood_name_ja = wood_data.get("wood_name_ja", "wood")
        media = publisher.upload_image_from_url(
            img["url"],
            f"{wood_name_ja}_main.jpg",
            alt_text=f"{wood_name_ja}（{wood_data.get('scientific_name', '')}）の木材",
        )
        if media:
            featured_media_id = media["id"]
            print(f"  ✅ 画像アップロード完了 (ID: {featured_media_id})")

    # 記事タイトル
    name = wood_data.get("wood_name_ja", "")
    reading = wood_data.get("wood_name_reading", "")
    title = f"{name}（{reading}）｜銘木図鑑"
    slug = wood_data.get("slug", name)
    excerpt = wood_data.get("seo_description", "")

    print(f"  📝 記事を投稿中: '{title}' [{status}]")
    result = publisher.create_post(
        title=title,
        content=html_content,
        slug=slug,
        category_ids=category_ids,
        tag_ids=tag_ids,
        excerpt=excerpt,
        featured_media_id=featured_media_id,
        status=status,
    )

    if "id" in result:
        post_url = result.get("link", "")
        print(f"✅ 投稿完了!")
        print(f"   記事ID: {result['id']}")
        print(f"   URL: {post_url}")
        print(f"   ステータス: {result.get('status', status)}")
    else:
        print(f"❌ 投稿エラー: {json.dumps(result, ensure_ascii=False)[:300]}")

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方法: python publish_to_wp.py <木材名> [--publish]")
        print("  --publish を付けると公開、なしはドラフト")
        sys.exit(1)

    wood_name = sys.argv[1]
    status = "publish" if "--publish" in sys.argv else "draft"

    sys.path.insert(0, str(Path(__file__).parent))
    from research_wood import load_wood_data
    from search_images import load_wood_images
    from generate_article import generate_article

    wood_data = load_wood_data(wood_name)
    images = load_wood_images(wood_data.get("wood_name_ja", wood_name))
    html_content = generate_article(wood_data, images)

    publish_wood_article(wood_data, html_content, images, status=status)
