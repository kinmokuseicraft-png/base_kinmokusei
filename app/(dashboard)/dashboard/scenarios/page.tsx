"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, GitBranch, Zap, MessageCircle } from "lucide-react";

type Scenario = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: "follow" | "keyword" | "manual";
  trigger_value: string | null;
  created_at: string;
  scenario_steps: { count: number }[];
};

const TRIGGER_LABELS: Record<string, string> = {
  follow: "友達追加時",
  keyword: "キーワード応答",
  manual: "手動起動",
};

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  follow: <Zap size={14} />,
  keyword: <MessageCircle size={14} />,
  manual: <GitBranch size={14} />,
};

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState("");

  useEffect(() => {
    fetch("/api/scenarios", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { scenarios?: Scenario[] }) => setScenarios(d.scenarios ?? []))
      .catch(() => setScenarios([]))
      .finally(() => setLoading(false));
  }, []);

  async function deleteScenario(id: string) {
    if (!confirm("このシナリオを削除しますか？")) return;
    await fetch(`/api/scenarios/${id}`, { method: "DELETE" });
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  async function toggleActive(s: Scenario) {
    await fetch(`/api/scenarios/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    setScenarios((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
  }

  async function bootstrap() {
    setBootstrapping(true);
    setBootstrapMsg("");
    const res = await fetch("/api/scenarios/bootstrap", { method: "POST" });
    const data = await res.json() as { ok?: boolean; created?: boolean; message?: string; error?: string };
    setBootstrapMsg(data.message ?? data.error ?? "完了");
    setBootstrapping(false);
    if (data.created) {
      fetch("/api/scenarios", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { scenarios?: Scenario[] }) => setScenarios(d.scenarios ?? []));
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>シナリオ管理</h1>
          <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            友達追加・キーワードで自動送信するメッセージシナリオを管理します
          </p>
        </div>
        <Link
          href="/dashboard/scenarios/new"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--color-line)", color: "#fff", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}
        >
          <Plus size={14} /> 新規作成
        </Link>
      </div>

      {/* ウェルカム導線ブートストラップ */}
      <div style={{ padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)", marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>おすすめ: ウェルカム導線を一括作成</p>
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              友達追加直後に「作品を見る・銘木図鑑・相談する」の3導線を自動で案内するシナリオを作成します
            </p>
            <button
              onClick={bootstrap}
              disabled={bootstrapping}
              style={{ fontSize: "0.82rem", padding: "5px 14px", background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", cursor: "pointer" }}
            >
              {bootstrapping ? "作成中…" : "ウェルカムシナリオを作成"}
            </button>
            {bootstrapMsg && (
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>{bootstrapMsg}</p>
            )}
          </div>
        </div>
      </div>

      {loading && <p style={{ color: "var(--color-text-muted)" }}>読み込み中…</p>}

      {scenarios.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)" }}>
          <GitBranch size={32} style={{ margin: "0 auto 1rem" }} />
          <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>シナリオがまだありません</p>
          <p style={{ fontSize: "0.78rem" }}>「新規作成」または「ウェルカムシナリオを作成」から始めましょう</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {scenarios.map((s) => {
          const stepCount = s.scenario_steps?.[0]?.count ?? 0;
          return (
            <div
              key={s.id}
              style={{ padding: "var(--space-3) var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}
            >
              {/* アクティブインジケーター */}
              <div
                title={s.is_active ? "有効" : "無効"}
                style={{ width: 9, height: 9, borderRadius: "50%", background: s.is_active ? "var(--color-line)" : "var(--color-border)", flexShrink: 0 }}
              />

              {/* 情報 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.2rem" }}>{s.name}</div>
                {s.description && (
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "0.2rem" }}>{s.description}</div>
                )}
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                    {TRIGGER_ICONS[s.trigger_type]} {TRIGGER_LABELS[s.trigger_type]}
                    {s.trigger_value && `: 「${s.trigger_value}」`}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>|</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{stepCount} ステップ</span>
                </div>
              </div>

              {/* アクション */}
              <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0, alignItems: "center" }}>
                <button
                  onClick={() => toggleActive(s)}
                  style={{ fontSize: "0.75rem", padding: "3px 10px", border: "none", background: s.is_active ? "var(--color-border)" : "var(--color-line)", color: s.is_active ? "var(--color-text)" : "#fff", cursor: "pointer" }}
                >
                  {s.is_active ? "無効化" : "有効化"}
                </button>
                <Link
                  href={`/dashboard/scenarios/${s.id}`}
                  style={{ fontSize: "0.75rem", padding: "3px 10px", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", textDecoration: "none" }}
                >
                  編集
                </Link>
                <button
                  onClick={() => deleteScenario(s.id)}
                  style={{ fontSize: "0.75rem", padding: "3px 10px", border: "1px solid #5a2020", color: "#e74c3c", background: "transparent", cursor: "pointer" }}
                >
                  削除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
