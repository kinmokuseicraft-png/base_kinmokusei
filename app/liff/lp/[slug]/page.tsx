"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Image from "next/image";
import Link from "next/link";

type WoodData = {
  slug: string;
  wood_name_ja: string;
  wood_name_en?: string;
  catch_copy: string;
  classification?: string;
  family?: string;
  origin_countries?: string[];
  specific_gravity?: number;
  hardness?: string;
  red_list?: string;
  color_description?: string;
  grain_description?: string;
  sections?: { h3: string; subsections: { h4: string; paragraphs: string[] }[] }[];
  hero_image_url: string | null;
  custom_catch_copy: string | null;
  custom_story: string | null;
  search_keyword: string | null;
  is_published: boolean;
};

type Product = {
  item_id: number;
  title: string;
  price: number;
  stock: number;
  images?: { img_300?: string; origin?: string }[];
  detail?: string;
};

export default function WoodLpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [wood, setWood] = useState<WoodData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/lp/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data: WoodData | null) => {
        if (!data) return;
        setWood(data);
        // 関連商品を取得
        const keyword = data.search_keyword || data.wood_name_ja;
        return fetch(`/api/base/products?q=${encodeURIComponent(keyword)}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d: { products?: Product[] }) => setProducts(d.products?.slice(0, 6) ?? []));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={loadingStyle}>読み込み中…</div>;
  if (notFound || !wood) return <div style={loadingStyle}>ページが見つかりません</div>;

  const displayCatchCopy = wood.custom_catch_copy || wood.catch_copy;
  const baseShopUrl = `https://kinmokusei.base.shop`;

  return (
    <div style={{ background: "#0a0a0a", color: "#f0ebe3", minHeight: "100vh", fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', serif" }}>

      {/* ===== HERO ===== */}
      <div style={{ position: "relative", height: "70vh", minHeight: 400, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        {wood.hero_image_url ? (
          <Image
            src={wood.hero_image_url}
            alt={wood.wood_name_ja}
            fill
            quality={95}
            priority
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a1a1a 0%, #2d2517 50%, #0a0a0a 100%)" }} />
        )}
        {/* グラデーションオーバーレイ */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.3) 60%, transparent 100%)" }} />
        {/* テキスト */}
        <div style={{ position: "relative", zIndex: 1, padding: "2rem 1.5rem 2.5rem", width: "100%" }}>
          <p style={{ fontSize: "0.75rem", letterSpacing: "0.3em", color: "#c8b89a", marginBottom: "0.5rem", textTransform: "uppercase" }}>
            木軸ペン工房 金杢犀
          </p>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "0.05em", lineHeight: 1.2, marginBottom: "0.5rem" }}>
            {wood.wood_name_ja}
          </h1>
          {wood.wood_name_en && (
            <p style={{ fontSize: "0.85rem", color: "#c8b89a", letterSpacing: "0.15em", marginBottom: "0.75rem" }}>
              {wood.wood_name_en}
            </p>
          )}
          <p style={{ fontSize: "1.1rem", color: "#e8ddd0", fontStyle: "italic", letterSpacing: "0.05em" }}>
            〝{displayCatchCopy}〟
          </p>
        </div>
      </div>

      {/* ===== 基本データ ===== */}
      <div style={{ padding: "2rem 1.5rem", borderBottom: "1px solid #2a2a2a" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {[
            { label: "分類", value: wood.classification },
            { label: "科", value: wood.family },
            { label: "硬度", value: wood.hardness },
            { label: "比重", value: wood.specific_gravity ? `${wood.specific_gravity}` : null },
            { label: "産地", value: wood.origin_countries?.join("・") },
            { label: "保護", value: wood.red_list },
          ].filter((item) => item.value).map((item) => (
            <div key={item.label} style={{ borderLeft: "2px solid #c8b89a", paddingLeft: "0.75rem" }}>
              <div style={{ fontSize: "0.65rem", color: "#888", letterSpacing: "0.2em", marginBottom: "0.2rem", textTransform: "uppercase" }}>{item.label}</div>
              <div style={{ fontSize: "0.9rem" }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 色・杢目の描写 ===== */}
      {(wood.color_description || wood.grain_description) && (
        <div style={{ padding: "2rem 1.5rem", borderBottom: "1px solid #2a2a2a" }}>
          <h2 style={sectionTitleStyle}>杢目と色合い</h2>
          {wood.color_description && <p style={bodyTextStyle}>{wood.color_description}</p>}
          {wood.grain_description && <p style={{ ...bodyTextStyle, marginTop: "1rem" }}>{wood.grain_description}</p>}
        </div>
      )}

      {/* ===== ストーリーセクション ===== */}
      {wood.sections && wood.sections.length > 0 && (
        <div style={{ padding: "2rem 1.5rem", borderBottom: "1px solid #2a2a2a" }}>
          {wood.sections.map((section, si) => (
            <div key={si} style={{ marginBottom: "2rem" }}>
              <h2 style={sectionTitleStyle}>{section.h3}</h2>
              {section.subsections.map((sub, ssi) => (
                <div key={ssi} style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#c8b89a", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
                    {sub.h4}
                  </h3>
                  {sub.paragraphs.map((p, pi) => (
                    <p key={pi} style={{ ...bodyTextStyle, marginTop: pi > 0 ? "0.75rem" : 0 }}>{p}</p>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ===== 職人の手仕事（固定） ===== */}
      <div style={{ padding: "2rem 1.5rem", borderBottom: "1px solid #2a2a2a", background: "#0f0f0f" }}>
        <h2 style={sectionTitleStyle}>職人の手仕事</h2>
        <p style={bodyTextStyle}>
          旋盤で丁寧に削り出し、木の個性を最大限に引き出します。仕上げには素材の特性に合わせた植物性オイルや拭き漆を施し、手に馴染むなめらかな肌触りに整えます。
        </p>
        <p style={{ ...bodyTextStyle, marginTop: "0.75rem" }}>
          一点ずつ手作業のため、同じ樹種であっても杢目の表情はすべて異なります。世界にひとつだけの一本です。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "1.5rem" }}>
          {["旋盤加工", "研磨仕上げ", "オイル仕上げ"].map((step, i) => (
            <div key={i} style={{ textAlign: "center", padding: "1rem 0.5rem", border: "1px solid #2a2a2a", borderRadius: 4 }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{"⚙️✨🌿"[i * 2]}{"⚙️✨🌿"[i * 2 + 1]}</div>
              <div style={{ fontSize: "0.75rem", color: "#c8b89a" }}>{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== この樹種のペン ===== */}
      {products.length > 0 && (
        <div style={{ padding: "2rem 1.5rem", borderBottom: "1px solid #2a2a2a" }}>
          <h2 style={sectionTitleStyle}>この樹種のペン</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {products.map((p) => {
              const imgUrl = p.images?.[0]?.img_300 ?? p.images?.[0]?.origin ?? null;
              const isLowStock = p.stock > 0 && p.stock <= 2;
              const isSoldOut = p.stock === 0;
              return (
                <a
                  key={p.item_id}
                  href={`${baseShopUrl}/items/${p.item_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    gap: "1rem",
                    background: "#141414",
                    border: "1px solid #2a2a2a",
                    padding: "1rem",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={p.title}
                      width={90}
                      height={90}
                      quality={90}
                      style={{ objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 90, height: 90, background: "#222", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", lineHeight: 1.4 }}>{p.title}</div>
                    <div style={{ fontSize: "1rem", color: "#c8b89a", fontWeight: 700, marginBottom: "0.35rem" }}>
                      ¥{p.price.toLocaleString()}
                    </div>
                    {isSoldOut ? (
                      <span style={badgeStyle("#555")}>売り切れ</span>
                    ) : isLowStock ? (
                      <span style={badgeStyle("#8b4513")}>残り{p.stock}点</span>
                    ) : (
                      <span style={badgeStyle("#1a3a1a")}>一点物</span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== CTA ===== */}
      <div style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", color: "#888", letterSpacing: "0.15em", marginBottom: "1rem" }}>
          木軸ペン工房 金杢犀
        </p>
        <a
          href={baseShopUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            padding: "1rem",
            background: "#c8b89a",
            color: "#0a0a0a",
            fontWeight: 700,
            fontSize: "0.95rem",
            letterSpacing: "0.1em",
            textDecoration: "none",
            marginBottom: "1rem",
          }}
        >
          ショップで全商品を見る →
        </a>
        <p style={{ fontSize: "0.75rem", color: "#555" }}>
          LINEでのご質問・お問い合わせもお気軽にどうぞ
        </p>
      </div>
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0a0a",
  color: "#888",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "sans-serif",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  letterSpacing: "0.3em",
  color: "#c8b89a",
  textTransform: "uppercase",
  marginBottom: "1rem",
  borderBottom: "1px solid #2a2a2a",
  paddingBottom: "0.5rem",
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  lineHeight: 2,
  color: "#c8c0b5",
};

function badgeStyle(bg: string): React.CSSProperties {
  return {
    display: "inline-block",
    fontSize: "0.7rem",
    padding: "2px 8px",
    background: bg,
    color: "#f0ebe3",
    letterSpacing: "0.05em",
  };
}
