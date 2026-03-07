"""
木軸ペン工房 金木犀 - BASE既存出品スクレイパー
------------------------------------------------
BASEの管理画面にある出品済み商品（非公開含む）から
木材データを抽出して data/woods/<木材名>.json に保存する。

【使い方】
  python scripts/scrape_base_items.py

【保存される内容】
  - wood_name, catch_copy, wood_description
  - blog_url, finish, hardware_color, mechanism
  - extra_notes, price, scraped_from_title
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
WOODS_DIR = BASE_DIR / "data" / "woods"
LOG_FILE = BASE_DIR / "output" / "scrape_log.txt"
BROWSER_PROFILE_DIR = BASE_DIR / "output" / "browser_profile"

BASE_NEW_ITEM_URL = "https://admin.thebase.com/shop_admin/items/add"
BASE_ITEMS_URL = "https://admin.thebase.com/shop_admin/items/"

# ペン以外の商品をスキップするキーワード（タイトル・説明文に含まれていれば除外）
NON_PEN_KEYWORDS = [
    "ドッグタグ", "アクセサリー", "キーホルダー", "ブレスレット",
    "ネックレス", "ピアス", "指輪", "バングル", "ストラップ",
]

# ペン商品と判定するキーワード（説明文に含まれていればペンとみなす）
PEN_KEYWORDS = ["ボールペン", "シャープペン", "万年筆", "メカニカル", "ノック式"]


# ─── ユーティリティ ────────────────────────────────────
def log(msg: str):
    print(msg)
    LOG_FILE.parent.mkdir(exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


# ─── ログイン（uploader.py と同じ処理） ────────────────
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


# ─── 商品一覧から編集URLを収集 ────────────────────────
def get_all_edit_urls(page, max_pages: int = 0, start_page: int = 1) -> list[str]:
    """
    商品一覧ページ（全ページ）から各商品の編集URLを収集する。
    BASEの一覧URL例: /shop_admin/items/detail/123456789

    ページネーション戦略:
    1. start_page から開始（前回の続きから再開可能）
    2. ?page=N で次ページを試行（新規URLが0件になるまで継続）
    """
    edit_urls = []
    page_num = start_page

    while True:
        if page_num == 1:
            url = BASE_ITEMS_URL
        else:
            url = f"{BASE_ITEMS_URL}?page={page_num}"

        log(f"\n  ページ {page_num} を取得中: {url}")
        page.goto(url)
        page.wait_for_load_state("networkidle")

        # 1ページ目はデバッグ用スクリーンショット
        if page_num == 1:
            ss_path = str(BASE_DIR / "output" / "items_list.png")
            page.screenshot(path=ss_path)
            log(f"  一覧スクリーンショット: {ss_path}")

        # 商品編集リンクを探す（BASE admin の URL パターン）
        links = page.query_selector_all("a[href]")
        found_on_page = 0
        for link in links:
            href = link.get_attribute("href") or ""
            # /shop_admin/items/detail/数字  または  /shop_admin/items/edit/数字
            if re.search(r"/shop_admin/items/(detail|edit)/\d+", href):
                full_url = (
                    f"https://admin.thebase.com{href}"
                    if href.startswith("/")
                    else href
                )
                if full_url not in edit_urls:
                    edit_urls.append(full_url)
                    found_on_page += 1

        log(f"    このページで {found_on_page} 件取得（累計 {len(edit_urls)} 件）")

        # 新規URLが0件 → 最終ページに達した
        if found_on_page == 0:
            log(f"    新規URL 0件 → ページネーション終了")
            break

        # 上限ページ数チェック
        if max_pages > 0 and page_num >= max_pages:
            log(f"    上限ページ数 ({max_pages}) に達しました")
            break

        page_num += 1

    log(f"\n合計 {len(edit_urls)} 件の商品URLを収集しました。")
    return edit_urls


# ─── 編集ページからデータ取得 ──────────────────────────
def extract_item_data(page, edit_url: str) -> dict:
    """編集ページを開いて商品名・説明文・価格を取得する"""
    page.goto(edit_url)
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


# ─── ペン商品かどうか判定 ──────────────────────────────
def is_pen_item(title: str, description: str) -> bool:
    """
    ドッグタグ・アクセサリー類など非ペン商品を除外する。
    - タイトルに非ペンキーワードが含まれる → False
    - 説明文にペン関連キーワードが含まれる → True
    - どちらにも該当しない場合はペンとみなす（古い形式の出品など）
    """
    for kw in NON_PEN_KEYWORDS:
        if kw in title or kw in description:
            return False
    return True


# ─── タイトルから木材名を抽出（フォールバック用） ─────
def extract_wood_name_from_title(title: str) -> str:
    """
    商品タイトルから木材名を抽出する。
    形式: ※?【catch_copy】 木材名 [加工/仕上げ/受注生産品...]

    例:
      【森の王者】 レッドウッド 浮造り 拭き漆 silver  → レッドウッド
      【カナダの象徴】 ハードメープル 瘤杢 スタビライズドウッド → ハードメープル 瘤杢
      【翡翠の木】 パロサント 受注生産品              → パロサント
    """
    title = title.lstrip("※").strip()
    m = re.search(r"】[\s　]*(.*)", title)
    if not m:
        return ""
    name = m.group(1).strip()

    # 末尾から加工・仕上げ・ペン種別・受注生産を除去（変化がなくなるまで繰り返す）
    suffixes = [
        r"\s+受注生産品?$",
        r"\s+[Bb]lack$",
        r"\s+silver$",
        r"\s+gold$",
        r"\s+si$",
        r"\s+go$",
        r"\s+[Bb][Pp]$",
        r"\s+[Mm][Pp]$",
        r"\s+木象嵌.*$",
        r"\s+拭き漆.*$",
        r"\s+浮造り.*$",
        r"\s+スタビライズドウッド.*$",
        r"\s+干支ペン.*$",
        r"\s+ツートン.*$",
        r"\s+紅白.*$",
        r"\s+特上.*$",
        r"\s+木軸ボールペン.*$",
        r"\s+木軸シャープ.*$",
    ]
    changed = True
    while changed:
        changed = False
        for suffix in suffixes:
            new_name = re.sub(suffix, "", name).strip()
            if new_name != name:
                name = new_name
                changed = True
    return name


# ─── 説明文パース ──────────────────────────────────────
def parse_description(description: str) -> dict:
    """
    description_template.txt の構造に従って説明文を各フィールドに分解する。

    テンプレート構造（抜粋）:
        ◆作品について
        {wood_description}

        【{catch_copy}】{wood_name} について
        詳しく知りたい方はこちらへ
        {blog_url}
        ※こちらは一点物のボールペンになります。
        {extra_notes}
        ◆作品情報
        生地の素材　{wood_name}
        生地仕立て　{finish}
        金具仕立て　{hardware_color}
        メカニカル　{mechanism}
    """
    result: dict = {}

    # ── catch_copy ────────────────────────────────────
    m = re.search(r"【(.+?)】", description)
    if m:
        result["catch_copy"] = m.group(1).strip()

    # ── blog_url ──────────────────────────────────────
    m = re.search(r"詳しく知りたい方はこちらへ\n(https?://\S+)", description)
    if m:
        result["blog_url"] = m.group(1).strip()

    # ── extra_notes ───────────────────────────────────
    # "※こちらは一点物" 〜 "◆作品情報" の間（空の場合もあり）
    m = re.search(
        r"※こちらは一点物のボールペンになります。\n(.*?)◆作品情報",
        description,
        re.DOTALL,
    )
    if m:
        result["extra_notes"] = m.group(1).strip()

    # ── 作品情報フィールド（全角・半角スペース両対応） ──
    for label, key in [
        ("生地の素材", "wood_name"),
        ("生地仕立て", "finish"),
        ("金具仕立て", "hardware_color"),
        ("メカニカル", "mechanism"),
    ]:
        m = re.search(rf"{label}[\u3000\s]+(.+)", description)
        if m:
            result[key] = m.group(1).strip()

    return result


# ─── メイン ────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="処理する商品数の上限（0=全件）")
    parser.add_argument("--pages", type=int, default=0, help="取得する最大ページ数（0=全ページ）")
    parser.add_argument("--start-page", type=int, default=1, help="開始ページ番号（前回の続きから再開する場合に使用）")
    parser.add_argument("--yes", "-y", action="store_true", help="終了時の Enter 待ちをスキップ")
    args = parser.parse_args()

    load_dotenv(BASE_DIR / ".env")
    email = os.getenv("BASE_EMAIL", "")
    password = os.getenv("BASE_PASSWORD", "")

    if not email or not password or "ここに" in email:
        log("エラー: .env にメールアドレスとパスワードを設定してください。")
        sys.exit(1)

    WOODS_DIR.mkdir(parents=True, exist_ok=True)
    log(f"保存先: {WOODS_DIR}")

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

            # 全商品URLを収集
            edit_urls = get_all_edit_urls(page, max_pages=args.pages, start_page=args.start_page)

            if not edit_urls:
                log("商品が見つかりませんでした。")
                log("output/items_list.png を確認してください。")
                sys.exit(1)

            # 各商品を処理
            saved_woods: dict[str, Path] = {}
            skipped_no_desc = 0
            skipped_duplicate = 0

            target_urls = edit_urls[:args.limit] if args.limit > 0 else edit_urls

            for i, url in enumerate(target_urls, 1):
                log(f"\n[{i}/{len(target_urls)}] {url}")

                item = extract_item_data(page, url)

                if not item["description"]:
                    log("  スキップ: 説明文が空です")
                    skipped_no_desc += 1
                    continue

                # ペン以外の商品（ドッグタグ・アクセサリーなど）を除外
                if not is_pen_item(item["title"], item["description"]):
                    log(f"  スキップ: 非ペン商品（タイトル: {item['title'][:30]}）")
                    skipped_no_desc += 1
                    continue

                parsed = parse_description(item["description"])
                wood_name = parsed.get("wood_name", "").strip()

                if not wood_name:
                    # フォールバック: タイトルから木材名を抽出
                    wood_name = extract_wood_name_from_title(item["title"])
                    if wood_name:
                        parsed["wood_name"] = wood_name
                        log(f"  タイトルから wood_name を抽出: {wood_name}")
                    else:
                        log(f"  スキップ: wood_name を抽出できませんでした（タイトル: {item['title'][:30]}）")
                        skipped_no_desc += 1
                        continue

                if wood_name in saved_woods:
                    log(f"  スキップ: {wood_name}（より新しい版を保存済み）")
                    skipped_duplicate += 1
                    continue

                # 全フィールドをマージして保存（説明文全文も base_description として保存）
                wood_data = {
                    **parsed,
                    "base_description": item["description"],
                    "price": item["price"],
                    "scraped_from_title": item["title"],
                }

                # ファイル名として使えない文字を置換
                safe_name = re.sub(r'[\\/:*?"<>|]', "_", wood_name)
                out_path = WOODS_DIR / f"{safe_name}.json"
                out_path.write_text(
                    json.dumps(wood_data, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
                saved_woods[wood_name] = out_path
                log(f"  保存: {out_path.name}")

            # 完了レポート
            log(f"\n{'='*50}")
            log(f"完了！")
            log(f"  保存: {len(saved_woods)} 種")
            log(f"  重複スキップ: {skipped_duplicate} 件")
            log(f"  説明文なし・パース失敗スキップ: {skipped_no_desc} 件")
            log(f"  保存先: {WOODS_DIR}")

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
