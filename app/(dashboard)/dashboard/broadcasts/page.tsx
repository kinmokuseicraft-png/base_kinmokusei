"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

type Broadcast = {
  id: string;
  title: string;
  body: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
};

export default function BroadcastsPage() {
  const [list, setList] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [liffInviteSending, setLiffInviteSending] = useState(false);
  const [liffInviteResult, setLiffInviteResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/broadcasts", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { broadcasts?: Broadcast[] }) => setList(Array.isArray(data?.broadcasts) ? data.broadcasts : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = (id: string) => {
    setSendingId(id);
    fetch("/api/broadcasts/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setList((prev) => prev.map((b) => (b.id === id ? { ...b, status: "sent", sent_at: data.sent_at } : b)));
        } else {
          alert(data.error ?? "送信に失敗しました");
        }
      })
      .catch(() => alert("送信に失敗しました"))
      .finally(() => setSendingId(null));
  };

  const handleLiffInvite = async () => {
    if (!confirm("全友達にメール登録のお願いメッセージを送信しますか？")) return;
    setLiffInviteSending(true);
    setLiffInviteResult(null);
    try {
      const res = await fetch("/api/broadcasts/send-liff-invite", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setLiffInviteResult("送信完了しました");
        // 一覧を再取得
        fetch("/api/broadcasts", { cache: "no-store" })
          .then((r) => r.json())
          .then((d: { broadcasts?: Broadcast[] }) => setList(Array.isArray(d?.broadcasts) ? d.broadcasts : []));
      } else {
        setLiffInviteResult(`エラー: ${data.error ?? "送信失敗"}`);
      }
    } catch {
      setLiffInviteResult("通信エラー");
    } finally {
      setLiffInviteSending(false);
    }
  };

  const statusLabel = (s: string) => (s === "draft" ? "下書き" : s === "scheduled" ? "予約" : s === "sent" ? "送信済" : s);
  const statusColor = (s: string) =>
    s === "sent" ? "var(--color-line)" : "var(--color-text-muted)";

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)", fontFamily: "var(--font-serif)" }}>一斉配信</h1>
        <p style={{ color: "var(--color-text-muted)" }}>読み込み中…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)", fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
        一斉配信
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        line_users の友だち全員にブロードキャスト送信します。下書き・予約・送信済を管理できます。
      </p>

      <div style={{ marginBottom: "var(--space-4)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
        <Link
          href="/dashboard/broadcasts/new"
          style={{
            display: "inline-block",
            padding: "var(--space-2) var(--space-4)",
            background: "var(--color-line)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          新規作成
        </Link>

        {/* LIFF誘導ワンクリック送信 */}
        <button
          type="button"
          onClick={handleLiffInvite}
          disabled={liffInviteSending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "var(--space-2) var(--space-4)",
            border: "1px solid var(--color-border-strong)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontWeight: 500,
            fontSize: "0.9rem",
            cursor: liffInviteSending ? "not-allowed" : "pointer",
          }}
        >
          <Mail size={16} strokeWidth={1.5} />
          {liffInviteSending ? "送信中…" : "メール登録のお願いを送る"}
        </button>
        {liffInviteResult && (
          <span style={{ fontSize: "0.85rem", color: liffInviteResult.startsWith("エラー") ? "#c00" : "var(--color-line)" }}>
            {liffInviteResult}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {list.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", padding: "var(--space-6)", textAlign: "center" }}>
            配信履歴がありません。新規作成から追加してください。
          </p>
        )}
        {list.map((b) => (
          <div
            key={b.id}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              padding: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)" }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontFamily: "var(--font-serif)", fontWeight: 600, marginBottom: "var(--space-1)" }}>{b.title}</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                  {b.body.slice(0, 80)}
                  {b.body.length > 80 ? "…" : ""}
                </p>
                <span style={{ fontSize: "0.8rem", color: statusColor(b.status) }}>
                  {statusLabel(b.status)}
                  {b.sent_at && ` · ${new Date(b.sent_at).toLocaleString("ja-JP")}`}
                  {b.scheduled_at && b.status === "scheduled" && ` · ${new Date(b.scheduled_at).toLocaleString("ja-JP")}`}
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {(b.status === "draft" || b.status === "scheduled") && (
                  <button
                    type="button"
                    onClick={() => handleSend(b.id)}
                    disabled={!!sendingId}
                    style={{
                      padding: "var(--space-2) var(--space-3)",
                      background: "var(--color-line)",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      cursor: sendingId ? "not-allowed" : "pointer",
                    }}
                  >
                    {sendingId === b.id ? "送信中…" : "今すぐ送信"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
