"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Copy, Save, Send, Search } from "lucide-react";

type LineUser = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  status: string;
  created_at: string;
  followed_at?: string | null;
  tags?: string[] | null;
  custom_fields?: Record<string, unknown> | null;
  email?: string | null;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch { return "—"; }
}

function getConsultInfo(user: LineUser) {
  const cf = user.custom_fields ?? {};
  return {
    summary: String(cf.consult_summary ?? ""),
    autoTags: Array.isArray(cf.consult_detected_tags) ? (cf.consult_detected_tags as string[]) : [],
    updatedAt: String(cf.consult_updated_at ?? ""),
    latestMessage: String(cf.consult_latest_message ?? ""),
    replySuggestion: String(cf.consult_reply_suggestion ?? ""),
    recommendedWoods: Array.isArray(cf.consult_recommended_woods) ? (cf.consult_recommended_woods as string[]) : [],
    note: String(cf.note ?? ""),
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<LineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/users?full=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { users?: LineUser[] }) => setUsers(Array.isArray(d?.users) ? d.users : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const selected = users.find((u) => u.id === selectedId) ?? null;
  const consult = selected ? getConsultInfo(selected) : null;

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.line_user_id.includes(search);
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function openUser(u: LineUser) {
    setSelectedId(u.id);
    setTagInput((u.tags ?? []).join(", "));
    const info = getConsultInfo(u);
    setNoteInput(info.note);
    setReplyText(info.replySuggestion);
    setMsg(null);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch(`/api/users/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags, note: noteInput }),
    });
    const data = await res.json() as { ok?: boolean; error?: string; user?: LineUser };
    if (!res.ok) {
      setMsg({ text: data.error ?? "保存失敗", ok: false });
    } else {
      setUsers((prev) => prev.map((u) => u.id === selected.id ? { ...u, ...(data.user ?? {}), tags } : u));
      setMsg({ text: "保存しました", ok: true });
    }
    setSaving(false);
  }

  async function sendReply() {
    if (!selected) return;
    const text = replyText.trim();
    if (!text) { setMsg({ text: "送信する文を入力してください", ok: false }); return; }
    setSending(true);
    setMsg(null);
    const res = await fetch(`/api/users/${selected.id}/send-suggestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    setSending(false);
    setMsg({ text: data.error ?? (res.ok ? "送信しました" : "送信失敗"), ok: res.ok });
  }

  async function refreshProfiles() {
    setRefreshing(true);
    const res = await fetch("/api/users/refresh-profiles", { method: "POST" });
    const data = await res.json() as { ok?: boolean; updated?: number; total?: number };
    setRefreshing(false);
    if (data.ok) {
      // リロード
      fetch("/api/users?full=1", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { users?: LineUser[] }) => setUsers(Array.isArray(d?.users) ? d.users : []));
    }
  }

  return (
    <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "flex-start" }}>
      {/* 左ペイン: ユーザー一覧 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, flex: 1 }}>友達管理</h1>
          <button
            onClick={refreshProfiles}
            disabled={refreshing}
            style={{ fontSize: "0.78rem", padding: "4px 12px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)", cursor: "pointer" }}
          >
            {refreshing ? "更新中…" : "プロフィール更新"}
          </button>
        </div>

        {/* フィルター */}
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前・IDで検索..."
              style={{ width: "100%", paddingLeft: 32, paddingRight: 10, paddingTop: 7, paddingBottom: 7, background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: "0.85rem", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", overflow: "hidden", border: "1px solid var(--color-border)" }}>
            {(["all", "active", "blocked"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  border: "none",
                  background: filterStatus === s ? "var(--color-line)" : "var(--color-surface)",
                  color: filterStatus === s ? "#fff" : "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                {s === "all" ? "全員" : s === "active" ? "有効" : "ブロック"}
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
          {filtered.length} 件
        </p>

        {loading ? (
          <p style={{ color: "var(--color-text-muted)" }}>読み込み中…</p>
        ) : (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                <thead>
                  <tr style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                    {["", "表示名", "タグ", "状態", "友達追加日", "操作"].map((h) => (
                      <th key={h} style={{ padding: "var(--space-2) var(--space-3)", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openUser(u)}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        background: selectedId === u.id ? "rgba(6,199,85,0.06)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                        {u.picture_url ? (
                          <Image src={u.picture_url} alt="" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                            {u.display_name?.[0] ?? "?"}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "var(--space-2) var(--space-3)", fontWeight: 500, fontSize: "0.88rem" }}>
                        {u.display_name ?? "—"}
                      </td>
                      <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(u.tags ?? []).length > 0 ? (u.tags ?? []).map((tag) => (
                            <span key={tag} style={{ fontSize: "0.68rem", padding: "1px 7px", border: "1px solid rgba(6,199,85,0.3)", color: "var(--color-line)", background: "rgba(6,199,85,0.08)" }}>
                              {tag}
                            </span>
                          )) : <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                        <span style={{
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          border: `1px solid ${u.status === "active" ? "rgba(6,199,85,0.3)" : "var(--color-border)"}`,
                          color: u.status === "active" ? "var(--color-line)" : "var(--color-text-muted)",
                        }}>
                          {u.status === "active" ? "有効" : "ブロック"}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-2) var(--space-3)", fontSize: "0.8rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {formatDate(u.followed_at ?? u.created_at)}
                      </td>
                      <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                        <Link
                          href={`/dashboard/chat?line_user_id=${encodeURIComponent(u.line_user_id)}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: "0.78rem", color: "var(--color-line)" }}
                        >
                          チャット
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                        該当する友達が見つかりません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 右ペイン: 詳細・編集 */}
      <aside style={{ width: 300, flexShrink: 0, position: "sticky", top: "var(--space-5)", background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "var(--space-4)" }}>
        {selected ? (
          <>
            {/* プロフィール */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--color-border)" }}>
              {selected.picture_url ? (
                <Image src={selected.picture_url} alt="" width={44} height={44} style={{ borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
                  {selected.display_name?.[0] ?? "?"}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{selected.display_name ?? "名前なし"}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", fontFamily: "monospace", marginTop: 2, wordBreak: "break-all" }}>
                  {selected.line_user_id}
                </div>
                {selected.email && (
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 2, wordBreak: "break-all" }}>
                    📧 {selected.email}
                  </div>
                )}
              </div>
            </div>

            {/* AI相談情報 */}
            {consult?.summary && (
              <div style={{ marginBottom: "var(--space-4)", padding: "var(--space-3)", background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                  AI相談サマリー
                </div>
                <p style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>{consult.summary}</p>
                {consult.recommendedWoods.length > 0 && (
                  <div style={{ marginTop: "var(--space-2)", display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {consult.recommendedWoods.map((w) => (
                      <span key={w} style={{ fontSize: "0.65rem", padding: "1px 7px", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>{w}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI返信候補 */}
            {consult?.replySuggestion && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                  AI返信候補
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  style={{ width: "100%", padding: "0.5rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: "0.82rem", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                  <button
                    onClick={async () => { await navigator.clipboard.writeText(replyText); setMsg({ text: "コピーしました", ok: true }); }}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", padding: "4px 10px", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}
                  >
                    <Copy size={12} /> コピー
                  </button>
                  <button
                    onClick={sendReply}
                    disabled={sending}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", padding: "4px 10px", border: "none", background: "var(--color-line)", color: "#fff", cursor: "pointer" }}
                  >
                    <Send size={12} /> {sending ? "送信中…" : "送信"}
                  </button>
                </div>
              </div>
            )}

            {/* タグ */}
            <div style={{ marginBottom: "var(--space-3)" }}>
              <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", letterSpacing: "0.15em", display: "block", marginBottom: "var(--space-1)" }}>
                タグ（カンマ区切り）
              </label>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="VIP, 購入者, 相談中"
                style={{ width: "100%", padding: "0.5rem 0.6rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: "0.85rem", boxSizing: "border-box" }}
              />
            </div>

            {/* メモ */}
            <div style={{ marginBottom: "var(--space-3)" }}>
              <label style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", letterSpacing: "0.15em", display: "block", marginBottom: "var(--space-1)" }}>
                メモ
              </label>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={5}
                placeholder="希望の木材、用途、相談内容など…"
                style={{ width: "100%", padding: "0.5rem 0.6rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: "0.82rem", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }}
              />
            </div>

            {msg && (
              <p style={{ fontSize: "0.78rem", color: msg.ok ? "var(--color-line)" : "#e74c3c", marginBottom: "var(--space-2)" }}>
                {msg.text}
              </p>
            )}

            <button
              onClick={save}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "0.6rem", justifyContent: "center", background: saving ? "var(--color-border)" : "var(--color-text)", color: "var(--color-bg)", fontWeight: 600, fontSize: "0.85rem", border: "none", cursor: "pointer" }}
            >
              <Save size={14} /> {saving ? "保存中…" : "タグ・メモを保存"}
            </button>
          </>
        ) : (
          <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem", lineHeight: 1.8 }}>
            左一覧から友達を選ぶと<br />タグとメモを編集できます
          </div>
        )}
      </aside>
    </div>
  );
}
