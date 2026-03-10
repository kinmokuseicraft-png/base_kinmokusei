"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type ChatMessage = { id: string; direction: "in" | "out"; text: string; created_at: string };

type BaseProduct = {
  item_id: number;
  title: string;
  price: number;
  images?: { origin?: string; img_300?: string }[];
  detail?: string;
};

type CustomerData = {
  user: { display_name: string | null; picture_url: string | null; status: string | null; created_at: string } | null;
  logs: { id: string; event_type: string; event_data: Record<string, unknown>; page: string | null; created_at: string }[];
  event_counts: Record<string, number>;
  products: Record<string, { title: string | null; image_url: string | null }>;
};

const STORY_TEMPLATES = [
  {
    label: "木の記憶",
    text: "木には、長い年月をかけて積み重なった記憶があります。杢目のひとつひとつが、その木が過ごした時間の証し。手に取るたびに、自然の物語を感じていただけると嬉しいです。",
  },
  {
    label: "ご注文御礼",
    text: "このたびはご注文いただき、誠にありがとうございます。丁寧に仕上げてお届けしますので、到着までしばらくお待ちくださいませ。",
  },
  {
    label: "銘木のご紹介",
    text: "金杢犀では、世界各地から厳選した銘木を使用しています。それぞれ一点物の杢目をお楽しみいただけます。ご興味のある樹種がございましたらお気軽にお問い合わせください。",
  },
  {
    label: "アフターケア",
    text: "木軸ペンは、定期的にウッドワックスやオイルでお手入れいただくと、より美しく育ちます。ご不明な点があればいつでもご相談ください。",
  },
];

function ChatContent() {
  const searchParams = useSearchParams();
  const lineUserId = searchParams.get("line_user_id") ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ display_name: string | null; picture_url: string | null } | null>(null);

  // AI アシスト
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const prevLastInbound = useRef<string>("");

  // 作品提案モーダル
  const [showProductModal, setShowProductModal] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<BaseProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  // 物語メニュー
  const [showStoryMenu, setShowStoryMenu] = useState(false);

  // カルテオーバーレイ
  const [showKarte, setShowKarte] = useState(false);
  const [karteData, setKarteData] = useState<CustomerData | null>(null);
  const [karteLoading, setKarteLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // --------- AI アシスト生成 ---------
  const generateAI = useCallback(async (msgs: ChatMessage[]) => {
    if (!lineUserId || msgs.length === 0) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/chat/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_user_id: lineUserId, messages: msgs.slice(-10) }),
      });
      const data = await res.json() as { suggestion?: string };
      if (data.suggestion) setAiSuggestion(data.suggestion);
    } catch {
      // ignore
    } finally {
      setAiLoading(false);
    }
  }, [lineUserId]);

  // --------- メッセージ取得 ---------
  const fetchMessages = useCallback(async (silent = false) => {
    if (!lineUserId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/chat/history?line_user_id=${encodeURIComponent(lineUserId)}`, { cache: "no-store" });
      const data = await res.json() as { messages?: ChatMessage[] };
      const fetched = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(fetched);

      // 直近のインバウンドメッセージが変わったらAI生成
      const lastIn = [...fetched].reverse().find((m) => m.direction === "in");
      if (lastIn && lastIn.id !== prevLastInbound.current) {
        prevLastInbound.current = lastIn.id;
        generateAI(fetched);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lineUserId, generateAI]);

  // --------- ユーザー情報取得 ---------
  useEffect(() => {
    if (!lineUserId) { setLoading(false); return; }
    fetchMessages();
  }, [lineUserId, fetchMessages]);

  useEffect(() => {
    if (!lineUserId) return;
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { users?: { line_user_id: string; display_name: string | null; picture_url: string | null }[] }) => {
        const u = (d?.users ?? []).find((x) => x.line_user_id === lineUserId);
        setUser(u ? { display_name: u.display_name, picture_url: u.picture_url } : null);
      })
      .catch(() => setUser(null));
  }, [lineUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --------- 送信 ---------
  const send = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || sending || !lineUserId) return;
    setSending(true);
    fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_user_id: lineUserId, text: t }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setInput("");
          setAiSuggestion("");
          setMessages((prev) => [
            ...prev,
            { id: `tmp-${Date.now()}`, direction: "out", text: t, created_at: new Date().toISOString() },
          ]);
        } else {
          alert(data.error ?? "送信に失敗しました");
        }
      })
      .catch(() => alert("送信に失敗しました"))
      .finally(() => setSending(false));
  };

  // --------- 商品検索 ---------
  const searchProducts = async (q: string) => {
    setProductLoading(true);
    try {
      const res = await fetch(`/api/base/products?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const data = await res.json() as { products?: BaseProduct[] };
      setProductResults(data.products?.slice(0, 12) ?? []);
    } catch {
      setProductResults([]);
    } finally {
      setProductLoading(false);
    }
  };

  const insertProduct = (p: BaseProduct) => {
    const productUrl = `https://kinmokuseijp.base.shop/items/${p.item_id}`;
    setInput(`【${p.title}】\n¥${p.price.toLocaleString()}\n${productUrl}`);
    setShowProductModal(false);
  };

  // --------- カルテ取得 ---------
  const openKarte = async () => {
    setShowKarte(true);
    if (karteData) return;
    setKarteLoading(true);
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(lineUserId)}`, { cache: "no-store" });
      const data = await res.json() as CustomerData;
      setKarteData(data);
    } catch {
      setKarteData(null);
    } finally {
      setKarteLoading(false);
    }
  };

  if (!lineUserId) {
    return (
      <div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>個別メッセージ</h1>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>顧客一覧からユーザーを選んでチャットを開いてください。</p>
        <Link href="/dashboard/users" style={{ color: "var(--color-line)", fontWeight: 500 }}>← 顧客一覧へ</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 5rem)", gap: "var(--space-3)" }}>
      {/* ===== メインチャット ===== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* ヘッダー */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-2)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <Link href="/dashboard/users" style={{ fontSize: "0.85rem", color: "var(--color-line)", fontWeight: 500 }}>
            ← 一覧
          </Link>
          {user?.picture_url ? (
            <Image src={user.picture_url} alt="" width={34} height={34} style={{ borderRadius: "50%", objectFit: "cover" }} quality={85} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--color-border)" }} />
          )}
          <span style={{ fontWeight: 600 }}>{user?.display_name ?? lineUserId.slice(0, 12) + "…"}</span>

          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {/* 更新ボタン */}
            <button
              type="button"
              onClick={() => fetchMessages(true)}
              disabled={refreshing}
              title="最新メッセージを取得"
              style={{
                fontSize: "0.8rem",
                padding: "3px 10px",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-muted)",
                cursor: refreshing ? "not-allowed" : "pointer",
              }}
            >
              {refreshing ? "取得中…" : "↻ 更新"}
            </button>
            {/* カルテボタン */}
            <button
              type="button"
              onClick={openKarte}
              style={{
                fontSize: "0.8rem",
                padding: "3px 10px",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              カルテ →
            </button>
          </div>
        </div>

        {/* メッセージ一覧 */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {loading && <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>読み込み中…</p>}
          {!loading && messages.length === 0 && (
            <p style={{ color: "var(--color-text-muted)", textAlign: "center", marginTop: "1rem" }}>まだメッセージがありません。</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.direction === "out" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                padding: "var(--space-2) var(--space-3)",
                background: m.direction === "out" ? "var(--color-chat-out)" : "var(--color-chat-in)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: "0.9rem", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{m.text || "（本文なし）"}</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "0.25rem" }}>
                {new Date(m.created_at).toLocaleString("ja-JP")}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* AI返信案 */}
        {(aiLoading || aiSuggestion) && (
          <div
            style={{
              marginTop: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              display: "flex",
              gap: "var(--space-2)",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", marginTop: "2px" }}>AI案</span>
            {aiLoading ? (
              <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>生成中…</span>
            ) : (
              <>
                <span style={{ fontSize: "0.85rem", flex: 1, whiteSpace: "pre-wrap" }}>{aiSuggestion}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => { setInput(aiSuggestion); setAiSuggestion(""); }}
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      background: "var(--color-line)",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => send(aiSuggestion)}
                    disabled={sending}
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      background: "#2ecc71",
                      color: "#fff",
                      border: "none",
                      cursor: sending ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    送信
                  </button>
                  <button
                    type="button"
                    onClick={() => generateAI(messages)}
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      background: "transparent",
                      color: "var(--color-text-muted)",
                      border: "1px solid var(--color-border)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    再生成
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ツールバー */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: "var(--space-2)",
            paddingBottom: "var(--space-1)",
            borderBottom: "1px solid var(--color-border)",
            position: "relative",
          }}
        >
          <button
            type="button"
            onClick={() => { setShowProductModal(true); setShowStoryMenu(false); }}
            style={toolbarBtnStyle}
          >
            作品提案
          </button>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => { setShowStoryMenu((p) => !p); setShowProductModal(false); }}
              style={toolbarBtnStyle}
            >
              物語挿入
            </button>
            {showStoryMenu && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: 0,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  zIndex: 50,
                  minWidth: 180,
                }}
              >
                {STORY_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => { setInput(t.text); setShowStoryMenu(false); }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "var(--space-2) var(--space-3)",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--color-border)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => generateAI(messages)}
            disabled={aiLoading}
            style={{ ...toolbarBtnStyle, opacity: aiLoading ? 0.5 : 1 }}
          >
            {aiLoading ? "AI生成中…" : "AI再生成"}
          </button>
        </div>

        {/* 入力エリア */}
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="メッセージを入力（Shift+Enterで改行）"
            rows={3}
            style={{
              flex: 1,
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border-strong)",
              fontSize: "0.95rem",
              background: "var(--color-surface)",
              resize: "none",
              fontFamily: "inherit",
              color: "var(--color-text)",
            }}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={sending || !input.trim()}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "var(--color-line)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: sending || !input.trim() ? "not-allowed" : "pointer",
              alignSelf: "stretch",
            }}
          >
            {sending ? "送信中…" : "送信"}
          </button>
        </div>
      </div>

      {/* ===== カルテオーバーレイ ===== */}
      {showKarte && (
        <div
          style={{
            width: 320,
            flexShrink: 0,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>顧客カルテ</span>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Link
                href={`/dashboard/customers/${encodeURIComponent(lineUserId)}`}
                style={{ fontSize: "0.75rem", color: "var(--color-line)" }}
              >
                詳細 →
              </Link>
              <button
                type="button"
                onClick={() => setShowKarte(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "1rem" }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "var(--space-3)" }}>
            {karteLoading && <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>読み込み中…</p>}
            {karteData && (
              <>
                {/* プロフィール */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                  {karteData.user?.picture_url ? (
                    <Image
                      src={karteData.user.picture_url}
                      alt=""
                      width={48}
                      height={48}
                      quality={90}
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--color-border)" }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{karteData.user?.display_name ?? "名前未取得"}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      {karteData.user?.created_at ? `登録: ${new Date(karteData.user.created_at).toLocaleDateString("ja-JP")}` : ""}
                    </div>
                  </div>
                </div>

                {/* アクション集計 */}
                {Object.keys(karteData.event_counts).length > 0 && (
                  <div style={{ marginBottom: "var(--space-3)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "var(--space-1)", textTransform: "uppercase" }}>
                      行動サマリー
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                      {Object.entries(karteData.event_counts).map(([k, v]) => (
                        <span
                          key={k}
                          style={{
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 閲覧商品 */}
                {Object.values(karteData.products).length > 0 && (
                  <div style={{ marginBottom: "var(--space-3)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase" }}>
                      閲覧した商品
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      {Object.entries(karteData.products).map(([id, p]) => (
                        <div key={id} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                          {p.image_url && (
                            <Image
                              src={p.image_url}
                              alt={p.title ?? ""}
                              width={52}
                              height={52}
                              quality={90}
                              style={{ objectFit: "cover", border: "1px solid var(--color-border)" }}
                            />
                          )}
                          <span style={{ fontSize: "0.8rem" }}>{p.title ?? id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 最近のログ */}
                {karteData.logs.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "var(--space-1)", textTransform: "uppercase" }}>
                      最近のアクション
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {karteData.logs.slice(0, 10).map((log) => (
                        <div key={log.id} style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", paddingBottom: "4px" }}>
                          <span style={{ color: "var(--color-text)", marginRight: "6px" }}>{log.event_type}</span>
                          {new Date(log.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {karteData.logs.length === 0 && Object.keys(karteData.event_counts).length === 0 && (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>まだ行動ログがありません。</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== 作品提案モーダル ===== */}
      {showProductModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowProductModal(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              width: 520,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--color-border)", display: "flex", gap: "var(--space-2)" }}>
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProducts(productQuery)}
                placeholder="商品名・キーワードで検索"
                autoFocus
                style={{
                  flex: 1,
                  padding: "var(--space-2) var(--space-3)",
                  border: "1px solid var(--color-border-strong)",
                  background: "var(--color-bg)",
                  fontSize: "0.9rem",
                  color: "var(--color-text)",
                }}
              />
              <button
                type="button"
                onClick={() => searchProducts(productQuery)}
                style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-line)", color: "#fff", border: "none", cursor: "pointer" }}
              >
                検索
              </button>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "var(--space-3)" }}>
              {productLoading && <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>検索中…</p>}
              {!productLoading && productResults.length === 0 && productQuery && (
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>該当する商品がありません。</p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                {productResults.map((p) => (
                  <button
                    key={p.item_id}
                    type="button"
                    onClick={() => insertProduct(p)}
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: "var(--space-2)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-1)",
                    }}
                  >
                    {p.images?.[0]?.img_300 && (
                      <Image
                        src={p.images[0].img_300}
                        alt={p.title}
                        width={220}
                        height={165}
                        quality={90}
                        style={{ width: "100%", height: 120, objectFit: "cover" }}
                      />
                    )}
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text)" }}>{p.title}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>¥{p.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  padding: "4px 12px",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  cursor: "pointer",
  fontWeight: 500,
};

export default function ChatPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--color-text-muted)", padding: "1rem" }}>読み込み中…</p>}>
      <ChatContent />
    </Suspense>
  );
}
