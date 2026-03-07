"""
木軸ペン工房 金木犀 - ドッグタグ商品スクレイパー
--------------------------------------------------
BASEの管理画面にある出品済み商品から「ドッグタグ 木象嵌」商品を抽出し、
各作品のデータを data/artworks/<作品名>.json に保存する。

保存される内容:
  - artwork_name: 作品名（木象嵌の後に入る部分）
  - artwork_description: 作品説明文（◆作品について内の作品固有テキスト）
  - wood_name: 木材名
  - wood_variation: 木材バリエーション（紅白・瘤杢など、木材名に含まれないもの）
  - catch_copy: キャッチコピー（説明文の【】内）
  - blog_url: 銘木図鑑記事URL
  - price: 価格
  - scraped_from_title: スクレイプ元タイトル

【使い方】
  python scripts/scrape_dogtag_items.py
  python scripts/scrape_dogtag_items.py --limit 10   # 最初の10件のみ
"""

import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Windows での日本語文字化け対策
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# ─── パス設定 ─────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
ARTWORKS_DIR = BASE_DIR / "data" / "artworks"
LOG_FILE = BASE_DIR / "output" / "scrape_dogtag_log.txt"
BROWSER_PROFILE_DIR = BASE_DIR / "output" / "browser_profile"

BASE_NEW_ITEM_URL = "https://admin.thebase.com/shop_admin/items/add"
BASE_ITEMS_URL = "https://admin.thebase.com/shop_admin/items/"


# ─── ユーティリティ ────────────────────────────────────
def log(msg: str):
    print(msg)
    LOG_FILE.parent.mkdir(exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


# ─── ログイン ────────────────────────────────────────
def wait_for_items_add(page, timeout=300_000) -> bool:
    try:
        page.wait_for_url("https://admin.thebase.com/shop_admin/items/add*", timeout=timeout)
        return True
    except PlaywrightTimeoutError:
        return False


def ensure_logged_in(page, email: str, password: str) -> bool:
    log("ログイン状態を確認中...")
    page.goto(BASE_NEW_ITEM_URL)

    try:
        page.wait_for_url("https://admin.thebase.com/shop_admin/items/add*", timeout=10_000)
        log("ログイン済み（認証コード不要）")
        return True
    except PlaywrightTimeoutError:
        pass

    current = page.url
    log(f"リダイレクト先: {current}")

    if "login" in current and "verify" not in current and "loading" not in current:
        log("メール・パスワードを自動入力中...")
        page.wait_for_selector('input[name="data[User][mail_address]"]')
        page.fill('input[name="data[User][mail_address]"]', email)
        page.fill('input[name="data[User][password]"]', password)
        page.click('button[type="submit"]')
        log("送信完了。リダイレクト待機中...")

        if wait_for_items_add(page, timeout=30_000):
            log("ログイン成功！")
            return True

        current = page.url

    if "verify_two_factor" in current or "login" in current:
        log("\n" + "=" * 50)
        log("【認証コードの入力が必要です】")
        log("ブラウザで認証コードを入力してください。")
        log("入力後、自動で次のステップへ進みます。")
        log("=" * 50)

        if wait_for_items_add(page, timeout=300_000):
            log("認証完了！")
            return True

    log("エラー: ログインに失敗しました。")
    return False


# ─── 商品一覧から象嵌ドッグタグのURLだけ収集 ────────────
def get_dogtag_edit_urls(page, max_pages: int = 0, start_page: int = 1) -> list[dict]:
    """
    一覧ページを巡回し、タイトルに「ドッグタグ」+「象嵌」を含む商品だけを抽出する。
    編集ページへのアクセスは後で行うため、ここではURLとタイトルだけを収集。

    戻り値: [{"url": ..., "title": ...}, ...]
    """
    matched = []
    seen_urls = set()
    page_num = start_page
    total_scanned = 0

    while True:
        url = BASE_ITEMS_URL if page_num == 1 else f"{BASE_ITEMS_URL}?page={page_num}"
        log(f"\n  ページ {page_num} をスキャン中: {url}")
        page.goto(url)
        page.wait_for_load_state("networkidle")

        # 商品リンクとそのテキストを取得
        links = page.query_selector_all("a[href]")
        found_on_page = 0
        matched_on_page = 0

        for link in links:
            href = link.get_attribute("href") or ""
            if not re.search(r"/shop_admin/items/(detail|edit)/\d+", href):
                continue

            full_url = (
                f"https://admin.thebase.com{href}" if href.startswith("/") else href
            )
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)
            found_on_page += 1

            # リンクテキスト（商品名）を取得
            title = (link.inner_text() or "").strip()

            # ドッグタグ+象嵌フィルタ
            if "ドッグタグ" in title and "象嵌" in title:
                matched.append({"url": full_url, "title": title})
                matched_on_page += 1
                log(f"    ✓ {title[:60]}")

        total_scanned += found_on_page
        log(f"    スキャン {found_on_page} 件 / ヒット {matched_on_page} 件（累計ヒット {len(matched)} 件）")

        if found_on_page == 0:
            log("    新規URL 0件 → ページネーション終了")
            break

        if max_pages > 0 and page_num >= max_pages:
            log(f"    上限ページ数 ({max_pages}) に達しました")
            break

        page_num += 1

    log(f"\n全 {total_scanned} 件をスキャン → ドッグタグ象嵌 {len(matched)} 件を抽出しました。")

    # スキャン結果をキャッシュとして保存（中断時の再開用）
    cache_path = LOG_FILE.parent / "dogtag_urls_cache.json"
    cache_path.write_text(json.dumps(matched, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"URLキャッシュを保存: {cache_path}")

    return matched


# ─── 編集ページからデータ取得 ──────────────────────────
def extract_item_data(page, edit_url: str) -> dict:
    """編集ページを開いて商品名・説明文・価格を取得する"""
    try:
        page.goto(edit_url, timeout=30_000)
    except PlaywrightTimeoutError:
        log(f"  警告: ページ読み込みタイムアウト（goto）。リトライします...")
        try:
            page.goto(edit_url, timeout=30_000)
        except PlaywrightTimeoutError:
            log(f"  エラー: リトライも失敗。スキップします。")
            return {"title": "", "description": "", "price": ""}
    try:
        page.wait_for_load_state("networkidle", timeout=15_000)
    except PlaywrightTimeoutError:
        pass

    title = ""
    title_el = page.query_selector("#itemDetail_name")
    if title_el:
        title = title_el.input_value()

    description = ""
    desc_el = page.query_selector('textarea[placeholder*="サイズ"]')
    if desc_el:
        description = desc_el.input_value()

    price = ""
    price_el = page.query_selector("#itemDetail_price")
    if price_el:
        price = price_el.input_value()

    return {"title": title, "description": description, "price": price}


# ─── ドッグタグ商品かどうか判定 ────────────────────────
def is_dogtag_item(title: str) -> bool:
    """タイトルに「ドッグタグ」と「象嵌」（木象嵌 または 象嵌）を両方含むか"""
    return "ドッグタグ" in title and "象嵌" in title


# ─── タイトルから木材名・作品名を抽出 ──────────────────
def parse_dogtag_title(title: str) -> dict:
    """
    ドッグタグ商品のタイトルを解析する。

    タイトル形式:
      【catch_copy】 木材名 [バリエーション] ドッグタグ 木象嵌 作品名
      例:
        【翡翠の木】パロサント ドッグタグ 木象嵌 横を向く上品な猫
        本花梨瘤 紅白 ドッグタグ 木象嵌 木登りトカゲ
        ※【森の王者】 モビンギ ドッグタグ 木象嵌 閾歩

    戻り値:
      {
        "catch_copy": "翡翠の木",        # 【】内（なければ空文字）
        "wood_name": "パロサント",        # 木材名
        "wood_variation": "",            # バリエーション（紅白など）
        "artwork_name": "横を向く上品な猫"  # 作品名
      }
    """
    result = {
        "catch_copy": "",
        "wood_name": "",
        "wood_variation": "",
        "artwork_name": "",
    }

    # catch_copy 抽出
    m = re.search(r"【(.+?)】", title)
    if m:
        result["catch_copy"] = m.group(1).strip()

    # 「木象嵌」または「象嵌」以降が作品名
    m = re.search(r"木?象嵌\s*(.+)$", title)
    if m:
        result["artwork_name"] = m.group(1).strip()

    # 「ドッグタグ」以前（catch_copy・※ を除いた部分）が木材名+バリエーション
    m = re.search(r"(?:】|^)[\s　]*([\s\S]+?)\s*ドッグタグ", title)
    if m:
        wood_part = m.group(1).strip().lstrip("※").strip()

        # バリエーション候補（木材名修飾語）
        variation_patterns = [
            r"\s*(紅白)$",
            r"\s*(瘤杢)$",
            r"\s*(板目)$",
            r"\s*(柾目)$",
            r"\s*(縞杢)$",
            r"\s*(スタビライズドウッド)$",
        ]
        variation = ""
        for pat in variation_patterns:
            vm = re.search(pat, wood_part)
            if vm:
                variation = vm.group(1)
                wood_part = wood_part[:vm.start()].strip()
                break

        result["wood_name"] = wood_part
        result["wood_variation"] = variation

    return result


# ─── 説明文から作品説明を抽出 ──────────────────────────
def parse_dogtag_description(description: str) -> dict:
    """
    ドッグタグ説明文から各フィールドを抽出する。

    説明文構造:
      ◆作品について
      作品名『横を向く上品な猫』
      「画家は猫が好き...」[作品の説明文]

      [木材説明テキスト]

      【翡翠の木】パロサントについて
      詳しく知りたい方はこちらへ
      https://...
      【木象嵌とは？】
      木象嵌（もくぞうがん）は...
    """
    result = {
        "artwork_name_from_desc": "",
        "artwork_description": "",
        "wood_description": "",
        "catch_copy": "",
        "blog_url": "",
        "marquetry_description": "",
    }

    # catch_copy（説明文中の【】から）
    m = re.search(r"【(.+?)】", description)
    if m and m.group(1) != "木象嵌とは？":
        result["catch_copy"] = m.group(1).strip()

    # blog_url
    m = re.search(r"詳しく知りたい方はこちらへ\n(https?://\S+)", description)
    if m:
        result["blog_url"] = m.group(1).strip()

    # ◆作品について セクション
    m_section = re.search(r"◆作品について\n([\s\S]+?)(?=\n\n|\Z)", description)
    if m_section:
        section_text = m_section.group(1).strip()

        # 作品名（『』内）
        mn = re.search(r"作品名[『「](.+?)[』」]", section_text)
        if mn:
            result["artwork_name_from_desc"] = mn.group(1).strip()

        # 作品説明（作品名行の次の行以降）
        lines = section_text.split("\n")
        artwork_lines = []
        found_name_line = False
        for line in lines:
            if re.search(r"作品名[『「]", line):
                found_name_line = True
                continue
            if found_name_line:
                artwork_lines.append(line)
        if artwork_lines:
            result["artwork_description"] = "\n".join(artwork_lines).strip()

    # 木材説明（作品説明の後、【木材名】〜について の前の段落）
    # パターン: 空行の後、【catch_copy】木材名について の前
    m_wood = re.search(
        r"◆作品について\n[\s\S]+?\n\n([\s\S]+?)\n\n【.+?】.+?について",
        description,
    )
    if m_wood:
        result["wood_description"] = m_wood.group(1).strip()

    # 【木象嵌とは？】または【象嵌とは？】セクション
    m_marquetry = re.search(r"【木?象嵌とは？】\n([\s\S]+?)$", description)
    if m_marquetry:
        result["marquetry_description"] = m_marquetry.group(1).strip()

    return result


# ─── メイン ────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="処理する商品数の上限（0=全件）")
    parser.add_argument("--pages", type=int, default=0, help="取得する最大ページ数（0=全ページ）")
    parser.add_argument("--start-page", type=int, default=1, help="開始ページ番号")
    parser.add_argument("--use-cache", action="store_true", help="前回のURLスキャン結果キャッシュを使用（スキャンをスキップ）")
    parser.add_argument("--skip", type=int, default=0, help="先頭N件をスキップして途中から再開")
    parser.add_argument("--yes", "-y", action="store_true", help="終了時の Enter 待ちをスキップ")
    args = parser.parse_args()

    load_dotenv(BASE_DIR / ".env")
    email = os.getenv("BASE_EMAIL", "")
    password = os.getenv("BASE_PASSWORD", "")

    if not email or not password or "ここに" in email:
        log("エラー: .env にメールアドレスとパスワードを設定してください。")
        sys.exit(1)

    ARTWORKS_DIR.mkdir(parents=True, exist_ok=True)
    log(f"保存先: {ARTWORKS_DIR}")

    BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(BROWSER_PROFILE_DIR),
            headless=False,
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        try:
            if not ensure_logged_in(page, email, password):
                sys.exit(1)

            # URLスキャン（キャッシュ使用オプション）
            cache_path = LOG_FILE.parent / "dogtag_urls_cache.json"
            if args.use_cache and cache_path.exists():
                log(f"キャッシュからURLを読み込みます: {cache_path}")
                dogtag_items = json.loads(cache_path.read_text(encoding="utf-8"))
                log(f"キャッシュから {len(dogtag_items)} 件を読み込みました。")
            else:
                dogtag_items = get_dogtag_edit_urls(page, max_pages=args.pages, start_page=args.start_page)

            if not dogtag_items:
                log("ドッグタグ象嵌商品が見つかりませんでした。")
                sys.exit(1)

            # --skip で途中再開
            if args.skip > 0:
                log(f"先頭 {args.skip} 件をスキップして再開します。")
                dogtag_items = dogtag_items[args.skip:]

            target_items = dogtag_items[:args.limit] if args.limit > 0 else dogtag_items
            log(f"\n{len(target_items)} 件の編集ページを取得します。")

            # 各商品の詳細データを取得・保存
            saved: dict[str, Path] = {}  # artwork_name -> path
            skipped_no_artwork = 0
            skipped_duplicate = 0

            for i, item_info in enumerate(target_items, 1):
                url = item_info["url"]
                pre_title = item_info["title"]
                log(f"\n[{i}/{len(target_items)}] {pre_title[:60]}")
                log(f"  URL: {url}")

                item = extract_item_data(page, url)

                # 一覧タイトルが空白や短縮されている場合は編集ページのタイトルを使用
                if not item["title"]:
                    item["title"] = pre_title

                log(f"  対象: {item['title']}")

                title_data = parse_dogtag_title(item["title"])
                artwork_name = title_data["artwork_name"]

                if not artwork_name:
                    log(f"  スキップ: 作品名を抽出できませんでした")
                    skipped_no_artwork += 1
                    continue

                # 重複チェック（同作品名が既に保存済み）
                if artwork_name in saved:
                    log(f"  重複スキップ: 『{artwork_name}』（{title_data['wood_name']}版は別途記録）")
                    # 重複でも木材バリエーションを既存ファイルに追記する
                    existing_path = saved[artwork_name]
                    try:
                        existing = json.loads(existing_path.read_text(encoding="utf-8"))
                        if "variants" not in existing:
                            existing["variants"] = []
                        variant = {
                            "wood_name": title_data["wood_name"],
                            "wood_variation": title_data["wood_variation"],
                            "price": item["price"],
                            "scraped_from_title": item["title"],
                        }
                        # 重複しない場合のみ追加
                        if variant not in existing["variants"]:
                            existing["variants"].append(variant)
                            existing_path.write_text(
                                json.dumps(existing, ensure_ascii=False, indent=2),
                                encoding="utf-8",
                            )
                            log(f"  → 既存ファイルに {title_data['wood_name']} バリアントを追記")
                    except Exception as e:
                        log(f"  → 追記失敗: {e}")
                    skipped_duplicate += 1
                    continue

                # 説明文から作品説明を抽出
                desc_data = parse_dogtag_description(item["description"])

                # 説明文からの作品名が違う場合は警告（念のため確認）
                if (desc_data["artwork_name_from_desc"]
                        and desc_data["artwork_name_from_desc"] != artwork_name):
                    log(f"  注意: タイトル作品名「{artwork_name}」≠ 説明文作品名「{desc_data['artwork_name_from_desc']}」")
                    # 説明文の作品名を優先
                    artwork_name = desc_data["artwork_name_from_desc"]

                # キャッチコピーはタイトル→説明文の順で優先
                catch_copy = title_data["catch_copy"] or desc_data["catch_copy"]

                # 保存データを構築
                artwork_data = {
                    "artwork_name": artwork_name,
                    "artwork_description": desc_data["artwork_description"],
                    "wood_name": title_data["wood_name"],
                    "wood_variation": title_data["wood_variation"],
                    "catch_copy": catch_copy,
                    "blog_url": desc_data["blog_url"],
                    "price": item["price"],
                    "scraped_from_title": item["title"],
                    "variants": [
                        {
                            "wood_name": title_data["wood_name"],
                            "wood_variation": title_data["wood_variation"],
                            "price": item["price"],
                            "scraped_from_title": item["title"],
                        }
                    ],
                }

                # ファイル名として使えない文字を置換
                safe_name = re.sub(r'[\\/:*?"<>|]', "_", artwork_name)
                out_path = ARTWORKS_DIR / f"{safe_name}.json"
                out_path.write_text(
                    json.dumps(artwork_data, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
                saved[artwork_name] = out_path
                log(f"  保存: {out_path.name} （{title_data['wood_name']}）")

            # 完了レポート
            log(f"\n{'='*50}")
            log(f"完了！")
            log(f"  保存: {len(saved)} 作品")
            log(f"  重複バリアント追記: {skipped_duplicate} 件")
            log(f"  作品名取得失敗スキップ: {skipped_no_artwork} 件")
            log(f"  保存先: {ARTWORKS_DIR}")

            # サマリー表示
            if saved:
                log(f"\n保存した作品一覧:")
                for artwork, path in sorted(saved.items()):
                    data = json.loads(path.read_text(encoding="utf-8"))
                    variants = data.get("variants", [])
                    wood_names = [v["wood_name"] + (f" {v['wood_variation']}" if v['wood_variation'] else "") for v in variants]
                    log(f"  『{artwork}』← {', '.join(wood_names)}")

        except KeyboardInterrupt:
            log("中断されました。")
        finally:
            if not args.yes:
                try:
                    input("\n終了するには Enter を押してください...")
                except EOFError:
                    pass
            context.close()


if __name__ == "__main__":
    main()
