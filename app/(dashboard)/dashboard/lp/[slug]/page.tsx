"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type WoodSettings = {
  hero_image_url: string | null;
  custom_catch_copy: string | null;
  custom_story: string | null;
  search_keyword: string | null;
  is_published: boolean;
};

type WoodData = {
  slug: string;
  wood_name_ja: string;
  wood_name_en?: string;
  catch_copy: string;
} & WoodSettings;

export default function LpEditPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [wood, setWood] = useState<WoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [customCatchCopy, setCustomCatchCopy] = useState("");
  const [customStory, setCustomStory] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    fetch(`/api/lp/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: WoodData) => {
        setWood(data);
        setHeroImageUrl(data.hero_image_url ?? "");
        setCustomCatchCopy(data.custom_catch_copy ?? "");
        setCustomStory(data.custom_story ?? "");
        setSearchKeyword(data.search_keyword ?? "");
        setIsPublished(data.is_published);
      })
      .catch(() => setError("データの読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/lp/${encodeURIComponent(slug)}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero_image_url: heroImageUrl || null,
          custom_catch_copy: customCatchCopy || null,
          custom_story: customStory || null,
          search_keyword: searchKeyword || null,
          is_published: isPublished,
        }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: "var(--color-text-muted)" }}>読み込み中…</p>;
  if (error && !wood) return <p style={{ color: "#e74c3c" }}>{error}</p>;

  return (
    <div style={{ maxWidth: 720 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <Link
          href="/dashboard/lp"
          style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          ← LP管理
        </Link>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.15rem" }}>
            {wood?.wood_name_ja ?? slug}
          </h1>
          {wood?.wood_name_en && (
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{wood.wood_name_en}</p>
          )}
        </div>
      </div>

      {/* フォーム */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

        {/* 公開設定 */}
        <section style={{ padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 style={sectionHeadStyle}>公開設定</h2>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: "0.9rem" }}>LPページを公開する</span>
          </label>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
            公開するとLINEのリッチメニューやメッセージからアクセスできます
          </p>
        </section>

        {/* ヒーロー画像 */}
        <section style={{ padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 style={sectionHeadStyle}>ヒーロー画像 URL</h2>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            画像のURLを入力してください（Supabase Storage / 外部URL どちらでも可）
          </p>
          <input
            type="url"
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
          {heroImageUrl && (
            <div style={{ marginTop: "var(--space-3)", border: "1px solid var(--color-border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageUrl}
                alt="ヒーロー画像プレビュー"
                style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
        </section>

        {/* カスタムキャッチコピー */}
        <section style={{ padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 style={sectionHeadStyle}>カスタムキャッチコピー</h2>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            空白の場合、JSONファイルの <code>catch_copy</code> を使用します（{wood?.catch_copy}）
          </p>
          <input
            type="text"
            value={customCatchCopy}
            onChange={(e) => setCustomCatchCopy(e.target.value)}
            placeholder={wood?.catch_copy ?? "キャッチコピーを入力"}
            style={inputStyle}
          />
        </section>

        {/* 検索キーワード */}
        <section style={{ padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 style={sectionHeadStyle}>BASE商品検索キーワード</h2>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            空白の場合、木材名（{wood?.wood_name_ja}）で検索します
          </p>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder={wood?.wood_name_ja ?? "キーワードを入力"}
            style={inputStyle}
          />
        </section>

        {/* カスタムストーリー */}
        <section style={{ padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 style={sectionHeadStyle}>カスタムストーリー（テキスト）</h2>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            LPに追加で表示するフリーテキスト。空白の場合は非表示。
          </p>
          <textarea
            value={customStory}
            onChange={(e) => setCustomStory(e.target.value)}
            placeholder="職人のコメントや素材へのこだわりなど…"
            rows={6}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </section>

        {/* 保存ボタン */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0.6rem 1.5rem",
              background: saving ? "var(--color-border)" : "var(--color-line)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "保存中…" : "保存する"}
          </button>
          {saved && <span style={{ fontSize: "0.85rem", color: "#2ecc71" }}>保存しました</span>}
          {error && <span style={{ fontSize: "0.85rem", color: "#e74c3c" }}>{error}</span>}
          <a
            href={`/liff/lp/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginLeft: "auto" }}
          >
            プレビューを開く →
          </a>
        </div>
      </div>
    </div>
  );
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  letterSpacing: "0.15em",
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  marginBottom: "var(--space-2)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  background: "var(--color-bg)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  fontSize: "0.9rem",
  boxSizing: "border-box",
};
