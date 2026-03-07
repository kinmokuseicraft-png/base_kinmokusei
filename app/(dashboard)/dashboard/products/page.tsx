import Image from "next/image";
import { getBaseProducts } from "@/lib/base_api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductsPage() {
  const products = await getBaseProducts({ limit: 50 });

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        商品管理・BASE連携
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
        BASEで取得した商品（木軸ペンなど）の一覧です。画像・価格・在庫を確認できます。
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {products.map((p) => (
          <article
            key={p.item_id}
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-md)",
              overflow: "hidden",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1",
                background: "var(--color-bg)",
              }}
            >
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 280px"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-text-muted)",
                    fontSize: "0.875rem",
                  }}
                >
                  画像なし
                </div>
              )}
              {p.stock <= 2 && (
                <span
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    background: p.stock === 0 ? "#dc3545" : "#fd7e14",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {p.stock === 0 ? "在庫切れ" : `残り${p.stock}`}
                </span>
              )}
            </div>
            <div style={{ padding: "1rem" }}>
              <h2
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                } as React.CSSProperties}
              >
                {p.title}
              </h2>
              <p
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                ¥{p.price.toLocaleString()}
              </p>
              {p.proper_price != null && p.proper_price > p.price && (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-muted)",
                    textDecoration: "line-through",
                  }}
                >
                  ¥{p.proper_price.toLocaleString()}
                </p>
              )}
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
                在庫: {p.stock} / ID: {p.item_id}
              </p>
              {p.item_url && (
                <a
                  href={p.item_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: "0.75rem",
                    fontSize: "0.85rem",
                    color: "var(--color-primary)",
                    fontWeight: 500,
                  }}
                >
                  BASEで見る →
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      {products.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "2rem" }}>
          商品がありません。BASE_ACCESS_TOKEN を設定すると API から取得します。
        </p>
      )}
    </div>
  );
}
