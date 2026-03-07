"""
BASE テーマHTMLエディタにテンプレートを貼り付けて保存し、
プレビューモードでスマホ・PCの表示を確認するスクリプト。

使い方:
    python scripts/apply_template.py
"""

import sys, os, time
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv()
EMAIL    = os.environ["BASE_EMAIL"]
PASSWORD = os.environ["BASE_PASSWORD"]

BASE_DIR            = Path(__file__).parent.parent
TEMPLATE_FILE       = BASE_DIR / "templates" / "base_template.html"
BROWSER_PROFILE_DIR = BASE_DIR / "output" / "browser_profile"
OUT_DIR             = BASE_DIR / "output"

THEMES_URL = "https://admin.thebase.com/apps/107/themes"
TARGET_THEME = "クロード編集用"


def log(msg: str):
    print(msg)


def ss(page, name: str):
    path = str(OUT_DIR / f"{name}.png")
    page.screenshot(path=path, full_page=False)
    log(f"  [SS] {name}.png")


def ensure_logged_in(page) -> bool:
    log("ログイン確認中...")
    page.goto(THEMES_URL)
    try:
        page.wait_for_url("**/apps/107/themes**", timeout=12_000)
        log("ログイン済み")
        return True
    except PWTimeout:
        pass

    current = page.url
    if "login" in current:
        log("自動ログイン中...")
        page.wait_for_selector('input[name="data[User][mail_address]"]', timeout=10_000)
        page.fill('input[name="data[User][mail_address]"]', EMAIL)
        page.fill('input[name="data[User][password]"]', PASSWORD)
        page.click('button[type="submit"]')
        try:
            page.wait_for_url("**/shop_admin/**", timeout=30_000)
            page.goto(THEMES_URL)
            page.wait_for_url("**/apps/107/themes**", timeout=10_000)
            return True
        except PWTimeout:
            pass

    if "verify" in page.url or "login" in page.url:
        print("\n" + "="*50)
        print("【2FA認証コードをブラウザで入力してください】")
        print("="*50)
        try:
            page.wait_for_url("**/shop_admin/**", timeout=300_000)
            page.goto(THEMES_URL)
            page.wait_for_url("**/apps/107/themes**", timeout=10_000)
            return True
        except PWTimeout:
            pass

    log("ログイン失敗")
    return False


def click_editor_button(page) -> str | None:
    """
    テーマ一覧から「クロード編集用」行の </>（エディタ）ボタンをクリックし、
    遷移後のURLを返す。React SPA なので button 要素を座標で特定してクリック。
    """
    log(f"テーマ一覧ロード中: {THEMES_URL}")
    page.goto(THEMES_URL)
    page.wait_for_load_state("domcontentloaded", timeout=20_000)
    time.sleep(2.5)   # React レンダリング待機
    ss(page, "themes_list")

    # 「クロード編集用」テキストと同じ行の右端ボタン（エディタ）の座標を取得
    pos = page.evaluate(f"""() => {{
        // テーマ名テキストを含む要素の Y 座標を取得
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let themeY = null;
        let node;
        while ((node = walker.nextNode())) {{
            if (node.textContent.trim() === '{TARGET_THEME}') {{
                const r = node.parentElement.getBoundingClientRect();
                themeY = (r.top + r.bottom) / 2;
                break;
            }}
        }}
        if (themeY === null) return null;

        // 同じ行（Y が ±60px 以内）のボタンを集めて右端を選ぶ
        const btns = Array.from(document.querySelectorAll('button'));
        const row = btns.filter(b => {{
            const r = b.getBoundingClientRect();
            return r.width > 0 && Math.abs((r.top + r.bottom) / 2 - themeY) < 60;
        }});
        if (!row.length) return {{ themeY, btnCount: btns.length, found: false }};

        row.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
        const r = row[0].getBoundingClientRect();
        return {{ x: r.left + r.width / 2, y: r.top + r.height / 2, found: true }};
    }}""")

    log(f"ボタン検索結果: {pos}")

    if not pos or not pos.get("found"):
        log("エディタボタンの座標が取得できません")
        ss(page, "editor_btn_notfound")
        return None

    log(f"エディタボタンをクリック: ({pos['x']:.0f}, {pos['y']:.0f})")
    # ポップアップ・新タブ対応
    with page.expect_popup(timeout=8_000) as popup_info:
        page.mouse.click(pos["x"], pos["y"])
    new_page = popup_info.value
    new_page.wait_for_load_state("domcontentloaded", timeout=20_000)
    time.sleep(2)
    ss(new_page, "html_editor")
    log(f"HTML編集ページ: {new_page.url}")
    # 以降の操作を new_page で行うためにページ参照を差し替え
    page._editor_page = new_page
    return new_page.url


def set_editor_content(page, html_content: str) -> bool:
    """
    BASE HTML編集ページ（developers.thebase.com の Monaco エディタ）に
    内容をセットして保存する。
    Monaco は window.monaco が未定義のため hidden textarea 経由で操作する。
    """
    log(f"エディタページ: {page.url}")

    # Monaco の hidden textarea を探す
    # Monaco は .monaco-editor 内に <textarea> を持つ（input handler）
    hidden_ta = page.locator(".monaco-editor textarea").first
    if hidden_ta.count() == 0:
        # フォールバック: 通常の textarea
        hidden_ta = page.locator("textarea").first
        if hidden_ta.count() == 0:
            log("textarea が見つかりません")
            ss(page, "editor_notfound")
            return False
        log("通常 textarea を使用")
    else:
        log("Monaco hidden textarea を使用")

    # クリップボード経由で内容を貼り付け（Monaco に fill は効かないことがある）
    # 1. Monaco エディタエリアをクリックしてフォーカス
    page.locator(".monaco-editor").first.click()
    time.sleep(0.3)

    # 2. Ctrl+A で全選択
    page.keyboard.press("Control+a")
    time.sleep(0.2)

    # 3. クリップボードにセットして Ctrl+V で貼り付け
    #    Playwright の evaluate で clipboardData を設定
    page.evaluate("""(text) => {
        return navigator.clipboard.writeText(text);
    }""", html_content)
    time.sleep(0.3)
    page.keyboard.press("Control+v")
    time.sleep(1.5)  # 大量テキストの貼り付け待機

    # 内容確認（Monaco の現在の行数を取得）
    lines = page.evaluate("""() => {
        const ta = document.querySelector('.monaco-editor textarea');
        if (!ta) return -1;
        // Monaco の model から行数を取得（window._monacoEditorInstances などを試す）
        const editors = document.querySelectorAll('.monaco-editor');
        return editors.length;
    }""")
    log(f"Monaco エディタ数: {lines}")

    ss(page, "before_save")

    # ── ステップ1: 右上の「保存する」ボタンをクリック ──
    try:
        save_btn = page.locator("button:has-text('保存する')").first
        save_btn.click(timeout=5000)
        log("保存ボタンをクリック")
    except Exception as e:
        log(f"保存ボタンエラー: {e}")
        ss(page, "save_error")
        return False

    time.sleep(1)
    ss(page, "after_click_save")

    # ── ステップ2: 確認ダイアログ「保存する」ボタンを探してクリック ──
    try:
        # ダイアログ内の最後の「保存する」（やめる / 保存する の保存する側）
        confirm_btn = page.locator("button:has-text('保存する')").last
        if confirm_btn.is_visible(timeout=3000):
            log("確認ダイアログ → 保存する をクリック")
            confirm_btn.click()
            time.sleep(2)
    except Exception:
        log("確認ダイアログなし（直接保存されたかも）")

    ss(page, "after_save")
    log(f"保存後URL: {page.url}")
    return True


def scroll_and_shot(page, name: str, y: int, frame=None):
    """指定 y 位置にスクロールしてスクリーンショット。frame指定時はiframe内をスクロール。"""
    target = frame if frame else page
    target.evaluate("window.scrollTo(0, 0)")
    time.sleep(0.3)
    if y > 0:
        target.evaluate(f"window.scrollTo(0, {y})")
        time.sleep(1.0)
    time.sleep(0.8)
    ss(page, name)


def element_shot(frame, page, name: str, selector: str, offset_y: int = 0):
    """iframe内の要素までスクロールし、ページ全体でスクリーンショット。"""
    try:
        el = frame.locator(selector).first
        el.scroll_into_view_if_needed(timeout=8000)
        if offset_y:
            frame.evaluate(f"window.scrollBy(0, {offset_y})")
            time.sleep(0.5)
        time.sleep(1.5)
        ss(page, name)
    except Exception as e:
        log(f"  element_shot fallback ({selector}): {e}")
        ss(page, name)


def get_shop_context(page):
    """
    プレビューページがiframeを使っている場合はそのフレームを返す。
    フレームが見つからない場合はページ本体を返す。
    """
    time.sleep(1.5)  # JS injection 待機
    frames = page.frames
    for f in frames:
        if f == page.main_frame:
            continue
        url = f.url
        if url and ('thebase' in url or 'kinmokusei' in url or url.startswith('http')):
            log(f"  iframeフレーム検出: {url}")
            return f
    return page


def check_preview(page, editor_url: str):
    """
    プレビューモードでスマホ・PC両方を複数スクロール位置で確認する。
    """
    log("\n===== プレビュー確認 =====")

    import re
    m = re.search(r'/themes/edit/(\d+)', editor_url)
    if m:
        theme_id = m.group(1)
        preview_url = f"https://developers.thebase.com/themes/preview/{theme_id}"
    else:
        preview_url = editor_url.replace("/edit/", "/preview/")
    log(f"プレビューURL: {preview_url}")

    # ── スマホ（390×844）──
    log("スマホ表示を確認中...")
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(preview_url)
    page.wait_for_load_state("networkidle", timeout=20_000)
    time.sleep(3.0)
    ctx = get_shop_context(page)

    scroll_and_shot(page, "sp_01_top",   0,   frame=ctx)
    element_shot(ctx, page, "sp_02_brand1", ".km-bp--dark")
    element_shot(ctx, page, "sp_03_brand2", ".km-bp--light")
    element_shot(ctx, page, "sp_04_brand3", ".km-bp--amber")
    element_shot(ctx, page, "sp_05_items",  "#itemIndex", offset_y=200)

    # ── PC（1280×900）──
    log("PC表示を確認中...")
    page.set_viewport_size({"width": 1280, "height": 900})
    page.goto(preview_url)
    page.wait_for_load_state("networkidle", timeout=20_000)
    time.sleep(3.0)
    ctx = get_shop_context(page)

    scroll_and_shot(page, "pc_01_top",   0,   frame=ctx)
    element_shot(ctx, page, "pc_02_brand1", ".km-bp--dark")
    element_shot(ctx, page, "pc_03_brand2", ".km-bp--light")
    element_shot(ctx, page, "pc_04_brand3", ".km-bp--amber")
    element_shot(ctx, page, "pc_05_items",  "#itemIndex", offset_y=200)

    log("プレビュー完了。output/sp_*.png / pc_*.png を確認してください。")


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview-only", action="store_true", help="保存せずプレビューのみ")
    args = ap.parse_args()

    html_content = TEMPLATE_FILE.read_text(encoding="utf-8")
    log(f"テンプレート: {TEMPLATE_FILE.name}  ({len(html_content):,} 文字)")

    OUT_DIR.mkdir(exist_ok=True)
    BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=str(BROWSER_PROFILE_DIR),
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        nav_page = browser.pages[0] if browser.pages else browser.new_page()

        if not ensure_logged_in(nav_page):
            log("ログイン失敗。終了します。")
            browser.close()
            return

        editor_page_url = click_editor_button(nav_page)
        if not editor_page_url:
            log("\nエディタページへの自動遷移に失敗しました。")
            log("output/themes_list.png を確認し、手動でエディタを開いてください。")
            browser.close()
            return

        # 新タブが開いた場合は _editor_page を使う
        editor_page = getattr(nav_page, "_editor_page", nav_page)

        if args.preview_only:
            log("--preview-only: 保存をスキップしてプレビューのみ実行")
            check_preview(editor_page, editor_page_url)
        else:
            ok = set_editor_content(editor_page, html_content)
            if ok:
                log("\n✓ テンプレート保存完了")
                check_preview(editor_page, editor_page_url)
            else:
                log("\n✗ 保存に失敗しました。html_editor.png / before_save.png を確認してください。")

        log("\n完了。ブラウザを閉じます。")
        browser.close()


if __name__ == "__main__":
    main()
