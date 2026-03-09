"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** 画像をセンタークロップして 1080×1080 の Blob に変換 */
function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas not supported")); return; }
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 1080, 1080);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("crop failed"));
      }, "image/jpeg", 0.92);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function NewBroadcastPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 画像関連
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const blob = await cropToSquare(file);
      setCroppedBlob(blob);
      setImagePreview(URL.createObjectURL(blob));
    } catch {
      setError("画像の処理に失敗しました");
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // 画像アップロード
    let imageUrl: string | null = null;
    if (croppedBlob) {
      setImageUploading(true);
      try {
        const fd = new FormData();
        fd.append("image", croppedBlob, "broadcast.jpg");
        const res = await fetch("/api/broadcasts/upload", { method: "POST", body: fd });
        const data = await res.json() as { url?: string; error?: string };
        if (data.error) throw new Error(data.error);
        imageUrl = data.url ?? null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
        setSubmitting(false);
        setImageUploading(false);
        return;
      }
      setImageUploading(false);
    }

    // 配信データ保存
    const payload = {
      title: title.trim() || "（無題）",
      body: body.trim(),
      status,
      image_url: imageUrl,
      scheduled_at: status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    };

    fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data: { error?: string }) => {
        if (data.error) {
          setError(data.error);
          setSubmitting(false);
          return;
        }
        router.push("/dashboard/broadcasts");
      })
      .catch(() => {
        setError("保存に失敗しました");
        setSubmitting(false);
      });
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)", fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
        新規一斉配信
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        タイトルと本文を入力し、下書き保存または予約してください。送信は一覧画面の「今すぐ送信」で実行します。
      </p>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "var(--space-5)", maxWidth: "560px" }}>
        <form onSubmit={handleSubmit}>

          {/* タイトル */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "var(--space-1)", color: "var(--color-text)" }}>タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="（無題）"
              style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border-strong)", fontSize: "0.95rem" }}
            />
          </div>

          {/* 本文 */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "var(--space-1)", color: "var(--color-text)" }}>本文</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="配信するメッセージ本文"
              rows={6}
              style={{ width: "100%", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border-strong)", fontSize: "0.95rem", resize: "vertical" }}
            />
          </div>

          {/* 画像（任意） */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "var(--space-1)", color: "var(--color-text)" }}>
              画像（任意）
              <span style={{ fontSize: "0.78rem", fontWeight: 400, marginLeft: 8, color: "var(--color-text-muted)" }}>自動で正方形にクロップされます</span>
            </label>

            {imagePreview ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={imagePreview}
                  alt="プレビュー"
                  style={{ width: 200, height: 200, objectFit: "cover", border: "1px solid var(--color-border)", display: "block" }}
                />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setCroppedBlob(null); }}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    background: "rgba(0,0,0,0.6)", color: "#fff",
                    border: "none", borderRadius: 4, padding: "2px 8px",
                    cursor: "pointer", fontSize: "0.8rem",
                  }}
                >
                  削除
                </button>
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: 4 }}>
                  1080×1080px · クリックで差し替え
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  style={{ display: "none" }}
                  id="broadcast-image-replace"
                />
                <label
                  htmlFor="broadcast-image-replace"
                  style={{ fontSize: "0.82rem", color: "var(--color-line)", cursor: "pointer", textDecoration: "underline" }}
                >
                  別の画像を選択
                </label>
              </div>
            ) : (
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  border: "2px dashed var(--color-border)",
                  borderRadius: 6,
                  padding: "var(--space-6)",
                  textAlign: "center",
                  background: "var(--color-bg-muted)",
                  cursor: "pointer",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "var(--space-2)" }}>
                  画像をドラッグ＆ドロップ<br />またはクリックして選択
                </p>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>
                  JPG / PNG — 自動で正方形（1080×1080）にクロップ
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  style={{ display: "none" }}
                />
              </div>
            )}
          </div>

          {/* 保存形式 */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "var(--space-1)", color: "var(--color-text)" }}>保存形式</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "scheduled")}
              style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border-strong)", fontSize: "0.95rem" }}
            >
              <option value="draft">下書き</option>
              <option value="scheduled">予約</option>
            </select>
          </div>

          {status === "scheduled" && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "var(--space-1)", color: "var(--color-text)" }}>予約日時</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-border-strong)", fontSize: "0.95rem" }}
              />
            </div>
          )}

          {error && <p style={{ color: "#c00", fontSize: "0.85rem", marginBottom: "var(--space-2)" }}>{error}</p>}

          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "var(--space-2) var(--space-4)",
                background: "var(--color-line)",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {imageUploading ? "画像アップロード中…" : submitting ? "保存中…" : "保存"}
            </button>
            <Link
              href="/dashboard/broadcasts"
              style={{
                padding: "var(--space-2) var(--space-4)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border-strong)",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
