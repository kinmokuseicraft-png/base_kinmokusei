"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

type Step = "loading" | "intro" | "processing" | "done" | "already" | "error";

export default function LiffRegisterPage() {
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!liffId) {
        setErrorMsg("LIFF ID が設定されていません");
        setStep("error");
        return;
      }
      try {
        await liff.init({ liffId });
        if (cancelled) return;

        if (!liff.isLoggedIn()) {
          // email スコープを含めてログイン
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const profile = await liff.getProfile();
        if (!cancelled) setDisplayName(profile.displayName ?? null);

        // IDトークンからメールアドレスを取得
        const idToken = liff.getDecodedIDToken();
        const resolvedEmail = idToken?.email ?? null;

        if (resolvedEmail) {
          // 既にメールアドレスが取得できている場合は登録処理へ
          if (!cancelled) {
            setEmail(resolvedEmail);
            await saveEmail(profile.userId, resolvedEmail);
            if (!cancelled) setStep("done");
          }
        } else {
          // メールアドレスが未取得 → intro画面を表示
          if (!cancelled) setStep("intro");
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : "初期化に失敗しました");
          setStep("error");
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [liffId]);

  async function saveEmail(lineUserId: string, resolvedEmail: string) {
    const res = await fetch("/api/liff/register-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_user_id: lineUserId, email: resolvedEmail }),
    });
    if (!res.ok) throw new Error("メールアドレスの保存に失敗しました");
  }

  async function handleRegister() {
    setStep("processing");
    try {
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }
      const idToken = liff.getDecodedIDToken();
      const resolvedEmail = idToken?.email ?? null;

      if (!resolvedEmail) {
        // email スコープが付与されていない場合は再ログイン
        liff.login({ redirectUri: window.location.href });
        return;
      }

      const profile = await liff.getProfile();
      setEmail(resolvedEmail);
      await saveEmail(profile.userId, resolvedEmail);
      setStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "登録に失敗しました");
      setStep("error");
    }
  }

  // ===== LOADING =====
  if (step === "loading" || step === "processing") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <p style={{ color: "#666" }}>
            {step === "processing" ? "登録中です…" : "読み込み中…"}
          </p>
        </div>
      </div>
    );
  }

  // ===== ERROR =====
  if (step === "error") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>エラーが発生しました</h2>
          <p style={{ color: "#999", fontSize: "0.85rem" }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ===== DONE =====
  if (step === "done") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            登録が完了しました
          </h2>
          {displayName && (
            <p style={{ color: "#444", marginBottom: "0.5rem" }}>
              {displayName} さん、ありがとうございます。
            </p>
          )}
          <div
            style={{
              background: "#f5f5f5",
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              margin: "1rem 0",
              fontSize: "0.9rem",
              wordBreak: "break-all",
            }}
          >
            📧 {email}
          </div>
          <p style={{ color: "#666", fontSize: "0.85rem", lineHeight: 1.6 }}>
            このメールアドレスに発送通知・注文確認をお送りします。
          </p>

          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#fafafa", borderRadius: 8, textAlign: "left" }}>
            <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.5rem", fontWeight: 600 }}>
              ご登録内容
            </p>
            <p style={{ fontSize: "0.8rem", color: "#666", lineHeight: 1.7 }}>
              ・発送時の配送会社・追跡番号のご連絡<br />
              ・ご注文確認メール<br />
              ・その他ご連絡が必要な場合のみ使用します<br />
              ・第三者への提供は行いません
            </p>
          </div>

          <button
            onClick={() => liff.closeWindow()}
            style={btnStyle("#06C755")}
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  // ===== INTRO =====
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📦</div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#222", marginBottom: "0.5rem" }}>
            発送通知メールの登録
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.6 }}>
            木軸ペン工房 金杢犀
          </p>
        </div>

        {/* 説明 */}
        <div style={{ background: "#f9f9f9", borderRadius: 10, padding: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
          <p style={{ fontSize: "0.85rem", color: "#444", lineHeight: 1.8, marginBottom: "0.75rem" }}>
            ご注文後、以下のタイミングでメールをお送りします：
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[
              { icon: "✉️", text: "ご注文確認メール" },
              { icon: "🚚", text: "発送通知（追跡番号・配送業者）", sub: "ヤマト運輸・佐川急便" },
              { icon: "📩", text: "お問い合わせへの回答が必要な場合" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <span style={{ fontSize: "0.85rem", color: "#333" }}>{item.text}</span>
                  {item.sub && (
                    <span style={{ fontSize: "0.75rem", color: "#888", marginLeft: "0.25rem" }}>({item.sub})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* プライバシー */}
        <div style={{ background: "#fffbf0", border: "1px solid #fce8a0", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.5rem", textAlign: "left" }}>
          <p style={{ fontSize: "0.78rem", color: "#886600", lineHeight: 1.7 }}>
            🔒 取得したメールアドレスは発送・注文管理のみに使用します。セール案内などのマーケティングメールには使用しません。
          </p>
        </div>

        {/* ボタン */}
        <button onClick={handleRegister} style={btnStyle("#06C755")}>
          LINEアカウントのメールアドレスで登録する
        </button>

        <p style={{ fontSize: "0.75rem", color: "#bbb", marginTop: "1rem" }}>
          登録をキャンセルする場合はウィンドウを閉じてください
        </p>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f0f0f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: "2rem 1.5rem",
  maxWidth: 400,
  width: "100%",
  textAlign: "center",
  boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    padding: "0.9rem",
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "0.5rem",
  };
}
