"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import Image from "next/image";

type Profile = {
  displayName: string;
  pictureUrl?: string;
  userId: string;
};

type Product = {
  item_id: number;
  title: string;
  price: number;
  image_url: string | null;
  item_url?: string;
  stock: number;
};

export default function LiffPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!liffId) {
        setError("LIFF ID が設定されていません");
        setLoading(false);
        return;
      }
      try {
        await liff.init({ liffId });
        if (cancelled) return;

        // 未ログインなら email スコープも含めてログイン
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const p = await liff.getProfile();
        const userId = p.userId;
        setProfile({
          displayName: p.displayName ?? "",
          pictureUrl: p.pictureUrl,
          userId,
        });

        // ID Token からメールアドレスを取得して line_users に保存
        try {
          const idToken = liff.getDecodedIDToken();
          const email = idToken?.email as string | undefined;
          if (email) {
            await fetch('/api/users/link-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ line_user_id: userId, email }),
            });
          }
        } catch {
          // email 取得失敗は無視（未同意など）
        }

        // 商品一覧取得（同一オリジンで API を叩く）
        const res = await fetch("/api/products");
        if (res.ok && !cancelled) {
          const list = (await res.json()) as Product[];
          setProducts(list);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "LIFF の初期化に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
        読み込み中…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#c00" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: "480px", margin: "0 auto" }}>
      {profile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            padding: "1rem",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
          }}
        >
          {profile.pictureUrl ? (
            <Image
              src={profile.pictureUrl}
              alt=""
              width={48}
              height={48}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--color-border)",
              }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{profile.displayName}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              LINE でログイン中
            </div>
          </div>
        </div>
      )}

      <h1 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
        金杢犀 — 商品一覧
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {products.map((p) => (
          <a
            key={p.item_id}
            href={p.item_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              gap: "1rem",
              padding: "1rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow)",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 80,
                height: 80,
                flexShrink: 0,
                background: "var(--color-bg)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
              }}
            >
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt=""
                  fill
                  sizes="80px"
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
                    fontSize: "0.7rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  画像なし
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.title}
              </div>
              <div style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                ¥{p.price.toLocaleString()}
              </div>
              {p.stock <= 2 && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: p.stock === 0 ? "#c00" : "var(--color-text-muted)",
                  }}
                >
                  {p.stock === 0 ? "在庫切れ" : `残り${p.stock}点`}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      {products.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
          商品がありません
        </p>
      )}
    </div>
  );
}
