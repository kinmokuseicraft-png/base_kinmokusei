"""
銘木図鑑 - WordPress記事生成スクリプト
木材JSONデータと画像リストから、WordPress Gutenbergブロック形式のHTMLを生成します。
kinmokuseijp.blog の実際の記事フォーマットに完全準拠。

記事構成:
  1. 木材名 (h2 中央寄せ)
  2. メインビジュアル画像
  3. 基本データ表（学名・別名・分類・科属・原産国・気乾比重・強度・ヤンカ硬度・レッドリスト）
  4. ラベル画像見出し + 本文（色・木目・香り・木言葉）
  5. 飾り画像（kimono）
  6. 概要 (h2)
     └ セクション群 (h3 > コンテンツ画像 > h4 > p×複数)
  7. 免責事項
"""
import json
import sys
from pathlib import Path
from datetime import datetime


# ── WordPress メディアライブラリの固定ラベル画像 ─────────────────────────────
# kinmokuseijp.blog に登録済みの画像IDとURL
LABEL_IMAGES = {
    "iro": {
        "id": 200,
        "url": "https://kinmokuseijp.blog/wp-content/uploads/2024/01/iro-1.png",
        "alt": "色",
        "width": 250, "height": 22,
    },
    "mokume": {
        "id": 220,
        "url": "https://kinmokuseijp.blog/wp-content/uploads/2024/01/mokume-1.png",
        "alt": "木目",
        "width": 250, "height": 22,
    },
    "kaori": {
        "id": 218,
        "url": "https://kinmokuseijp.blog/wp-content/uploads/2024/01/kaori-1.png",
        "alt": "香り",
        "width": 250, "height": 22,
    },
    "kikotoba": {
        "id": 216,
        "url": "https://kinmokuseijp.blog/wp-content/uploads/2024/01/kikotoba-1.png",
        "alt": "木言葉",
        "width": 250, "height": 22,
    },
    "kimono": {
        "id": 283,
        "url": "https://kinmokuseijp.blog/wp-content/uploads/2024/01/kimono-2.png",
        "alt": "",
        "width": 920, "height": 953,
    },
}


def _esc(text: str) -> str:
    """HTMLエスケープ"""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _p_center(text: str) -> str:
    """センタリング段落ブロック（色/木目/香り/木言葉セクション用）"""
    if not text:
        return ""
    return f"""<!-- wp:paragraph {{"textAlign":"center","className":"u-mb-ctrl u-mb-20"}} -->
<p class="has-text-align-center u-mb-ctrl u-mb-20">{_esc(text)}</p>
<!-- /wp:paragraph -->"""


def _p(text: str) -> str:
    """通常段落ブロック"""
    if not text:
        return ""
    return f"""<!-- wp:paragraph -->
<p>{_esc(text)}</p>
<!-- /wp:paragraph -->"""


def _h(level: int, text: str) -> str:
    """見出しブロック（概要セクション内のh4用）"""
    if not text:
        return ""
    return f"""<!-- wp:heading {{"level":{level}}} -->
<h{level} class="wp-block-heading">{_esc(text)}</h{level}>
<!-- /wp:heading -->"""


def _label_heading(key: str, level: int = 3) -> str:
    """ラベル画像を見出しとして使用するブロック"""
    img = LABEL_IMAGES[key]
    tag = f"h{level}"
    classes = "wp-block-heading has-text-align-center is-style-section_ttl u-mb-ctrl u-mb-5"
    return f"""<!-- wp:heading {{"level":{level},"textAlign":"center","className":"is-style-section_ttl u-mb-ctrl u-mb-5"}} -->
<{tag} class="{classes}"><img decoding="async" width="{img['width']}" height="{img['height']}" class="wp-image-{img['id']}" style="width: 250px;" src="{img['url']}" alt="{img['alt']}" /></{tag}>
<!-- /wp:heading -->"""


def _section_image(img: dict, alt: str = "") -> str:
    """概要セクション内のコンテンツ画像（photo_frame スタイル）"""
    url = img.get("url", "")
    if not url:
        return ""
    artist = img.get("artist", "")
    source = img.get("source", "")
    license_ = img.get("license", "")

    caption_parts = []
    if artist:
        caption_parts.append(_esc(artist))
    if source:
        caption_parts.append(_esc(source))
    if license_:
        caption_parts.append(_esc(license_))
    caption = " / ".join(caption_parts)

    figcaption = ""
    if caption:
        figcaption = f'\n  <figcaption class="wp-element-caption">{caption}</figcaption>'

    return f"""<!-- wp:image {{"align":"center","className":"is-style-photo_frame"}} -->
<figure class="wp-block-image aligncenter is-style-photo_frame">
  <img src="{_esc(url)}" alt="{_esc(alt)}" />{figcaption}
</figure>
<!-- /wp:image -->"""


def _render_sections(sections: list, images: list) -> str:
    """sections 配列（h3 > h4 > paragraphs）を Gutenberg HTML にレンダリング"""
    blocks = []
    # 2枚目以降の画像をセクション間に散りばめる
    img_pool = list(images[1:]) if images else []

    for i, sec in enumerate(sections):
        h3_text = sec.get("h3", "")
        if h3_text:
            blocks.append(f"""<!-- wp:heading {{"level":3,"className":"u-mb-ctrl u-mb-10 is-style-default"}} -->
<h3 class="wp-block-heading has-text-align-left u-mb-ctrl u-mb-10 is-style-default"><span class="swl-fz u-fz-l">{_esc(h3_text)}</span></h3>
<!-- /wp:heading -->""")

        # セクション冒頭に画像を1〜2枚配置
        imgs_for_section = []
        if img_pool:
            imgs_for_section.append(img_pool.pop(0))
        if img_pool and i == 0:
            imgs_for_section.append(img_pool.pop(0))

        for img in imgs_for_section:
            img_block = _section_image(img, h3_text)
            if img_block:
                blocks.append(img_block)

        for sub in sec.get("subsections", []):
            h4 = sub.get("h4", "")
            if h4:
                blocks.append(_h(4, h4))
            for para in sub.get("paragraphs", []):
                if para:
                    blocks.append(_p(para))

    return "\n\n".join(b for b in blocks if b)


def _render_sections_fallback(wood_data: dict) -> str:
    """旧形式（origin_features/traditional_uses 等）のフォールバック"""
    blocks = []
    field_map = [
        ("産地と植物学的特徴", "origin_features"),
        ("伝統的な用途と文化的背景", "traditional_uses"),
        ("日本における歴史と利用", "history_japan"),
        ("ペン軸素材としての魅力", "pen_characteristics"),
    ]
    for heading, key in field_map:
        text = wood_data.get(key, "")
        if text:
            blocks.append(f"""<!-- wp:heading {{"level":3,"className":"u-mb-ctrl u-mb-10 is-style-default"}} -->
<h3 class="wp-block-heading has-text-align-left u-mb-ctrl u-mb-10 is-style-default"><span class="swl-fz u-fz-l">{_esc(heading)}</span></h3>
<!-- /wp:heading -->""")
            blocks.append(_p(text))

    care = wood_data.get("care_notes", "")
    if care:
        blocks.append(_h(4, "お手入れについて"))
        blocks.append(_p(care))

    return "\n\n".join(b for b in blocks if b)


def generate_article(wood_data: dict, images: list = None, blog_url: str = "") -> str:
    """WordPress Gutenbergブロック形式のHTML記事を生成"""
    images = images or []

    name        = wood_data.get("wood_name_ja", "")
    scientific  = wood_data.get("scientific_name", "")
    family      = wood_data.get("family", "")
    genus       = wood_data.get("genus", "")
    classification = wood_data.get("classification", "")
    aliases_list = wood_data.get("aliases", [])
    aliases     = "、".join(aliases_list) if aliases_list else "—"
    origins     = "、".join(wood_data.get("origin_countries", [])) or "—"
    gravity     = wood_data.get("specific_gravity", "")
    hardness    = wood_data.get("hardness", "")
    janka       = wood_data.get("janka_hardness", "")
    red_list    = wood_data.get("red_list", "")
    color       = wood_data.get("color_description", "")
    grain       = wood_data.get("grain_description", "")
    scent       = wood_data.get("scent_description", "")
    motto_list  = wood_data.get("wood_motto", [])
    motto       = "・".join(motto_list) if motto_list else ""
    sections    = wood_data.get("sections", [])

    # ── 1. 木材名 h2 ────────────────────────────────────────
    title_block = f"""<!-- wp:heading {{"textAlign":"center","className":"is-style-default u-mb-ctrl u-mb-20"}} -->
<h2 class="wp-block-heading has-text-align-center is-style-default u-mb-ctrl u-mb-20">{_esc(name)}</h2>
<!-- /wp:heading -->"""

    # ── 2. メインビジュアル ──────────────────────────────────
    main_image_block = ""
    if images:
        img = images[0]
        url = img.get("url", "")
        if url:
            artist = img.get("artist", "")
            source = img.get("source", "")
            license_ = img.get("license", "")
            caption_parts = [p for p in [artist, source, license_] if p]
            caption = " / ".join(caption_parts)
            main_image_block = f"""<!-- wp:image {{"align":"wide","sizeSlug":"large"}} -->
<figure class="wp-block-image alignwide size-large">
  <img src="{_esc(url)}" alt="{_esc(name)}（{_esc(scientific)}）の木材" />
  {"<figcaption class=\"wp-element-caption\">出典: " + _esc(caption) + "</figcaption>" if caption else ""}
</figure>
<!-- /wp:image -->"""

    # ── 3. 基本データ表 ─────────────────────────────────────
    family_genus = ""
    if family and genus:
        family_genus = f"{family}科{genus}属"
    elif family:
        family_genus = family

    def _td_row(label: str, value: str, italic: bool = False) -> str:
        if not value:
            return ""
        val_html = f"<em>{_esc(value)}</em>" if italic else _esc(value)
        return f"      <tr><td><strong>{_esc(label)}</strong></td><td>{val_html}</td></tr>"

    data_rows = "\n".join(filter(None, [
        _td_row("学名",       scientific, italic=True),
        _td_row("別名",       aliases),
        _td_row("分類",       classification),
        _td_row("科・属",     family_genus),
        _td_row("原産国",     origins),
        _td_row("気乾比重",   str(gravity) if gravity else ""),
        _td_row("強度",       hardness),
        _td_row("ヤンカ硬度", janka),
        _td_row("レッドリスト", red_list),
    ]))

    data_table_block = f"""<!-- wp:table {{"className":"is-all-centered is-style-stripes u-mb-ctrl u-mb-40 has-medium-font-size"}} -->
<figure class="wp-block-table is-all-centered is-style-stripes u-mb-ctrl u-mb-40 has-medium-font-size">
  <table style="font-size:12px;" class="has-fixed-layout">
    <thead><tr><th colspan="2"><strong>データ</strong></th></tr></thead>
    <tbody>
{data_rows}
    </tbody>
  </table>
</figure>
<!-- /wp:table -->"""

    # ── 4. ラベル画像見出し + テキスト（色・木目・香り・木言葉） ─────────
    feature_blocks = []

    if color:
        feature_blocks.append(_label_heading("iro", level=3))
        feature_blocks.append(_p_center(color))

    if grain:
        feature_blocks.append(_label_heading("mokume", level=4))
        feature_blocks.append(_p_center(grain))

    if scent:
        feature_blocks.append(_label_heading("kaori", level=4))
        feature_blocks.append(_p_center(scent))

    motto_text = motto if motto else "—"
    feature_blocks.append(_label_heading("kikotoba", level=4))
    feature_blocks.append(_p_center(motto_text))

    features_block = "\n\n".join(b for b in feature_blocks if b)

    # ── 5. 飾り画像（kimono） ─────────────────────────────────
    kimono = LABEL_IMAGES["kimono"]
    kimono_block = f"""<!-- wp:image {{"align":"center","sizeSlug":"full","className":"is-resized"}} -->
<figure class="wp-block-image aligncenter size-full is-resized">
  <img decoding="async" width="{kimono['width']}" height="{kimono['height']}" src="{kimono['url']}" alt="" class="wp-image-{kimono['id']}" style="width:100px" />
</figure>
<!-- /wp:image -->"""

    # ── 6. 概要 h2 ────────────────────────────────────────────
    overview_h2 = f"""<!-- wp:heading {{"textAlign":"center","className":"u-mb-ctrl u-mb-40"}} -->
<h2 class="wp-block-heading has-text-align-center u-mb-ctrl u-mb-40">概要</h2>
<!-- /wp:heading -->"""

    # ── 7. セクション群 ───────────────────────────────────────
    if sections:
        sections_html = _render_sections(sections, images)
    else:
        sections_html = _render_sections_fallback(wood_data)

    # ── 8. BASEリンク（任意）────────────────────────────────
    base_link_block = ""
    if blog_url:
        base_link_block = f"""<!-- wp:paragraph -->
<p>→ <a href="{_esc(blog_url)}" target="_blank" rel="noopener">銘木図鑑: {_esc(name)}</a> もご覧ください。</p>
<!-- /wp:paragraph -->"""

    # ── 組み立て ─────────────────────────────────────────────
    parts = [
        title_block,
        main_image_block,
        data_table_block,
        features_block,
        kimono_block,
        overview_h2,
        sections_html,
        base_link_block,
        """<!-- wp:separator -->
<hr class="wp-block-separator has-alpha-channel-opacity"/>
<!-- /wp:separator -->""",
        """<!-- wp:paragraph -->
<p><em>※ 本記事の情報は研究・執筆時点のものです。自然素材のため個体差があります。</em></p>
<!-- /wp:paragraph -->""",
    ]

    return "\n\n".join(p for p in parts if p).strip()


def generate_post_title(wood_data: dict) -> str:
    name = wood_data.get("wood_name_ja", "")
    catch_copy = wood_data.get("catch_copy", "")
    reading = wood_data.get("wood_name_reading", "")
    if catch_copy:
        return f"【{catch_copy}】{name}｜銘木図鑑"
    return f"{name}（{reading}）｜銘木図鑑"


def save_article(wood_name_ja: str, html_content: str, title: str) -> Path:
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"{wood_name_ja}_article.html"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"<!-- タイトル: {title} -->\n")
        f.write(f"<!-- 生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M')} -->\n\n")
        f.write(html_content)
    return output_file


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")

    if len(sys.argv) < 2:
        print("使用方法: python generate_article.py <木材名>")
        sys.exit(1)

    wood_name = sys.argv[1]
    sys.path.insert(0, str(Path(__file__).parent))
    from research_wood import load_wood_data
    from search_images import load_wood_images

    wood_data = load_wood_data(wood_name)
    images = load_wood_images(wood_data.get("wood_name_ja", wood_name))

    title = generate_post_title(wood_data)
    html = generate_article(wood_data, images)
    output_file = save_article(wood_data.get("wood_name_ja", wood_name), html, title)

    print(f"✅ 記事HTML生成完了: {output_file}")
    print(f"   タイトル: {title}")
    print(f"   文字数: {len(html)}文字")
