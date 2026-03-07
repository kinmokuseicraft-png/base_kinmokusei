#!/usr/bin/env python3
"""
templates/base_template.html の「クロード編集用」3セクションを v3 デザインに置換。
"""
import re, sys
from pathlib import Path

TEMPLATE = Path(__file__).parent.parent / "templates" / "base_template.html"

# =========================================================
# 新しい CSS — v3「木漏れ日」
# 設計方針:
#   - items は CSS @keyframes で自動表示（JSなし・IO不要）→ナビゲーション保証
#   - 温かみのある琥珀色パレット、深みのある対比
#   - スマホ1列・タブレット2列・デスクトップ3列以上
#   - ヘッダーのスクロール影、ホバーエフェクト、svgディバイダーなど
# =========================================================
NEW_CSS = """\t<!-- クロード編集用（HTML編集）ここから ※このファイル全文をBASE「クロード編集用」テーマのHTML編集に貼り付けてください -->
\t<!-- 金木犀テーマ v3「木漏れ日」 -->
\t<style type="text/css">

\t/* ===== 変数・基本設定 ===== */
\t:root {
\t\t--bg:     #f8f3e8;
\t\t--bg2:    #ede6d4;
\t\t--ink:    #16120d;
\t\t--ink2:   #3d2e1c;
\t\t--amber:  #b86c1a;
\t\t--amber2: #c98840;
\t\t--border: rgba(184, 108, 26, 0.20);
\t\t--serif:  'Noto Serif JP', serif;
\t\t--sans:   'Noto Sans JP', sans-serif;
\t\t--ease:   cubic-bezier(0.25, 0.1, 0.25, 1);
\t\t--ease-o: cubic-bezier(0.0, 0.0, 0.2, 1);
\t}
\tbody {
\t\tbackground-color: var(--bg) !important;
\t\tcolor:            var(--ink) !important;
\t\tfont-family:      var(--sans) !important;
\t\tfont-size:        14px !important;
\t\tline-height:      1.85 !important;
\t\toverflow-x:       hidden;
\t}
\t#sb-site { overflow-x: hidden; min-width: 0; }

\t/* ===== コンテンツ幅 ===== */
\t.inner-conts {
\t\tmax-width: 1400px; margin: 0 auto;
\t\tpadding: 0 24px; box-sizing: border-box;
\t}
\t.conts-wrap { padding: 0; box-sizing: border-box; min-width: 0; }

\t/* ===== ヘッダー ===== */
\t#mainHeader {
\t\tbackground: rgba(248, 243, 232, 0.96) !important;
\t\tbackdrop-filter: blur(14px);
\t\t-webkit-backdrop-filter: blur(14px);
\t\tborder-bottom: 1px solid var(--border);
\t\ttransition: box-shadow 0.35s var(--ease);
\t}
\t#mainHeader.km-scrolled { box-shadow: 0 3px 24px rgba(22, 18, 13, 0.09); }
\t#shopHeader h1 a {
\t\tfont-family: var(--serif) !important;
\t\tletter-spacing: 0.2em;
\t}
\t#mainHeader .menu-trigger {
\t\tpadding: 12px; min-width: 44px; min-height: 44px;
\t\t-webkit-tap-highlight-color: transparent;
\t}

\t/* ===== ヒーローエリア ===== */
\t#visual { position: relative; width: 100%; overflow: hidden; margin-bottom: 0; }
\t#visual .slick-slider { margin-bottom: 0; }
\t#visual .slick-arrow  { display: none !important; }
\t#visual .slides       { position: relative; }
\t#visual .slides img   { width: 100%; height: auto; display: block; }

\t#visual .slideTitle,
\t#visual .slideSubTitle {
\t\tposition: absolute; left: 6%;
\t\tfont-family: var(--serif) !important;
\t\tletter-spacing: 0.22em; color: var(--ink); z-index: 10;
\t}
\t#visual .slideTitle {
\t\tbottom: 64px;
\t\tfont-size: clamp(1.5rem, 5.5vw, 3rem);
\t\tline-height: 1.45;
\t\ttext-shadow: 0 1px 12px rgba(248,243,232,0.7);
\t}
\t#visual .slideSubTitle {
\t\tbottom: 22px;
\t\tfont-size: clamp(0.85rem, 2.8vw, 1.15rem);
\t\ttext-shadow: 0 1px 8px rgba(248,243,232,0.8);
\t}

\t/* ===== アニメーション共通 ===== */
\t@keyframes km-up {
\t\tfrom { opacity: 0; transform: translateY(22px); }
\t\tto   { opacity: 1; transform: none; }
\t}
\t@keyframes km-fade {
\t\tfrom { opacity: 0; }
\t\tto   { opacity: 1; }
\t}
\t/* JS fade-in クラス（後方互換） */
\t.fade-in { opacity: 1 !important; transform: none !important; }

\t/* ===== セクションタイトル ===== */
\t.sec-ttl {
\t\tmargin: clamp(52px, 10vw, 88px) 0 clamp(28px, 5vw, 52px);
\t\ttext-align: center;
\t\tdisplay: flex; flex-wrap: wrap;
\t\talign-items: center; justify-content: center;
\t\tgap: 10px 20px;
\t}
\t.sec-ttl .list-ttl {
\t\tfont-family: var(--serif) !important;
\t\tfont-size: clamp(1.45rem, 4.5vw, 2.2rem);
\t\tletter-spacing: 0.24em; color: var(--ink);
\t\tmargin-bottom: 0; position: relative; display: inline-block;
\t}
\t/* タイトル両脇の飾り線 */
\t.sec-ttl .list-ttl::before,
\t.sec-ttl .list-ttl::after {
\t\tcontent: '';
\t\tdisplay: inline-block; vertical-align: middle;
\t\twidth: clamp(24px, 5vw, 56px); height: 1px;
\t\tbackground: var(--amber); margin: 0 0.8em;
\t}

\t/* ===== ピックアップ ===== */
\t#pickup { margin: clamp(36px, 7vw, 64px) 0; padding: 36px 0; }
\t#pickup .slick-arrow { display: none !important; }
\t#pickup .slick-dots { bottom: -36px; }
\t#pickup .slick-dots li button:before {
\t\tcolor: var(--amber); opacity: 0.35;
\t}
\t#pickup .slick-dots li.slick-active button:before { opacity: 1; }

\t#pickup .pickSlide {
\t\tdisplay: flex; align-items: center;
\t\tjustify-content: center;
\t\tgap: clamp(28px, 5vw, 68px);
\t\tpadding: 32px 24px; max-width: 1200px; margin: 0 auto;
\t}
\t#pickup .col-left { flex: 0 0 45%; }
\t#pickup .pickup-img { aspect-ratio: 3/4; overflow: hidden; }
\t#pickup .pickup-img img {
\t\twidth: 100%; height: 100%; object-fit: cover;
\t\ttransition: transform 0.7s var(--ease);
\t}
\t#pickup .pickup-img:hover img { transform: scale(1.05); }
\t#pickup .col-right { flex: 0 0 45%; }
\t#pickup .item-ttl {
\t\tfont-family: var(--serif) !important;
\t\tfont-size: clamp(1.25rem, 4vw, 1.85rem);
\t\tletter-spacing: 0.15em; margin-bottom: 16px;
\t\tcolor: var(--ink); line-height: 1.55;
\t}
\t#pickup .item-price {
\t\tfont-size: 1.05rem; margin-bottom: 24px;
\t\tcolor: var(--amber); letter-spacing: 0.08em;
\t}
\t#pickup .item-desc {
\t\tfont-size: clamp(12px, 3vw, 13.5px);
\t\tline-height: 2; margin-bottom: 32px; color: var(--ink2);
\t}
\t#pickup .item-btn a {
\t\tdisplay: inline-flex; align-items: center; justify-content: center;
\t\tpadding: 13px 40px; min-height: 44px;
\t\tborder: 1px solid var(--amber); color: var(--amber);
\t\ttext-decoration: none; letter-spacing: 0.12em;
\t\tposition: relative; overflow: hidden;
\t\ttransition: color 0.38s var(--ease);
\t\t-webkit-tap-highlight-color: transparent;
\t}
\t#pickup .item-btn a::before {
\t\tcontent: ''; position: absolute; inset: 0;
\t\tbackground: var(--amber); transform: scaleX(0);
\t\ttransform-origin: left center;
\t\ttransition: transform 0.38s var(--ease); z-index: 0;
\t}
\t#pickup .item-btn a:hover::before { transform: scaleX(1); }
\t#pickup .item-btn a:hover { color: #fff; }
\t#pickup .item-btn a > * { position: relative; z-index: 1; }

\t/* ===== 商品一覧 ===== */
\t#itemIndex { padding: 36px 0; }
\t#itemIndex #mainContent {
\t\tdisplay: grid;
\t\tgrid-template-columns: repeat(2, 1fr);
\t\tgap: clamp(28px, 5vw, 48px) clamp(14px, 3vw, 28px);
\t\tmax-width: 1400px; margin: 0 auto;
\t\tpadding: 0 16px; min-width: 0;
\t}

\t/* ── items は CSS アニメーションで即座に表示（JSに依存しない） ── */
\t#itemIndex .item {
\t\tmargin-bottom: 0;
\t\tanimation: km-up 0.55s var(--ease-o) both;
\t}
\t#itemIndex .item:nth-child(1)  { animation-delay: 0.04s; }
\t#itemIndex .item:nth-child(2)  { animation-delay: 0.10s; }
\t#itemIndex .item:nth-child(3)  { animation-delay: 0.16s; }
\t#itemIndex .item:nth-child(4)  { animation-delay: 0.22s; }
\t#itemIndex .item:nth-child(5)  { animation-delay: 0.28s; }
\t#itemIndex .item:nth-child(6)  { animation-delay: 0.33s; }
\t#itemIndex .item:nth-child(n+7){ animation-delay: 0.37s; }

\t#itemIndex .itemImg {
\t\taspect-ratio: 3/4; overflow: hidden; margin-bottom: 12px;
\t}
\t#itemIndex .itemImg img {
\t\twidth: 100%; height: 100%; object-fit: cover;
\t\ttransition: transform 0.65s var(--ease);
\t}
\t#itemIndex .item:hover .itemImg img { transform: scale(1.05); }
\t#itemIndex .itemTitle h2 {
\t\tfont-family: var(--sans) !important;
\t\tfont-size: clamp(11px, 2.8vw, 13px); font-weight: 400;
\t\tletter-spacing: 0.04em; margin: 6px 0 4px;
\t\tcolor: var(--ink); line-height: 1.55;
\t}
\t#itemIndex .itemPrice {
\t\tfont-size: clamp(11px, 2.8vw, 13px);
\t\tcolor: var(--amber); letter-spacing: 0.04em;
\t}

\t/* ===== ブログ（Journal） ===== */
\t#journal {
\t\tbackground: var(--bg2); padding: clamp(48px, 9vw, 80px) 0;
\t\tmargin: clamp(36px, 7vw, 64px) 0; position: relative; overflow: hidden;
\t}
\t/* 背景ウォーターマーク */
\t#journal::after {
\t\tcontent: '金木犀';
\t\tposition: absolute; right: -0.05em; bottom: 0.1em;
\t\tfont-family: var(--serif);
\t\tfont-size: clamp(72px, 18vw, 160px);
\t\tcolor: rgba(184, 108, 26, 0.06);
\t\tpointer-events: none; white-space: nowrap;
\t\tletter-spacing: -0.02em;
\t}
\t#journal .sec-ttl { margin-top: 0; }
\t#journal #rss ul {
\t\tdisplay: flex; gap: 20px;
\t\toverflow-x: auto; padding: 16px 24px 8px;
\t\t-webkit-overflow-scrolling: touch; margin: 0; list-style: none;
\t\tscrollbar-width: none;
\t}
\t#journal #rss ul::-webkit-scrollbar { display: none; }
\t#journal #rss ul li {
\t\tflex: 0 0 clamp(240px, 72vw, 300px); flex-shrink: 0;
\t\tmin-width: 0; background: #fff;
\t\tbox-shadow: 0 2px 16px rgba(22,18,13,0.07);
\t}
\t#journal .journal-img { width: 100%; aspect-ratio: 4/3; overflow: hidden; }
\t#journal .journal-img img {
\t\twidth: 100%; height: 100%; object-fit: cover;
\t\ttransition: transform 0.65s var(--ease);
\t}
\t#journal .journal-img:hover img { transform: scale(1.05); }
\t#journal .jt {
\t\tfont-family: var(--serif) !important;
\t\tfont-size: clamp(0.88rem, 2.8vw, 1rem);
\t\tletter-spacing: 0.1em; padding: 16px 16px 4px;
\t\tcolor: var(--ink); line-height: 1.7;
\t}
\t#journal .date {
\t\tpadding: 0 16px 16px; font-size: 11px;
\t\tcolor: #aaa; letter-spacing: 0.05em;
\t}

\t/* ===== カテゴリーバナー ===== */
\t.catBnr { margin: clamp(36px, 7vw, 64px) 0; padding: 32px 0; }
\t.catBnr ul {
\t\tdisplay: flex; flex-wrap: wrap; justify-content: center;
\t\tgap: clamp(16px, 3vw, 32px);
\t\tlist-style: none; padding: 0 16px;
\t\tmax-width: 1200px; margin: 0 auto;
\t}
\t.catBnr ul li {
\t\tflex: 0 0 calc(50% - 10px); max-width: 360px;
\t\tmin-width: 0; overflow: hidden;
\t}
\t.catBnr ul li a { display: block; text-decoration: none; }
\t.catBnr ul li img {
\t\twidth: 100%; height: auto;
\t\ttransition: transform 0.55s var(--ease), opacity 0.35s;
\t}
\t.catBnr ul li:hover img { transform: scale(1.04); opacity: 0.88; }

\t/* ===== サイドバー ===== */
\t.sidebar  { background: var(--bg) !important; }
\t.sideTitle {
\t\tfont-family: var(--serif) !important;
\t\tletter-spacing: 0.15em; color: var(--ink) !important;
\t}

\t/* ===== フッター ===== */
\t#mainFooter {
\t\tbackground: var(--bg2); margin-top: clamp(48px, 9vw, 80px);
\t\tpadding: clamp(28px, 5vw, 48px) 0;
\t\tborder-top: 1px solid var(--border);
\t}

\t/* ===== タッチ最適化 ===== */
\t#itemIndex .item a,
\t#pickup .item-btn a,
\t.catBnr ul li a { -webkit-tap-highlight-color: transparent; }
\t#pickup .item-btn a { min-height: 44px; }

\t/* ===== レスポンシブ ===== */
\t@media (min-width: 520px) {
\t\t#itemIndex #mainContent {
\t\t\tgrid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
\t\t\tgap: 44px 24px; padding: 0 20px;
\t\t}
\t\t.catBnr ul li { flex: 0 0 calc(33.333% - 22px); }
\t}
\t@media (min-width: 1024px) {
\t\t#itemIndex #mainContent {
\t\t\tgrid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
\t\t\tgap: 56px 36px;
\t\t}
\t\t#pickup .pickSlide { gap: 68px; }
\t\t.catBnr ul li { flex: 0 0 calc(33.333% - 22px); }
\t\t#journal #rss ul li { flex: 0 0 300px; }
\t}
\t@media (max-width: 768px) {
\t\t#pickup .pickSlide {
\t\t\tflex-direction: column; gap: 24px; padding: 20px 16px;
\t\t}
\t\t#pickup .col-left,
\t\t#pickup .col-right { flex: 0 0 100%; width: 100%; }
\t}

\t/* ===== 遷移オーバーレイ（金木犀の花びら） ===== */
\t.km-overlay {
\t\tposition: fixed; inset: 0; z-index: 99999;
\t\tpointer-events: none;
\t\tvisibility: hidden; opacity: 0;
\t\ttransition: opacity 0.28s var(--ease), visibility 0.28s var(--ease);
\t}
\t.km-overlay.is-active {
\t\tvisibility: visible; opacity: 1; pointer-events: auto;
\t}
\t.km-overlay-bg {
\t\tposition: absolute; inset: 0;
\t\tbackground: linear-gradient(150deg, #f8f3e8 0%, #f0e0c0 60%, #e8d4a8 100%);
\t\ttransform: scaleX(0); transform-origin: right center;
\t\ttransition: transform 0.38s cubic-bezier(0.77, 0, 0.18, 1);
\t}
\t.km-overlay.is-active .km-overlay-bg { transform: scaleX(1); }
\t.km-overlay-petals { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
\t.km-petal {
\t\tposition: absolute; width: 7px; height: 12px;
\t\tbackground: linear-gradient(140deg, #e0a040 0%, #c07020 55%, #a05818 100%);
\t\tborder-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
\t\topacity: 0.88; box-shadow: 0 0 6px rgba(192,112,32,0.3);
\t}
\t.km-petal:nth-child(1) { animation: km-fall1 3.0s ease-in-out infinite; left:18%; top:-4%; }
\t.km-petal:nth-child(2) { animation: km-fall1 3.0s ease-in-out infinite 1.1s; left:78%; top:-7%; width:6px;height:10px; }
\t.km-petal:nth-child(3) { animation: km-drift 3.4s linear infinite; left:-4%; top:28%; }
\t.km-petal:nth-child(4) { animation: km-drift 3.4s linear infinite 1.7s; left:-4%; top:64%; width:6px;height:11px; }
\t.km-petal:nth-child(5) { animation: km-rise 2.8s ease-in-out infinite; left:46%; bottom:-4%; }
\t.km-petal:nth-child(6) { animation: km-rise 2.8s ease-in-out infinite 0.9s; left:57%; bottom:-4%; width:6px;height:10px; }
\t.km-petal:nth-child(7) { animation: km-sway 3.6s ease-in-out infinite; left:64%; top:-8%; }
\t.km-petal:nth-child(8) { animation: km-sway 3.6s ease-in-out infinite 2.0s; left:34%; top:-8%; width:6px;height:11px; }
\t@keyframes km-fall1 {
\t\t0%   { transform: translateY(0) translateX(0)    rotate(0deg);   opacity:.9; }
\t\t50%  { transform: translateY(36vh) translateX(16px) rotate(190deg); opacity:.8; }
\t\t100% { transform: translateY(72vh) translateX(-12px) rotate(380deg); opacity:.65; }
\t}
\t@keyframes km-drift {
\t\t0%   { transform: translateX(0) translateY(0)    rotate(0deg); }
\t\t100% { transform: translateX(108vw) translateY(22px) rotate(250deg); }
\t}
\t@keyframes km-rise {
\t\t0%,100% { transform: translateY(0) rotate(0deg); opacity:.82; }
\t\t50%     { transform: translateY(-40vh) rotate(360deg); opacity:1; }
\t}
\t@keyframes km-sway {
\t\t0%,100% { transform: translateY(0) translateX(0)    rotate(-8deg); }
\t\t25%     { transform: translateY(26vh) translateX(24px)  rotate(80deg); }
\t\t50%     { transform: translateY(52vh) translateX(-18px) rotate(170deg); }
\t\t75%     { transform: translateY(76vh) translateX(14px)  rotate(256deg); }
\t}
\t/* 中央ロゴ */
\t.km-overlay-logo {
\t\tposition: absolute; top: 50%; left: 50%;
\t\ttransform: translate(-50%, -50%);
\t\tfont-family: var(--serif); font-size: clamp(24px, 7vw, 52px);
\t\tletter-spacing: 0.38em; color: rgba(184, 108, 26, 0.30);
\t\twhite-space: nowrap; pointer-events: none;
\t\topacity: 0; transition: opacity 0.25s ease 0.12s;
\t}
\t.km-overlay.is-active .km-overlay-logo { opacity: 1; }

\t</style>
\t<!-- クロード編集用（HTML編集）ここまで -->"""

# =========================================================
# 新しいオーバーレイ HTML（セクション2）
# =========================================================
NEW_OVERLAY = """\t<!-- クロード編集用：商品ページ遷移時のローディングエフェクト（金木犀の花びらが舞う） -->
\t<div id="km-overlay" class="km-overlay" aria-hidden="true">
\t\t<div class="km-overlay-bg"></div>
\t\t<div class="km-overlay-petals" aria-hidden="true">
\t\t\t<span class="km-petal"></span>
\t\t\t<span class="km-petal"></span>
\t\t\t<span class="km-petal"></span>
\t\t\t<span class="km-petal"></span>
\t\t\t<span class="km-petal"></span>
\t\t\t<span class="km-petal"></span>
\t\t\t<span class="km-petal"></span>
\t\t\t<span class="km-petal"></span>
\t\t</div>
\t\t<div class="km-overlay-logo" aria-hidden="true">金木犀</div>
\t</div>
\t<!-- /クロード編集用 -->"""

# =========================================================
# 新しい JS（セクション3）
# 修正ポイント:
#   ① items は CSS @keyframes で表示 → JS fadeIn 不要（ナビゲーション保証）
#   ② 遷移後のアイテムページでオーバーレイを「再表示しない」→「飛べない」問題解消
#   ③ ヘッダーのスクロール影
# =========================================================
NEW_JS = """\t<!-- クロード編集用：商品ページ遷移エフェクト用JS -->
\t<script type="text/javascript">
\t(function () {
\t\t'use strict';

\t\t/* ===== 遷移オーバーレイ ===== */
\t\tvar ov = document.getElementById('km-overlay');

\t\tfunction isItemUrl(href) {
\t\t\ttry {
\t\t\t\tvar a = document.createElement('a');
\t\t\t\ta.href = href;
\t\t\t\treturn a.origin === location.origin && /\\/items\\//.test(a.pathname);
\t\t\t} catch (e) { return false; }
\t\t}

\t\tif (ov) {
\t\t\t/* クリック時のみオーバーレイ表示 → ナビゲート
\t\t\t   ※ アイテムページ到達後はオーバーレイを出さない（「飛べない」問題の解消） */
\t\t\tdocument.body.addEventListener('click', function (e) {
\t\t\t\tvar a = e.target.closest('a[href]');
\t\t\t\tif (!a || a.target === '_blank') return;
\t\t\t\tif (!isItemUrl(a.href)) return;
\t\t\t\te.preventDefault();
\t\t\t\tvar dest = a.href;
\t\t\t\tov.setAttribute('aria-hidden', 'false');
\t\t\t\tov.classList.add('is-active');
\t\t\t\tsetTimeout(function () { location.href = dest; }, 400);
\t\t\t}, true);
\t\t}

\t\t/* ===== ヘッダーのスクロール影 ===== */
\t\t(function () {
\t\t\tvar h = document.getElementById('mainHeader');
\t\t\tif (!h) return;
\t\t\tvar cls = 'km-scrolled';
\t\t\twindow.addEventListener('scroll', function () {
\t\t\t\th.classList.toggle(cls, window.scrollY > 40);
\t\t\t}, { passive: true });
\t\t}());

\t\t/* ===== 商品カードホバー（PCのみ軽量 tilt） ===== */
\t\t(function () {
\t\t\tif (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
\t\t\tdocument.querySelectorAll('#itemIndex .item').forEach(function (card) {
\t\t\t\tcard.addEventListener('mousemove', function (e) {
\t\t\t\t\tvar r = card.getBoundingClientRect();
\t\t\t\t\tvar x = (e.clientX - r.left)  / r.width  - 0.5;
\t\t\t\t\tvar y = (e.clientY - r.top)   / r.height - 0.5;
\t\t\t\t\tcard.style.transform  = 'perspective(700px) rotateY(' + (x * 5) + 'deg) rotateX(' + (-y * 5) + 'deg) translateY(-2px)';
\t\t\t\t\tcard.style.transition = 'transform 0.08s linear';
\t\t\t\t}, { passive: true });
\t\t\t\tcard.addEventListener('mouseleave', function () {
\t\t\t\t\tcard.style.transform  = '';
\t\t\t\t\tcard.style.transition = 'transform 0.45s cubic-bezier(0.25,0.1,0.25,1)';
\t\t\t\t});
\t\t\t});
\t\t}());

\t}());
\t</script>
\t<!-- /クロード編集用 -->"""


def replace_section(src, start, end, new_content):
    pat = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.DOTALL)
    result, n = pat.subn(new_content, src, count=1)
    if n == 0:
        print(f"[ERROR] マーカーが見つかりません: {start[:50]!r}")
        sys.exit(1)
    print(f"[OK] 置換: {start[:55]!r}")
    return result


def main():
    src = TEMPLATE.read_text(encoding='utf-8')
    print(f"読み込み: {len(src):,} 文字")

    src = replace_section(src,
        '<!-- クロード編集用（HTML編集）ここから',
        '<!-- クロード編集用（HTML編集）ここまで -->',
        NEW_CSS)

    src = replace_section(src,
        '<!-- クロード編集用：商品ページ遷移時のローディングエフェクト（金木犀の花びらが舞う） -->',
        '<!-- /クロード編集用 -->',
        NEW_OVERLAY)

    src = replace_section(src,
        '<!-- クロード編集用：商品ページ遷移エフェクト用JS -->',
        '<!-- /クロード編集用 -->',
        NEW_JS)

    TEMPLATE.write_text(src, encoding='utf-8')
    print(f"書き込み完了: {len(src):,} 文字")


if __name__ == '__main__':
    main()
