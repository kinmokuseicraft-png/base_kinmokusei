"""抽選販売フォームのセレクタ調査用スクリプト（使い捨て）"""
import sys, os
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
load_dotenv(BASE_DIR / ".env")
BROWSER_PROFILE_DIR = BASE_DIR / "output" / "browser_profile"
OUTPUT_DIR = BASE_DIR / "output"

LOTTERY_FORM_URL = "https://admin.thebase.com/shop_admin/items/add?itemType=lottery"

with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir=str(BROWSER_PROFILE_DIR),
        headless=False,
        viewport={"width": 1280, "height": 900},
    )
    page = context.new_page()

    email = os.getenv("BASE_EMAIL", "")
    password = os.getenv("BASE_PASSWORD", "")

    # ログイン確認
    page.goto(LOTTERY_FORM_URL)
    try:
        page.wait_for_url("**/items/add*", timeout=8000)
        print("ログイン済み")
    except Exception:
        page.wait_for_selector('input[name="data[User][mail_address]"]', timeout=10000)
        page.fill('input[name="data[User][mail_address]"]', email)
        page.fill('input[name="data[User][password]"]', password)
        page.click('button[type="submit"]')
        page.wait_for_url("**/items/add*", timeout=60000)
        page.goto(LOTTERY_FORM_URL)
        page.wait_for_load_state("networkidle")
        print("ログイン完了")

    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    print(f"フォームURL: {page.url}")

    # すべての input/textarea/select を列挙
    print("\n--- フォームのinput要素 ---")
    for el in page.query_selector_all("input, textarea, select"):
        name = el.get_attribute("name") or ""
        id_ = el.get_attribute("id") or ""
        type_ = el.get_attribute("type") or ""
        placeholder = (el.get_attribute("placeholder") or "").replace("\n", " ")[:40]
        cls = (el.get_attribute("class") or "")[:40]
        print(f"  id='{id_}' name='{name}' type='{type_}' ph='{placeholder}'")

    # 抽選期間関連ラベルを探す
    print("\n--- 抽選期間関連テキスト ---")
    for el in page.query_selector_all("label, th, dt, span, div, p, h3, h4"):
        txt = el.inner_text().strip()
        if any(kw in txt for kw in ["応募", "抽選発表", "受付", "抽選期間"]) and len(txt) < 40:
            el_for = el.get_attribute("for") or ""
            tag = el.evaluate("e => e.tagName")
            print(f"  [{tag}] '{txt}' for='{el_for}'")

    page.screenshot(path=str(OUTPUT_DIR / "lottery_form_detail.png"), full_page=True)
    print("\nlottery_form_detail.png を保存しました")

    context.close()
