"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { RefreshCw, Save, ExternalLink, Copy, CheckCircle } from "lucide-react";

type Product = {
  item_id: number;
  title: string;
  price: number;
  stock: number;
  image_url: string | null;
  item_url?: string;
  line_display_image_url: string | null;
};

export default function BasePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [urlInputs, setUrlInputs] = useState<Record<number, string>>({});
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authUrlError, setAuthUrlError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const fetchProducts = (forceRefresh = false) => {
    setLoading(true);
    const url = forceRefresh ? "/api/base/products?refresh=1" : "/api/base/products";
    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { products?: Product[] }) => {
        const list = Array.isArray(data?.products) ? data.products : [];
        setProducts(list);
        const next: Record<number, string> = {};
        list.forEach((p) => {
          next[p.item_id] = p.line_display_image_url ?? "";
        });
        setUrlInputs(next);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  const fetchAuthStatus = () => {
    fetch("/api/base/oauth/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { authenticated?: boolean }) => setAuthenticated(!!data.authenticated))
      .catch(() => setAuthenticated(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const auth = params?.get("auth");
    if (auth === "success") {
      setAuthMessage("BASE認証が完了しました。");
      fetchAuthStatus();
      fetchProducts();
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/dashboard/base");
      }
    } else if (auth === "denied") {
      setAuthMessage("BASE連携が拒否されました。");
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/dashboard/base");
      }
    } else if (auth === "error") {
      setAuthMessage("トークン取得または保存に失敗しました。");
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/dashboard/base");
      }
    }
  }, []);

  const saveLineImage = (itemId: number) => {
    const url = (urlInputs[itemId] ?? "").trim();
    setSavingId(itemId);
    fetch(`/api/base/products/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_display_image_url: url || null }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setProducts((prev) =>
            prev.map((p) => (p.item_id === itemId ? { ...p, line_display_image_url: data.line_display_image_url } : p))
          );
        } else {
          alert(data.error ?? "保存に失敗しました");
        }
      })
      .catch(() => alert("保存に失敗しました"))
      .finally(() => setSavingId(null));
  };

  const issueAuthUrl = () => {
    setAuthUrlError(null);
    setAuthUrl(null);
    fetch("/api/base/oauth/authorize-url", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { url?: string; error?: string }) => {
        if (data.error) {
          setAuthUrlError(data.error);
          return;
        }
        if (data.url) setAuthUrl(data.url);
      })
      .catch(() => setAuthUrlError("認可URLの取得に失敗しました"));
  };

  const copyAuthUrl = () => {
    if (!authUrl) return;
    navigator.clipboard.writeText(authUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)", fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
        BASE連携設定
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        BASEで取得した商品一覧です。各商品に「LINEで表示する専用画像」のURLを設定すると、注文時メッセージなどで利用されます。
      </p>

      <section style={{ marginBottom: "var(--space-6)", padding: "var(--space-4)", border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-text)" }}>BASE認証（OAuth2）</h2>
        {authenticated === true && (
          <p style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "0.9rem", fontWeight: 600, color: "var(--color-line)", marginBottom: "var(--space-3)" }}>
            <CheckCircle size={20} strokeWidth={1.5} />
            認証済み
          </p>
        )}
        {authMessage && (
          <p style={{ fontSize: "0.85rem", marginBottom: "var(--space-2)", color: authMessage.includes("完了") ? "var(--color-line)" : "var(--color-text-muted)" }}>
            {authMessage}
          </p>
        )}
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
          アクセストークンを取得するには、以下の認可URLでBASEにログインし、連携を許可してください。コールバックURLは BASE の開発者設定に登録してください。
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
          <button
            type="button"
            onClick={issueAuthUrl}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border-strong)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontWeight: 500,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <ExternalLink size={16} strokeWidth={1.5} />
            認可URLを発行
          </button>
          {authUrl && (
            <>
              <button
                type="button"
                onClick={copyAuthUrl}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  padding: "var(--space-2) var(--space-3)",
                  border: "1px solid var(--color-border-strong)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <Copy size={14} strokeWidth={1.5} />
                {copied ? "コピーしました" : "URLをコピー"}
              </button>
              <a
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-line)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  textDecoration: "none",
                }}
              >
                BASEで認証を開く
              </a>
            </>
          )}
        </div>
        {authUrlError && (
          <p style={{ marginTop: "var(--space-2)", fontSize: "0.85rem", color: "var(--color-error, #c00)" }}>
            {authUrlError}
          </p>
        )}
        {authUrl && (
          <p style={{ marginTop: "var(--space-2)", fontSize: "0.75rem", color: "var(--color-text-muted)", wordBreak: "break-all" }}>
            {authUrl}
          </p>
        )}
      </section>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          onClick={() => fetchProducts(true)}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--color-border-strong)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontWeight: 500,
            fontSize: "0.9rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={16} strokeWidth={1.5} />
          {loading ? "取得中…" : "一覧を更新"}
        </button>
      </div>

      {products.length === 0 && !loading && (
        <p style={{ color: "var(--color-text-muted)", padding: "var(--space-6)", textAlign: "center" }}>
          {authenticated
            ? "商品が0件です。「一覧を更新」で BASE から再取得します。BASEショップに商品が登録されているか確認してください。"
            : "BASE認証を行い、認可後に「一覧を更新」で商品を取得してください。"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {products.map((p) => (
          <div
            key={p.item_id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <div style={{ flex: "0 0 auto" }}>
              <div style={{ width: 80, height: 80, position: "relative", background: "var(--color-surface-alt)" }}>
                {p.line_display_image_url ? (
                  <Image
                    src={p.line_display_image_url}
                    alt={p.title}
                    fill
                    sizes="80px"
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                ) : p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt={p.title}
                    fill
                    sizes="80px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                    画像なし
                  </div>
                )}
              </div>
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "var(--space-1)", color: "var(--color-text)" }}>
                {p.title}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                ¥{p.price.toLocaleString()} · 在庫 {p.stock}
              </div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
                LINEで表示する専用画像URL
              </label>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="url"
                  value={urlInputs[p.item_id] ?? ""}
                  onChange={(e) => setUrlInputs((prev) => ({ ...prev, [p.item_id]: e.target.value }))}
                  placeholder="https://..."
                  style={{
                    flex: "1 1 200px",
                    minWidth: 0,
                    padding: "var(--space-2) var(--space-3)",
                    border: "1px solid var(--color-border-strong)",
                    fontSize: "0.85rem",
                  }}
                />
                <button
                  type="button"
                  onClick={() => saveLineImage(p.item_id)}
                  disabled={savingId === p.item_id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-line)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: savingId === p.item_id ? "not-allowed" : "pointer",
                  }}
                >
                  <Save size={14} strokeWidth={1.5} />
                  {savingId === p.item_id ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
