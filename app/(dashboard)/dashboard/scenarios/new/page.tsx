"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Clock, MessageSquare } from "lucide-react";

type StepDraft = {
  step_order: number;
  delay_hours: number;
  text: string;
};

type TriggerType = "follow" | "keyword" | "manual";

const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: "follow", label: "友達追加時に自動起動" },
  { value: "keyword", label: "キーワードで起動" },
  { value: "manual", label: "手動で起動（管理画面から）" },
];

export default function NewScenarioPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("follow");
  const [triggerValue, setTriggerValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addStep() {
    setSteps((prev) => [...prev, { step_order: prev.length, delay_hours: prev.length === 0 ? 0 : 24, text: "" }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_order: idx })));
  }

  function updateStep(i: number, field: "delay_hours" | "text", value: string | number) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  async function handleSave() {
    if (!name.trim()) { setError("シナリオ名を入力してください"); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        trigger_type: triggerType,
        trigger_value: triggerValue || null,
        is_active: isActive,
        steps: steps.map((s) => ({ delay_hours: s.delay_hours, text: s.text })),
      }),
    });

    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "保存に失敗しました");
      setSaving(false);
      return;
    }

    router.push("/dashboard/scenarios");
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
        <Link href="/dashboard/scenarios" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "1px solid var(--color-border)", color: "var(--color-text-muted)", textDecoration: "none" }}>
          <ArrowLeft size={16} />
        </Link>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>新しいシナリオ</h1>
      </div>

      <section style={{ padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)", marginBottom: "var(--space-4)" }}>
        <h2 style={sectionTitleStyle}>基本設定</h2>
        <div style={fieldStyle}>
          <label style={labelStyle}>シナリオ名</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 友達追加ウェルカムシナリオ" style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>説明（任意）</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="このシナリオの目的を入力..." style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>起動トリガー</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {TRIGGER_OPTIONS.map((opt) => (
              <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", fontSize: "0.88rem" }}>
                <input type="radio" name="trigger" value={opt.value} checked={triggerType === opt.value} onChange={() => setTriggerType(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
          {triggerType === "keyword" && (
            <input value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} placeholder="例: スタート" style={{ ...inputStyle, marginTop: "var(--space-2)" }} />
          )}
        </div>
        <div style={fieldStyle}>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            シナリオを有効にする
          </label>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <h2 style={{ fontWeight: 600, fontSize: "0.9rem" }}>メッセージステップ</h2>
          <button onClick={addStep} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", padding: "5px 12px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)", cursor: "pointer" }}>
            <Plus size={13} /> ステップを追加
          </button>
        </div>
        {steps.length === 0 ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", border: "1px dashed var(--color-border)", color: "var(--color-text-muted)" }}>
            <MessageSquare size={24} style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ fontSize: "0.85rem" }}>「ステップを追加」からメッセージを設定してください</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--color-line)", fontWeight: 600 }}>Step {i + 1}</span>
                  <button onClick={() => removeStep(i)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#e74c3c", border: "none", background: "transparent", cursor: "pointer" }}>
                    <Trash2 size={13} /> 削除
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                  <Clock size={13} />
                  {i === 0 ? <span>トリガー直後に送信</span> : (
                    <>
                      <span>前のステップから</span>
                      <input type="number" min={0} value={step.delay_hours} onChange={(e) => updateStep(i, "delay_hours", parseInt(e.target.value) || 0)} style={{ width: 64, padding: "3px 8px", background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: "0.82rem", textAlign: "center" }} />
                      <span>時間後に送信</span>
                    </>
                  )}
                </div>
                <textarea value={step.text} onChange={(e) => updateStep(i, "text", e.target.value)} rows={4} placeholder={`Step ${i + 1} のメッセージを入力...`} style={{ width: "100%", padding: "0.5rem 0.6rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: "0.85rem", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p style={{ fontSize: "0.82rem", color: "#e74c3c", background: "#2a1010", border: "1px solid #5a2020", padding: "0.5rem 0.75rem", marginBottom: "var(--space-3)" }}>{error}</p>}

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Link href="/dashboard/scenarios" style={{ flex: 1, padding: "0.65rem", textAlign: "center", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "0.88rem", textDecoration: "none" }}>
          キャンセル
        </Link>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "0.65rem", background: saving ? "var(--color-border)" : "var(--color-line)", color: "#fff", fontWeight: 700, fontSize: "0.88rem", border: "none", cursor: "pointer" }}>
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = { fontWeight: 600, fontSize: "0.88rem", marginBottom: "var(--space-3)", paddingBottom: "var(--space-2)", borderBottom: "1px solid var(--color-border)" };
const fieldStyle: React.CSSProperties = { marginBottom: "var(--space-3)" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.78rem", color: "var(--color-text-muted)", letterSpacing: "0.1em", marginBottom: "var(--space-1)" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.5rem 0.6rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: "0.88rem", boxSizing: "border-box" };
