"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, ExternalLink } from "lucide-react";
import type { SnsProductOption, TripleCopy, SnsCategory } from "@/src/features/sns-automation/types";
import { SNS_CATEGORIES } from "@/src/features/sns-automation/types";

type Product = {
  item_id: number;
  title: string;
  price: number;
  image_url: string | null;
  item_url?: string;
  line_display_image_url?: string | null;
};

export default function SnsHubPage() {
  const [memo, setMemo] = useState("");
  const [product, setProduct] = useState<SnsProductOption | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productList, setProductList] = useState<Product[]>([]);
  const [productListLoading, setProductListLoading] = useState(false);
  const [includeUrl, setIncludeUrl] = useState({ x: false, instagram: true, line: true });
  const [uploadedImage, setUploadedImage] = useState<{ file: File; dataUrl: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [triple, setTriple] = useState<TripleCopy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void; start: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: Event) => void) | null; onend: (() => void) | null; onerror: (() => void) | null } | null>(null);
  const [category, setCategory] = useState<SnsCategory>("news");
  /** 編集中のプラットフォーム（微調整でテキスト→textarea に切り替え） */
  const [editingPlatform, setEditingPlatform] = useState<"x" | "instagram" | "line" | null>(null);
  /** 表示・保存用の文案（生成結果＋手動編集を反映）。保存時はこちらを送る */
  const [editedCopy, setEditedCopy] = useState<TripleCopy | null>(null);

  const searchProducts = useCallback((q: string) => {
    setProductSearch(q);
    if (!q.trim()) {
      setProductList([]);
      return;
    }
    setProductListLoading(true);
    fetch(`/api/base/products?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { products?: Product[] }) => setProductList(Array.isArray(data?.products) ? data.products : []))
      .catch(() => setProductList([]))
      .finally(() => setProductListLoading(false));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setUploadedImage({ file, dataUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setUploadedImage({ file, dataUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  }, []);

  /** 生成結果が変わったら編集用コピーを同期（編集済みは上書きしない場合は不要だが、新規生成のたびに同期する） */
  useEffect(() => {
    if (triple) setEditedCopy({ ...triple });
  }, [triple]);

  const handleSave = useCallback((platform: "instagram" | "line") => {
    const copy = editedCopy ?? triple;
    if (!copy) return;
    setSaving((prev) => ({ ...prev, [platform]: true }));
    setSaved((prev) => ({ ...prev, [platform]: false }));
    setError(null);
    fetch("/api/sns-hub/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product?.item_id ?? null,
        original_memo: memo || null,
        image_url: uploadedImage?.dataUrl ?? null,
        x_copy: copy.twitter,
        insta_copy: copy.instagram,
        line_copy: copy.lineNews,
        status: "draft",
        platform,
      }),
    })
      .then((res) => res.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (data.ok) {
          setSaved((prev) => ({ ...prev, [platform]: true }));
          setToast(`${platform === "instagram" ? "Instagram" : "LINE"} に保存しました`);
        } else throw new Error(data.error ?? "保存に失敗しました");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "保存に失敗しました"))
      .finally(() => setSaving((prev) => ({ ...prev, [platform]: false })));
  }, [editedCopy, triple, product, memo, uploadedImage]);

  useEffect(() => {
    if (toast == null) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleVoice = useCallback(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined" &&
      ((window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition);
    if (!SpeechRecognitionAPI) {
      setToast("お使いのブラウザでは音声入力に対応していません");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new (SpeechRecognitionAPI as new () => { continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: Event) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void; abort: () => void })();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "ja-JP";
    rec.onresult = (e: Event) => {
      const event = e as Event & { resultIndex: number; results: { isFinal: boolean; [i: number]: { transcript: string } }[] };
      // 今回変化した結果だけを扱う（resultIndex）。全 results をループすると同一文が何度も追記されてハウリングのように重なる
      const idx = event.resultIndex;
      const result = event.results[idx];
      if (!result?.isFinal) return;
      const text = result[0].transcript?.trim();
      if (text) setMemo((prev) => (prev ? prev + " " + text : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const handleGenerate = () => {
    setError(null);
    setSaved({});
    setGenerating(true);
    fetch("/api/sns-hub/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memo,
        category,
        product: product ?? null,
        imageUrl: uploadedImage?.dataUrl ?? null,
        includeUrl,
      }),
    })
      .then((res) => res.json())
      .then((data: TripleCopy | { error?: string }) => {
        if ("error" in data && data.error) throw new Error(data.error);
        setTriple(data as TripleCopy);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "生成に失敗しました"))
      .finally(() => setGenerating(false));
  };

  const panelStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 280,
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    padding: "var(--space-3)",
    background: "var(--color-bg)",
  };

  /** 表示・保存に使う文案（生成結果＋手動編集） */
  const displayCopy = editedCopy ?? triple;

  /** X（Twitter）の投稿画面を新しいタブで開く（編集済みテキストを intent に渡す） */
  const openXIntent = useCallback(() => {
    if (!displayCopy?.twitter) return;
    const encoded = encodeURIComponent(displayCopy.twitter);
    window.open(`https://x.com/intent/post?text=${encoded}`, "_blank", "noopener,noreferrer");
  }, [displayCopy?.twitter]);

  /** 編集中テキストエリアの高さを内容に合わせて伸ばす */
  const resizeTextarea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(120, el.scrollHeight)}px`;
  }, []);

  return (
    <div>
      {toast != null && (
        <div
          role="alert"
          style={{
            position: "fixed",
            bottom: "var(--space-4)",
            right: "var(--space-4)",
            padding: "var(--space-2) var(--space-4)",
            background: "var(--color-line)",
            color: "#fff",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 9999,
            fontSize: "0.9rem",
          }}
        >
          {toast}
        </div>
      )}
      <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)", fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
        SNS発信ハブ
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        素材を投入し、X・Instagram・LINE用の文案を一括生成します。商品は任意で選択できます。
      </p>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-text)" }}>
          素材投入
        </h2>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          style={{
            border: "2px dashed var(--color-border)",
            borderRadius: 8,
            padding: "var(--space-6)",
            textAlign: "center",
            background: uploadedImage ? "var(--color-bg)" : "var(--color-bg-muted)",
            marginBottom: "var(--space-2)",
          }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={onFileInput}
            style={{ display: "none" }}
            id="sns-hub-image"
          />
          <label htmlFor="sns-hub-image" style={{ cursor: "pointer", display: "block" }}>
            {uploadedImage ? (
              <div>
                <img src={uploadedImage.dataUrl} alt="アップロード" style={{ maxWidth: 320, maxHeight: 240, objectFit: "contain", borderRadius: 4 }} />
                <p style={{ marginTop: "var(--space-2)", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  {uploadedImage.file.name} — クリックで差し替え
                </p>
              </div>
            ) : (
              <p style={{ color: "var(--color-text-muted)" }}>高解像度写真をドラッグ＆ドロップ、またはクリックして選択</p>
            )}
          </label>
        </div>

        <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, marginBottom: "var(--space-1)", color: "var(--color-text)" }}>
          今日の職人の想い
        </label>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", maxWidth: 560 }}>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="音声入力のメモや、伝えたい想いをここに…"
            rows={4}
            style={{
              flex: 1,
              width: "100%",
              padding: "var(--space-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: "0.95rem",
              background: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          />
          <button
            type="button"
            onClick={toggleVoice}
            title={listening ? "音声入力を停止" : "音声入力"}
            style={{
              flexShrink: 0,
              padding: "var(--space-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              background: listening ? "var(--color-line)" : "var(--color-bg)",
              color: listening ? "#fff" : "var(--color-text)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mic size={20} />
          </button>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-text)" }}>
          商品検索（任意）
        </h2>
        <input
          type="text"
          value={productSearch}
          onChange={(e) => searchProducts(e.target.value)}
          placeholder="商品名やIDで検索…"
          style={{
            width: "100%",
            maxWidth: 360,
            padding: "var(--space-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            marginBottom: "var(--space-1)",
            background: "var(--color-bg)",
            color: "var(--color-text)",
          }}
        />
        {productList.length > 0 && (
          <select
            value={product?.item_id ?? ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : 0;
              const p = productList.find((x) => x.item_id === id);
              setProduct(p ? { item_id: p.item_id, title: p.title, price: p.price, image_url: p.image_url, item_url: p.item_url, line_display_image_url: p.line_display_image_url } : null);
            }}
            style={{
              width: "100%",
              maxWidth: 480,
              padding: "var(--space-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              background: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          >
            <option value="">未選択（投稿のみ）</option>
            {productList.slice(0, 100).map((p) => (
              <option key={p.item_id} value={p.item_id}>
                {p.title} — {p.price}円
              </option>
            ))}
          </select>
        )}
        {product && (
          <p style={{ marginTop: "var(--space-1)", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
            選択中: {product.title}
          </p>
        )}
        {productListLoading && <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>検索中…</p>}
      </section>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-text)" }}>
          プラットフォーム別：投稿文に商品URLを含める
        </h2>
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeUrl.x}
              onChange={(e) => setIncludeUrl((u) => ({ ...u, x: e.target.checked }))}
            />
            <span>X (Twitter)</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeUrl.instagram}
              onChange={(e) => setIncludeUrl((u) => ({ ...u, instagram: e.target.checked }))}
            />
            <span>Instagram</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeUrl.line}
              onChange={(e) => setIncludeUrl((u) => ({ ...u, line: e.target.checked }))}
            />
            <span>LINE ニュース</span>
          </label>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-text)" }}>
          カテゴリー
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {SNS_CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  border: `1px solid ${active ? "var(--color-line)" : "var(--color-border)"}`,
                  borderRadius: 9999,
                  fontSize: "0.85rem",
                  background: active ? "var(--color-line)" : "var(--color-bg)",
                  color: active ? "#fff" : "var(--color-text)",
                  cursor: "pointer",
                  boxShadow: active ? "0 0 0 2px var(--color-line)" : "none",
                }}
              >
                {c.sub ? `${c.label}（${c.sub}）` : c.label}
              </button>
            );
          })}
        </div>
      </section>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: "var(--space-2) var(--space-4)",
            background: "var(--color-line)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "生成中…" : "生成"}
        </button>
        {error && <p style={{ marginTop: "var(--space-2)", color: "var(--color-error, #c00)" }}>{error}</p>}
      </div>

      {triple && displayCopy && (
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-text)" }}>
            プレビュー・アクション
          </h2>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            {/* X (Twitter) */}
            <div style={panelStyle}>
              <h3 style={{ fontSize: "0.9rem", marginBottom: "var(--space-2)", color: "var(--color-text)", fontFamily: "var(--font-serif)" }}>X (Twitter)</h3>
              {editingPlatform === "x" ? (
                <textarea
                  value={displayCopy.twitter}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditedCopy((prev) => ({ ...(prev ?? triple), twitter: v }));
                  }}
                  onInput={(e) => resizeTextarea(e.currentTarget)}
                  ref={resizeTextarea}
                  rows={3}
                  style={{
                    width: "100%",
                    minHeight: 120,
                    padding: "var(--space-2)",
                    border: "2px solid var(--color-line)",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                    fontFamily: "var(--font-serif)",
                    background: "var(--color-bg)",
                    color: "var(--color-text)",
                    resize: "none",
                    marginBottom: "var(--space-2)",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", marginBottom: "var(--space-2)", color: "var(--color-text)", fontFamily: "var(--font-serif)" }}>{displayCopy.twitter}</p>
              )}
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setEditingPlatform(editingPlatform === "x" ? null : "x")} style={{ padding: "var(--space-1) var(--space-2)", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer", background: editingPlatform === "x" ? "var(--color-bg-muted)" : "var(--color-bg)", color: "var(--color-text)" }}>{editingPlatform === "x" ? "編集終了" : "微調整"}</button>
                <button type="button" onClick={openXIntent} disabled={!displayCopy?.twitter} style={{ padding: "var(--space-1) var(--space-2)", background: "var(--color-line)", color: "#fff", border: "none", borderRadius: 4, cursor: displayCopy?.twitter ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: "var(--space-1)", fontSize: "0.9rem" }}><ExternalLink size={14} aria-hidden /> Xで確認して投稿</button>
              </div>
            </div>
            {/* Instagram */}
            <div style={panelStyle}>
              <h3 style={{ fontSize: "0.9rem", marginBottom: "var(--space-2)", color: "var(--color-text)", fontFamily: "var(--font-serif)" }}>Instagram</h3>
              {editingPlatform === "instagram" ? (
                <textarea
                  value={displayCopy.instagram}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditedCopy((prev) => ({ ...(prev ?? triple), instagram: v }));
                  }}
                  onInput={(e) => resizeTextarea(e.currentTarget)}
                  ref={resizeTextarea}
                  rows={3}
                  style={{
                    width: "100%",
                    minHeight: 120,
                    padding: "var(--space-2)",
                    border: "2px solid var(--color-line)",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                    fontFamily: "var(--font-serif)",
                    background: "var(--color-bg)",
                    color: "var(--color-text)",
                    resize: "none",
                    marginBottom: "var(--space-2)",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", marginBottom: "var(--space-2)", color: "var(--color-text)", fontFamily: "var(--font-serif)" }}>{displayCopy.instagram}</p>
              )}
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="button" onClick={() => setEditingPlatform(editingPlatform === "instagram" ? null : "instagram")} style={{ padding: "var(--space-1) var(--space-2)", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer", background: editingPlatform === "instagram" ? "var(--color-bg-muted)" : "var(--color-bg)", color: "var(--color-text)" }}>{editingPlatform === "instagram" ? "編集終了" : "微調整"}</button>
                <button type="button" onClick={() => handleSave("instagram")} disabled={saving.instagram} style={{ padding: "var(--space-1) var(--space-2)", background: saved.instagram ? "var(--color-text-muted)" : "var(--color-line)", color: "#fff", border: "none", borderRadius: 4, cursor: saving.instagram ? "not-allowed" : "pointer" }}>{saving.instagram ? "保存中…" : saved.instagram ? "保存済み" : "送信 / 保存"}</button>
              </div>
            </div>
            {/* LINE ニュース */}
            <div style={panelStyle}>
              <h3 style={{ fontSize: "0.9rem", marginBottom: "var(--space-2)", color: "var(--color-text)", fontFamily: "var(--font-serif)" }}>LINE ニュース</h3>
              {editingPlatform === "line" ? (
                <textarea
                  value={displayCopy.lineNews}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditedCopy((prev) => ({ ...(prev ?? triple), lineNews: v }));
                  }}
                  onInput={(e) => resizeTextarea(e.currentTarget)}
                  ref={resizeTextarea}
                  rows={3}
                  style={{
                    width: "100%",
                    minHeight: 120,
                    padding: "var(--space-2)",
                    border: "2px solid var(--color-line)",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                    fontFamily: "var(--font-serif)",
                    background: "var(--color-bg)",
                    color: "var(--color-text)",
                    resize: "none",
                    marginBottom: "var(--space-2)",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", marginBottom: "var(--space-2)", color: "var(--color-text)", fontFamily: "var(--font-serif)" }}>{displayCopy.lineNews}</p>
              )}
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="button" onClick={() => setEditingPlatform(editingPlatform === "line" ? null : "line")} style={{ padding: "var(--space-1) var(--space-2)", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer", background: editingPlatform === "line" ? "var(--color-bg-muted)" : "var(--color-bg)", color: "var(--color-text)" }}>{editingPlatform === "line" ? "編集終了" : "微調整"}</button>
                <button type="button" onClick={() => handleSave("line")} disabled={saving.line} style={{ padding: "var(--space-1) var(--space-2)", background: saved.line ? "var(--color-text-muted)" : "var(--color-line)", color: "#fff", border: "none", borderRadius: 4, cursor: saving.line ? "not-allowed" : "pointer" }}>{saving.line ? "保存中…" : saved.line ? "保存済み" : "送信 / 保存"}</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
