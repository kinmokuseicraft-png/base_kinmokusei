"""
木軸ペン工房 金木犀 - BASE自動出品スクリプト
----------------------------------------------
【撮影〜出品の流れ】
  1. カメラで「集合写真」を1枚撮影（全ペンを左から順に並べる）
  2. 左から順に各ペンを5枚ずつ撮影
  3. photos/YYYYMMDD/ にそのまま転送（ファイル名は変更不要）
  4. data/pens.csv に集合写真の左から順に木の名前などを記入
  5. python scripts/uploader.py を実行 → ブラウザが自動で動く
  6. BASEの下書きを確認して価格設定・出品

  サンプル（通常・抽選を同時に1本で試す）:
    python scripts/uploader.py --sample-both --yes

【写真の割り当てルール】
  撮影順（ファイル名昇順）で:
  - 1枚目 → 集合写真（全ペンのリストに添付）
  - 2〜6枚目 → ペン1（CSVの1行目）
  - 7〜11枚目 → ペン2（CSVの2行目）
  - 以降5枚ずつ順番に割り当て
"""

import os
import re
import csv
import sys
import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Windows での日本語文字化け対策
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# ─── パス設定 ─────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
PHOTOS_DIR = BASE_DIR / "photos"
COMMON_DIR = BASE_DIR / "common_images"
TEMPLATE_FILE = BASE_DIR / "templates" / "description_template.txt"
DOGTAG_TEMPLATE_FILE = BASE_DIR / "templates" / "dogtag_description_template.txt"
PENS_CSV = BASE_DIR / "data" / "pens.csv"
ARTWORKS_DIR = BASE_DIR / "data" / "artworks"
WOODS_DIR = BASE_DIR / "data" / "woods"
LOG_FILE = BASE_DIR / "output" / "upload_log.txt"

BASE_LOGIN_URL = "https://admin.thebase.com/users/login"
BASE_ADMIN_URL = "https://admin.thebase.com/shop_admin/"
BASE_NEW_ITEM_URL = "https://admin.thebase.com/shop_admin/items/add"
BASE_LOTTERY_ITEM_URL = "https://admin.thebase.com/shop_admin/items/add?itemType=lottery"
# ブラウザプロフィール保存先（ここにCookieやセッションが永続保存される）
BROWSER_PROFILE_DIR = BASE_DIR / "output" / "browser_profile"

PHOTOS_PER_PEN = 5


# ─── ユーティリティ ────────────────────────────────────
def log(msg: str):
    print(msg)
    LOG_FILE.parent.mkdir(exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def load_template() -> str:
    with open(TEMPLATE_FILE, encoding="utf-8") as f:
        return f.read()


def load_pens() -> list[dict]:
    with open(PENS_CSV, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def find_photo_batch(shoot_date: str | None = None) -> tuple[Path | None, list[Path]]:
    """
    photos/ 以下から写真を取得。
    戻り値: (集合写真パス or None, 個別ペン写真リスト)
    - 先頭1枚を集合写真として扱う
    - 残りを5枚ずつペンに割り当て
    """
    if shoot_date:
        target = PHOTOS_DIR / shoot_date
    else:
        subdirs = sorted([d for d in PHOTOS_DIR.iterdir() if d.is_dir()])
        if not subdirs:
            log("エラー: photos/ にサブフォルダが見つかりません。")
            log("       例: photos/20260307/ を作って写真を入れてください。")
            sys.exit(1)
        target = subdirs[-1]

    log(f"使用フォルダ: {target}")
    all_files = sorted(
        [f for f in target.iterdir()
         if f.suffix.lower() in ('.jpg', '.jpeg', '.png')]
    )

    if not all_files:
        log("エラー: 写真が見つかりません。")
        sys.exit(1)

    group_photo = all_files[0]
    pen_photos = all_files[1:]

    log(f"集合写真: {group_photo.name}")
    log(f"個別写真: {len(pen_photos)} 枚 → {len(pen_photos) // PHOTOS_PER_PEN} 本分")
    return group_photo, pen_photos


def get_common_images() -> list[Path]:
    exts = ('.jpg', '.jpeg', '.png')
    images = sorted([f for f in COMMON_DIR.iterdir() if f.suffix.lower() in exts])
    log(f"共通画像: {len(images)} 枚")
    return images


def build_description(template: str, pen: dict) -> str:
    text = template

    # blog_url が空なら「詳しく知りたい方はこちらへ」行ごと削除
    if not pen.get("blog_url"):
        text = re.sub(r"詳しく知りたい方はこちらへ\n\{blog_url\}\n?", "", text)

    # pen_type が MP なら「ボールペン」→「シャープペンシル」
    if pen.get("pen_type") == "MP":
        text = text.replace("一点物のボールペンになります", "一点物のシャープペンシルになります")

    for key, value in pen.items():
        text = text.replace(f"{{{key}}}", value or "")
    return text


def build_title(pen: dict) -> str:
    """
    タイトル例: 【時代を跨ぐ銘木】 チーク 瘤杢 gold BP 木登りトカゲ
    pens.csv に 'title' カラムがあればそれをそのまま使う
    """
    if pen.get("title"):
        return pen["title"]
    parts = [
        f"【{pen['catch_copy']}】" if pen.get("catch_copy") else "",
        pen.get("wood_name", ""),
        pen.get("hardware_color", ""),
        pen.get("pen_type", ""),
        pen.get("artwork_name", ""),
    ]
    return " ".join(p for p in parts if p)


# ─── ドッグタグ用ユーティリティ ───────────────────────────
def load_dogtag_template() -> str:
    if not DOGTAG_TEMPLATE_FILE.exists():
        log(f"エラー: ドッグタグテンプレートが見つかりません: {DOGTAG_TEMPLATE_FILE}")
        sys.exit(1)
    return DOGTAG_TEMPLATE_FILE.read_text(encoding="utf-8")


def load_artwork(artwork_name: str) -> dict:
    path = ARTWORKS_DIR / f"{artwork_name}.json"
    if not path.exists():
        log(f"エラー: 作品データが見つかりません: {path}")
        sys.exit(1)
    return json.loads(path.read_text(encoding="utf-8"))


def load_wood(wood_name: str) -> dict:
    """data/woods/<wood_name>.json を読み込む。なければ空dictを返す"""
    # Path.exists() は Windows の Unicode ファイル名で誤判定することがあるため
    # os.scandir で直接比較する
    target = f"{wood_name}.json"
    for entry in os.scandir(WOODS_DIR):
        if entry.name == target:
            return json.loads(Path(entry.path).read_text(encoding="utf-8"))
    return {"wood_name": wood_name}


def build_dogtag_title(wood: dict, artwork: dict, prefix: str = "") -> str:
    """
    ドッグタグのタイトルを組み立てる。
    例: 【翡翠の木】 パロサント ドッグタグ 象嵌 闊歩
    """
    catch_copy = wood.get("catch_copy", "")
    wood_name = wood.get("wood_name", "")
    artwork_name = artwork.get("artwork_name", "")
    parts = []
    if catch_copy:
        parts.append(f"【{catch_copy}】")
    parts.append(wood_name)
    parts.append("ドッグタグ 象嵌")
    parts.append(artwork_name)
    title = " ".join(p for p in parts if p)
    if prefix:
        title = f"{prefix}{title}"
    return title


def _prepend_wood_name_if_needed(wood_description: str, wood_name: str) -> str:
    """一文目に木材名がなければ '{wood_name}は、' を先頭に追加する"""
    if not wood_description or not wood_name:
        return wood_description
    first_sentence = re.split(r'[。\n]', wood_description)[0]
    name_parts = wood_name.replace('\u3000', ' ').split()
    if any(part in first_sentence for part in name_parts):
        return wood_description
    return f"{wood_name}は、{wood_description}"


def build_dogtag_description(template: str, wood: dict, artwork: dict,
                              parts: str = "") -> str:
    """
    ドッグタグ用説明文を組み立てる。
    parts: 使用パーツの説明（例: '狼は白樺、月はアバロンシェルで仕立てました。'）
           空文字の場合は artwork["parts"] を使用する。
    """
    wood_description = _prepend_wood_name_if_needed(
        wood.get("wood_description", ""), wood.get("wood_name", "")
    )
    blog_url = wood.get("blog_url", "")
    # parts は引数 > artwork JSON > 空文字 の優先度
    parts_text = parts or artwork.get("parts", "")
    text = template

    # blog_url が空なら「詳しく知りたい方はこちらへ」行ごと削除
    if not blog_url:
        text = re.sub(r"詳しく知りたい方はこちらへ\n\{blog_url\}\n?", "", text)

    # wood_description と parts が両方空なら【構成】ブロックごと削除
    if not wood_description and not parts_text:
        text = re.sub(r"【構成】\n\{wood_description\}\n\{parts\}\n\n", "", text)

    replacements = {
        "artwork_name": artwork.get("artwork_name", ""),
        "artwork_description": artwork.get("artwork_description", ""),
        "wood_description": wood_description,
        "parts": parts_text,
        "wood_name": wood.get("wood_name", ""),
        "catch_copy": wood.get("catch_copy", ""),
        "blog_url": blog_url,
    }
    for key, value in replacements.items():
        text = text.replace(f"{{{key}}}", value or "")
    return text


# ─── 写真割り当て確認 ──────────────────────────────────
def confirm_photo_assignment(pens: list[dict], group_photo: Path | None,
                              pen_photos: list[Path],
                              auto_yes: bool = False) -> dict[int, list[Path]]:
    print("\n" + "="*50)
    print("【写真の割り当て確認】")
    print("="*50)
    if group_photo:
        print(f"集合写真: {group_photo.name}  ← 全商品に添付されます")
    print()

    assignments = {}
    for i, pen in enumerate(pens):
        start = i * PHOTOS_PER_PEN
        photos = pen_photos[start:start + PHOTOS_PER_PEN]
        assignments[i] = photos
        names = [p.name for p in photos]
        print(f"ペン{i+1}: {pen['wood_name']}")
        print(f"  写真: {', '.join(names) if names else '※ 写真が足りません'}")

    extra = len(pen_photos) - len(pens) * PHOTOS_PER_PEN
    if extra > 0:
        print(f"\n※ 余った写真: {extra} 枚（集合写真のみなど）")

    print("\n上記の割り当てで進めますか？")
    print("  Enter → 続行")
    print("  Ctrl+C → 中断")
    if not auto_yes:
        input()
    else:
        print("（--yes モードのため自動続行）")
    return assignments


# ─── BASE操作 ──────────────────────────────────────────
def wait_for_items_add(page, timeout=300_000) -> bool:
    """items/add ページに到達するまで待機する共通処理"""
    try:
        page.wait_for_url("https://admin.thebase.com/shop_admin/items/add*", timeout=timeout)
        return True
    except PlaywrightTimeoutError:
        return False


def ensure_logged_in(page, email: str, password: str) -> bool:
    """
    items/add に到達できるまでログイン処理を行う。
    - メール・パスワードは自動入力
    - 2FA認証コードはブラウザで手動入力（検知後に自動で次へ進む）
    - login_loading の中間リダイレクトも待機して通過する
    """
    log("ログイン状態を確認中...")
    page.goto(BASE_NEW_ITEM_URL)

    # login_loading などの中間リダイレクトが完全に終わるまで待つ（最大10秒）
    try:
        page.wait_for_url("https://admin.thebase.com/shop_admin/items/add*", timeout=10_000)
        log("ログイン済み（認証コード不要）")
        return True
    except PlaywrightTimeoutError:
        pass

    current = page.url
    log(f"リダイレクト先: {current}")

    # ── ログインページ → 自動入力 ──────────────────────
    if "login" in current and "verify" not in current and "loading" not in current:
        log("メール・パスワードを自動入力中...")
        page.wait_for_selector('input[name="data[User][mail_address]"]')
        page.fill('input[name="data[User][mail_address]"]', email)
        page.fill('input[name="data[User][password]"]', password)
        page.click('button[type="submit"]')
        log("送信完了。リダイレクト待機中...")

        # login_loading → items/add の完全なリダイレクト完了を待つ（最大30秒）
        if wait_for_items_add(page, timeout=30_000):
            log("ログイン成功！")
            return True

        # login_loading が終わったが 2FA が必要な場合
        current = page.url

    # ── 2FA ページ → 手動入力を待つ ────────────────────
    if "verify_two_factor" in current or "login" in current:
        log("\n" + "="*50)
        log("【認証コードの入力が必要です】")
        log("ブラウザで認証コードを入力してください。")
        log("入力後、自動で次のステップへ進みます。")
        log("="*50)

        if wait_for_items_add(page, timeout=300_000):
            log("認証完了！次回以降は認証コード不要です。")
            return True

    log("エラー: ログインに失敗しました。")
    page.screenshot(path=str(BASE_DIR / "output" / "login_error.png"))
    return False


def get_lottery_dates() -> tuple[str, str, str]:
    """
    次回の抽選スケジュールを計算して返す。
    スケジュール: 金曜21:00 受付開始 → 翌土曜18:00 締め切り → 同日21:00 当選発表

    戻り値: (受付開始, 締め切り, 当選発表) ※ BASEフォームの入力形式に依存（要調整）
    """
    now = datetime.now()
    # 次の金曜日を求める（weekday: 月=0 ... 金=4 土=5）
    days_until_friday = (4 - now.weekday()) % 7
    if days_until_friday == 0 and now.hour >= 21:
        days_until_friday = 7  # 今日が金曜21時以降なら来週金曜

    next_friday = now + timedelta(days=days_until_friday)
    start_dt = next_friday.replace(hour=21, minute=0, second=0, microsecond=0)
    end_dt = start_dt + timedelta(hours=21)    # 土曜18:00
    announce_dt = start_dt + timedelta(hours=24)  # 土曜21:00

    fmt = "%Y-%m-%d %H:%M"
    return start_dt.strftime(fmt), end_dt.strftime(fmt), announce_dt.strftime(fmt)


def fill_lottery_dates(page, start: str, end: str, announce: str):
    """
    抽選期間の3フィールドに日付・時刻を入力する。
    日付: readonly input を JS nativeSetter でセット（readonly を回避）
    時刻: 日付確定後に有効化される select を select_option で設定
    ※ compareDocumentPosition でラベルごとに正しいフィールドを特定
    """
    def parse_dt(dt_str: str) -> tuple[str, str, str]:
        parts = dt_str.split(" ")
        date_val = parts[0].replace("-", "/")
        h, m = (parts[1].split(":") if len(parts) > 1 else ["00", "00"])
        return date_val, h.zfill(2), m.zfill(2)

    label_pairs = [
        ("応募開始日時",    *parse_dt(start)),
        ("応募締切日時",    *parse_dt(end)),
        ("抽選結果発表日時", *parse_dt(announce)),
    ]

    for label_text, date_val, hour, minute in label_pairs:
        year_str, month_str, day_str = date_val.split("/")
        month_num = str(int(month_str))  # 先頭ゼロなし
        day_num   = str(int(day_str))    # 先頭ゼロなし

        # ラベル直後のdatepicker inputを取得
        date_input = page.locator(
            f"xpath=//span[normalize-space()='{label_text}']/following::input[@type='text'][1]"
        ).first

        # 1) inputをクリックしてカレンダーを開く
        try:
            date_input.click(timeout=5000)
            page.wait_for_timeout(600)
        except Exception as e:
            log(f"  ⚠ カレンダーを開けず: {label_text} ({e})")
            continue

        # 2) カレンダーヘッダーの年・月 select でナビゲート
        try:
            page.locator('#years').select_option(year_str, timeout=2000)
            page.wait_for_timeout(300)
        except Exception:
            pass
        try:
            page.locator('#months').select_option(month_num, timeout=2000)
            page.wait_for_timeout(300)
        except Exception:
            pass

        # 3) 対象日セルをクリック（カレンダーは li.m-calendar__cell--date を使用）
        clicked = page.evaluate(f"""() => {{
            const day = '{day_num}';
            const cells = Array.from(document.querySelectorAll('li.m-calendar__cell--date'))
                .filter(el => {{
                    if (el.textContent.trim() !== day) return false;
                    if (el.offsetParent === null) return false;
                    if (el.classList.contains('is-disabled') || el.classList.contains('disabled')) return false;
                    return true;
                }});
            if (cells.length > 0) {{ cells[0].click(); return true; }}
            return false;
        }}""")

        if clicked:
            log(f"  抽選日付: {label_text} = {date_val} (カレンダー選択)")
        else:
            log(f"  ⚠ 日付セル未発見: {label_text} = {date_val}")
            page.keyboard.press("Escape")
            continue

        # カレンダーが閉じるまで待機（#years が消えるまで最大3秒）
        try:
            page.wait_for_selector('#years', state='hidden', timeout=3000)
        except Exception:
            try:
                page.wait_for_selector('#years', state='detached', timeout=1000)
            except Exception:
                pass
        page.wait_for_timeout(500)

        # 4) 時・分の c-pulldown カスタムドロップダウンを操作
        #    構造: DIV.c-pulldown (クリックで開く) → LI > LABEL > SPAN.c-pulldown__labelText
        #    無効の場合は class に "is_disabled" が含まれる
        #    ※ JSクリックではReact eventsが発火しないためPlaywrightネイティブクリックを使用
        for pd_idx, (val, name) in enumerate([(hour, "時"), (minute, "分")], start=1):
            # XPath: label より後にある pd_idx 番目の有効な c-pulldown
            # contains(concat(' ',@class,' '),' c-pulldown ') でクラス名の完全一致を保証
            # （c-pulldown__activeText などの子要素クラスを誤検知しないため）
            pulldown_loc = page.locator(
                f"xpath=//span[normalize-space()='{label_text}']"
                f"/following::div[contains(concat(' ',@class,' '),' c-pulldown ')"
                f" and not(contains(@class,'is_disabled'))][{pd_idx}]"
            ).first

            try:
                pulldown_loc.click(timeout=3000)
                page.wait_for_timeout(400)
            except Exception as e:
                log(f"  ⚠ 抽選{name}プルダウン未クリック: {label_text} ({e})")
                continue

            # オプションリストから目的の値をクリック
            option_loc = page.locator(f"span.c-pulldown__labelText").filter(has_text=val).first
            try:
                option_loc.click(timeout=3000)
                log(f"  抽選{name}: {label_text} = {val}")
            except Exception as e:
                log(f"  ⚠ 抽選{name}オプション未発見: {label_text} ({e})")

            page.wait_for_timeout(300)

        page.wait_for_timeout(200)


def upload_images(page, images: list[Path]):
    """複数の画像を順番にアップロードする"""
    for img_path in images:
        try:
            # BASE の画像アップロード用 file input（1枚ずつ選択後に次が出現する）
            file_input = page.wait_for_selector('input[type="file"]', timeout=8_000)
            file_input.set_input_files(str(img_path))
            # アップロード完了まで待機（サムネイルが追加されるのを確認）
            page.wait_for_timeout(2500)
            log(f"  ✓ {img_path.name}")
        except Exception as e:
            log(f"  × アップロード失敗 ({img_path.name}): {e}")


def upload_item(page, pen: dict, pen_specific_photos: list[Path],
                group_photo: Path | None, common_images: list[Path],
                template: str):

    title = build_title(pen)
    description = build_description(template, pen)
    price = pen.get("price", "").strip()
    sale_type = pen.get("sale_type", "通常販売")

    is_lottery = (sale_type == "抽選販売")
    start_dt, end_dt, announce_dt = get_lottery_dates() if is_lottery else ("", "", "")

    log(f"\n{'='*50}")
    log(f"出品開始: {title}  [{sale_type}]")
    if is_lottery:
        log(f"  抽選スケジュール: {start_dt} → {end_dt} → {announce_dt}")
    log(f"{'='*50}")

    # 抽選販売は専用URLを使用
    item_url = BASE_LOTTERY_ITEM_URL if is_lottery else BASE_NEW_ITEM_URL
    page.goto(item_url)
    try:
        page.wait_for_url("https://admin.thebase.com/shop_admin/items/add*", timeout=30_000)
    except PlaywrightTimeoutError:
        log(f"警告: items/add へのリダイレクト待機タイムアウト (現在URL: {page.url})")
    page.wait_for_load_state("networkidle")

    # ── 商品名 ──
    page.wait_for_selector('#itemDetail_name', timeout=15_000)
    page.fill('#itemDetail_name', title)
    log(f"商品名: {title}")

    # ── 説明文 ──
    desc_area = page.query_selector('textarea[placeholder*="サイズ"]')
    if desc_area:
        desc_area.fill(description)
        log("説明文: 入力済み")
    else:
        log("警告: 説明文テキストエリアが見つかりません")

    # ── 価格 ──
    if price:
        page.fill('#itemDetail_price', price)
        log(f"価格: ¥{price}")
    else:
        log("価格: 空欄（後で手動設定）")

    # ── 在庫数（1） ──
    page.fill('#itemDetail_stock', '1')
    log("在庫数: 1")

    # ── 非公開設定（下書き相当） ──
    page.click('label[for="displayfalse1"]')
    log("公開設定: 非公開（確認後に公開）")

    # ── 抽選期間（抽選販売のみ） ──
    if is_lottery:
        fill_lottery_dates(page, start_dt, end_dt, announce_dt)

    # ── 画像アップロード（ペン固有 → 集合写真 → 共通） ──
    log("画像をアップロード中...")
    all_images = list(pen_specific_photos)
    if group_photo:
        all_images.append(group_photo)
    all_images.extend(common_images)
    upload_images(page, all_images)

    # ── 商品を登録（非公開で保存） ──
    try:
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        register_btn = page.wait_for_selector('button:has-text("商品を登録")', timeout=8_000)
        register_btn.scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        register_btn.click()
        page.wait_for_url("**/shop_admin/items/**", timeout=20_000)
        log(f"→ 保存完了（非公開）: {title}")
        page.screenshot(path=str(BASE_DIR / "output" / f"saved_{title[:20]}.png"))

    except Exception as e:
        log(f"保存エラー: {e}")
        page.screenshot(path=str(BASE_DIR / "output" / f"error_{title[:20]}.png"))


# ─── メイン ────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="BASE自動出品スクリプト")
    parser.add_argument("--yes", "-y", action="store_true", help="確認プロンプトをスキップ")
    parser.add_argument("--date", "-d", help="撮影日フォルダ名 (例: 20260307)")
    parser.add_argument("--sample-both", action="store_true",
                        help="サンプル: 1本目を通常販売・抽選販売の2件で同時出品")
    parser.add_argument("--sample-dogtag", action="store_true",
                        help="サンプル: ドッグタグを1件出品（通常販売・非公開）")
    parser.add_argument("--dogtag-artwork", default="闊歩",
                        help="--sample-dogtag で使う作品名 (default: 闊歩)")
    parser.add_argument("--dogtag-wood", default="パロサント",
                        help="--sample-dogtag で使う木材名 (default: パロサント)")
    parser.add_argument("--dogtag-price", default="4300",
                        help="--sample-dogtag で使う価格 (default: 4300)")
    parser.add_argument("--dogtag-parts", default="",
                        help="--sample-dogtag で使うパーツ説明（例: '狼は白樺、月はアバロンシェルで仕立てました。'）")
    args = parser.parse_args()

    load_dotenv(BASE_DIR / ".env")
    email = os.getenv("BASE_EMAIL", "")
    password = os.getenv("BASE_PASSWORD", "")

    if not email or not password or "ここに" in email:
        log("エラー: .env にメールアドレスとパスワードを設定してください。")
        sys.exit(1)

    # ドッグタグサンプルモードは早期に分岐（ペン関連のロードを省略）
    if args.sample_dogtag:
        dogtag_template = load_dogtag_template()
        artwork = load_artwork(args.dogtag_artwork)
        wood = load_wood(args.dogtag_wood)
        # woods JSONに wood_name がなければ引数の値を使用
        if not wood.get("wood_name"):
            wood["wood_name"] = args.dogtag_wood
        title = "【テスト出品】" + build_dogtag_title(wood, artwork)
        description = build_dogtag_description(dogtag_template, wood, artwork,
                                                parts=args.dogtag_parts)
        dogtag_pen = {
            "title": title,
            "price": args.dogtag_price,
            "sale_type": "通常販売",
        }
        log(f"\n【ドッグタグ サンプルモード】")
        log(f"  作品名: {artwork.get('artwork_name')}")
        log(f"  木材名: {wood.get('wood_name')}")
        log(f"  タイトル: {title}")

        # 完成済み description をテンプレートとして渡す（{key} 残りなし → そのまま使われる）
        dogtag_pen = {"title": title, "price": args.dogtag_price, "sale_type": "通常販売"}

        log("\nブラウザを起動します...")
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
                # description は置換済みなのでテンプレートとして渡しても問題なし
                upload_item(page, dogtag_pen, [], None, [], description)
                log(f"\n完了！ ドッグタグサンプル（非公開）を登録しました。")
            finally:
                if not args.yes:
                    try:
                        input("\n終了するには Enter を押してください...")
                    except EOFError:
                        pass
                context.close()
        return

    pens = load_pens()
    template = load_template()
    group_photo, pen_photos = find_photo_batch(args.date)
    common_images = get_common_images()

    # 写真割り当て確認
    assignments = confirm_photo_assignment(pens, group_photo, pen_photos, auto_yes=args.yes)

    log("\nブラウザを起動します...")
    BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        # persistent_context = Cookieやセッションをプロフィールに永続保存
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(BROWSER_PROFILE_DIR),
            headless=False,
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        try:
            if not ensure_logged_in(page, email, password):
                sys.exit(1)

            if args.sample_both:
                # サンプル: 1本目を通常・抽選の2件で出品
                if not pens:
                    log("エラー: pens.csv にデータがありません。")
                    sys.exit(1)
                pen = pens[0]
                photos = assignments[0]
                base_title = pen.get("title") or build_title(pen)
                pen_normal = {**pen, "sale_type": "通常販売", "title": f"{base_title} 【通常販売】"}
                pen_lottery = {**pen, "sale_type": "抽選販売", "title": f"{base_title} 【抽選販売】"}
                log("\n【サンプルモード】1本目を通常・抽選の2件で登録します。")
                upload_item(page, pen_normal, photos, group_photo, common_images, template)
                upload_item(page, pen_lottery, photos, group_photo, common_images, template)
                log(f"\n完了！ サンプル2件（通常・抽選）を下書き保存しました。")
            else:
                for i, pen in enumerate(pens):
                    upload_item(
                        page=page,
                        pen=pen,
                        pen_specific_photos=assignments[i],
                        group_photo=group_photo,
                        common_images=common_images,
                        template=template,
                    )
                log(f"\n完了！ {len(pens)} 件を下書き保存しました。")
            log("BASEの管理画面（商品管理 → 下書き）で確認し、価格を設定してから出品してください。")

        except PlaywrightTimeoutError as e:
            log(f"タイムアウト: {e}")
            page.screenshot(path=str(BASE_DIR / "output" / "timeout_error.png"))
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


