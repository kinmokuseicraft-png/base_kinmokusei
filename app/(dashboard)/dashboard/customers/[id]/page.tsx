"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Sparkles, Copy, Check, Loader2, Send, RotateCcw } from "lucide-react";

// ─── 型 ──────────────────────────────────────────────
type LogEntry = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  page: string;
  created_at: string;
};

type ProductInfo = {
  base_item_id: number;
  title: string | null;
  image_url: string | null;
  line_display_image_url: string | null;
};

type UserInfo = {
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  status: string;
  created_at: string;
};

type DetailData = {
  user: UserInfo | null;
  logs: LogEntry[];
  event_counts: Record<string, number>;
  products: Record<string, ProductInfo>;
};

type AdviceResult = {
  customer_type: string;
  recommended_woods: { title: string; reason: string }[];
  story_direction: string;
  line_message: string;
};

// ─── 定数 ────────────────────────────────────────────
const EVENT_LABEL: Record<string, string> = {
  page_view: "ページ閲覧",
  scroll_depth: "スクロール",
  news_tap: "お知らせタップ",
  product_click: "商品クリック",
  video_play: "動画再生",
  wood_tap: "銘木タップ",
};

const EVENT_COLOR: Record<string, string> = {
  page_view: "#6B7280",
  scroll_depth: "#9CA3AF",
  news_tap: "#C4965A",
  product_click: "#4ade80",
  video_play: "#60a5fa",
  wood_tap: "#f472b6",
};

// ─── ユーティリティ ──────────────────────────────────
function formatDatetime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getEventDetail(log: LogEntry): string {
  const d = log.event_data ?? {};
  if (log.event_type === "scroll_depth") return `${d.depth ?? ""}% 到達`;
  if (log.event_type === "news_tap") return String(d.title ?? d.category ?? "");
  if (log.event_type === "product_click") return String(d.title ?? d.item_id ?? "");
  if (log.event_type === "video_play") return d.muted === false ? "音あり再生" : "ミュート再生";
  if (log.event_type === "wood_tap") return String(d.wood_name ?? "");
  return "";
}

// ─── チャット履歴の型 ────────────────────────────────
type ChatMessage = { role: "user" | "assistant"; content: string };

// ─── AdviceCard サブコンポーネント ───────────────────
function AdviceCard({ advice }: { advice: AdviceResult }) {
  const [copied, setCopied] = useState(false);

  const copyMessage = () => {
    navigator.clipboard.writeText(advice.line_message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ borderTop: "1px solid rgba(196,150,90,0.2)" }} />

      {/* 顧客タイプ */}
      <div>
        <div style={labelStyle}>顧客タイプ</div>
        <p style={{ fontSize: "0.85rem", lineHeight: 1.9, color: "var(--color-text)", fontFamily: "var(--font-serif)" }}>
          {advice.customer_type}
        </p>
      </div>

      {/* おすすめ銘木 */}
      <div>
        <div style={labelStyle}>おすすめの銘木</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {advice.recommended_woods.map((w, i) => (
            <div
              key={i}
              style={{
                background: "rgba(196,150,90,0.07)",
                border: "1px solid rgba(196,150,90,0.18)",
                padding: "9px 12px",
              }}
            >
              <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-serif)", marginBottom: "3px" }}>
                {w.title}
              </div>
              <div style={{ fontSize: "0.77rem", color: "var(--color-text-muted)", lineHeight: 1.65 }}>
                {w.reason}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 物語の方向性 */}
      <div>
        <div style={labelStyle}>次の物語の方向性</div>
        <p style={{ fontSize: "0.82rem", lineHeight: 1.85, color: "var(--color-text-muted)", fontStyle: "italic" }}>
          {advice.story_direction}
        </p>
      </div>

      {/* LINEメッセージ草案 */}
      <div>
        <div style={labelStyle}>個別メッセージ草案</div>
        <div
          style={{
            background: "rgba(196,150,90,0.06)",
            border: "1px solid rgba(196,150,90,0.22)",
            padding: "var(--space-3)",
            position: "relative",
          }}
        >
          <div
            style={{ position: "absolute", top: 8, right: 10, opacity: 0.12, fontSize: "1.1rem", lineHeight: 1 }}
          >
            ✍
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              lineHeight: 2,
              color: "var(--color-text)",
              fontFamily: "var(--font-serif)",
              whiteSpace: "pre-wrap",
              marginBottom: "var(--space-2)",
            }}
          >
            {advice.line_message}
          </p>
          <button
            onClick={copyMessage}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.78rem",
              color: copied ? "#6ee7b7" : "rgba(196,150,90,0.8)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "color 0.2s",
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "コピーしました" : "クリップボードにコピー"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ラベルの共通スタイル
const labelStyle: React.CSSProperties = {
  fontSize: "0.68rem",
  letterSpacing: "0.16em",
  color: "rgba(196,150,90,0.75)",
  fontWeight: 600,
  marginBottom: "6px",
  textTransform: "uppercase",
};

// ─── AIアドバイザーパネル（チャット対応版）────────────
function AdvicePanel({ lineUserId }: { lineUserId: string }) {
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // チャット履歴（表示用: ユーザーの入力のみ）
  const [userMessages, setUserMessages] = useState<string[]>([]);

  // API 呼び出しの共通ロジック
  const callAdvice = async (newHistory: ChatMessage[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${encodeURIComponent(lineUserId)}/advice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: newHistory }),
          cache: "no-store",
        }
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "生成に失敗しました");

      // 初回: API が返した initialUserPrompt を history の先頭に追加
      if (newHistory.length === 0 && data.initialUserPrompt) {
        setHistory([
          { role: "user", content: data.initialUserPrompt },
          { role: "assistant", content: data.assistantMessage },
        ]);
      } else {
        // 追加指示: history に assistant の回答を追記
        setHistory((prev) => [
          ...prev,
          { role: "assistant", content: data.assistantMessage },
        ]);
      }

      setAdvice(data.advice as AdviceResult);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  // 初回生成
  const generate = () => callAdvice([]);

  // リセット
  const reset = () => {
    setAdvice(null);
    setHistory([]);
    setUserMessages([]);
    setChatInput("");
    setError(null);
  };

  // 追加指示を送信
  const sendInstruction = async () => {
    const instruction = chatInput.trim();
    if (!instruction || loading) return;
    setChatInput("");
    setUserMessages((prev) => [...prev, instruction]);
    // history に user の追加指示を追記してから API 呼び出し
    const newHistory: ChatMessage[] = [
      ...history,
      { role: "user", content: instruction },
    ];
    setHistory(newHistory);
    await callAdvice(newHistory);
  };

  // Enter キー送信（Shift+Enter は改行）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendInstruction();
    }
  };

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        padding: "var(--space-4)",
      }}
    >

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <Sparkles size={16} color="#C4965A" />
        <h2
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#C4965A",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "var(--font-serif)",
            flex: 1,
          }}
        >
          AI接客アドバイザー
        </h2>
        {/* リセットボタン（生成後のみ表示） */}
        {advice && (
          <button
            onClick={reset}
            title="最初からやり直す"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* 初回説明文 */}
      {!advice && (
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.7,
            marginBottom: "var(--space-3)",
          }}
        >
          行動ログを解析し、職人・Tsubasaの視点で
          <br />
          この方への最適な接客提案を生成します。
        </p>
      )}

      {/* 初回生成ボタン */}
      {!advice && (
        <button
          onClick={generate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "var(--space-2) var(--space-3)",
            background: loading ? "rgba(196,150,90,0.15)" : "rgba(196,150,90,0.2)",
            border: "1px solid rgba(196,150,90,0.4)",
            color: "#E8C98A",
            fontSize: "0.875rem",
            fontWeight: 600,
            fontFamily: "var(--font-serif)",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            transition: "background 0.2s",
            letterSpacing: "0.05em",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              思案中…
            </>
          ) : (
            <>
              <Sparkles size={14} />
              提案を生成
            </>
          )}
        </button>
      )}

      {error && (
        <p style={{ marginTop: "var(--space-2)", fontSize: "0.78rem", color: "#f87171" }}>
          {error}
        </p>
      )}

      {/* AI提案カード */}
      {advice && <AdviceCard advice={advice} />}

      {/* ローディング（追加指示中） */}
      {loading && advice && (
        <div
          style={{
            marginTop: "var(--space-3)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#C4965A",
            fontSize: "0.82rem",
            fontFamily: "var(--font-serif)",
          }}
        >
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          思案中…
        </div>
      )}

      {/* ─── チャット入力欄（初回生成後のみ表示）─── */}
      {advice && !loading && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <div style={{ borderTop: "1px solid rgba(196,150,90,0.15)", marginBottom: "var(--space-3)" }} />

          {/* 過去の指示履歴（最新3件） */}
          {userMessages.length > 0 && (
            <div style={{ marginBottom: "var(--space-2)", display: "flex", flexDirection: "column", gap: "4px" }}>
              {userMessages.slice(-3).map((msg, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                    padding: "4px 10px",
                    background: "rgba(255,255,255,0.03)",
                    borderLeft: "2px solid rgba(196,150,90,0.3)",
                  }}
                >
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* 入力フォーム */}
          <div style={{ position: "relative" }}>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"例: もう少し親しみやすい敬語にして\n例: 黒柿を勧めたい"}
              rows={3}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,150,90,0.25)",
                color: "var(--color-text)",
                fontSize: "0.82rem",
                fontFamily: "var(--font-serif)",
                lineHeight: 1.7,
                padding: "10px 40px 10px 12px",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={sendInstruction}
              disabled={!chatInput.trim()}
              title="送信（Enter）"
              style={{
                position: "absolute",
                bottom: 10,
                right: 10,
                background: chatInput.trim() ? "rgba(196,150,90,0.3)" : "transparent",
                border: "1px solid rgba(196,150,90,0.3)",
                color: chatInput.trim() ? "#E8C98A" : "var(--color-text-muted)",
                width: 28,
                height: 28,
                cursor: chatInput.trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              <Send size={13} />
            </button>
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
            Enter で送信・Shift+Enter で改行
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        textarea::placeholder { color: rgba(160,140,120,0.5); }
        textarea:focus { border-color: rgba(196,150,90,0.5) !important; }
      `}</style>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export default function CustomerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/customers/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: DetailData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div>
        <p style={{ color: "var(--color-text-muted)" }}>読み込み中…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <p style={{ color: "var(--color-text-muted)" }}>データが見つかりません。</p>
      </div>
    );
  }

  const { user, logs, event_counts, products } = data;

  const chartData = Object.entries(event_counts)
    .map(([key, count]) => ({ name: EVENT_LABEL[key] ?? key, count, key }))
    .sort((a, b) => b.count - a.count);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* ← 戻る */}
      <Link
        href="/dashboard/customers"
        style={{
          fontSize: "0.85rem",
          color: "var(--color-text-muted)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          marginBottom: "var(--space-4)",
        }}
      >
        ← 顧客カルテ一覧
      </Link>

      {/* ユーザーヘッダー */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          marginBottom: "var(--space-5)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          padding: "var(--space-4)",
        }}
      >
        {user?.picture_url ? (
          <Image
            src={user.picture_url}
            alt=""
            width={56}
            height={56}
            style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--color-border)",
              flexShrink: 0,
            }}
          />
        )}
        <div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              fontFamily: "var(--font-serif)",
              marginBottom: "0.25rem",
            }}
          >
            {user?.display_name ?? "未登録ユーザー"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
            {id}
          </div>
          {user?.created_at && (
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
              LINE登録: {formatDatetime(user.created_at)}
            </div>
          )}
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-line)" }}>
            {logs.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>行動数</div>
        </div>
      </div>

      {/* 3カラム: グラフ | タイムライン | AIアドバイザー */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 280px",
          gap: "var(--space-4)",
          alignItems: "stretch",
        }}
      >
        {/* 左: 興味関心グラフ */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            padding: "var(--space-4)",
          }}
        >
          <h2
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-3)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            興味関心分布
          </h2>
          {chartData.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>データなし</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.8rem",
                  }}
                  formatter={(v: number) => [`${v}回`, "回数"]}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={EVENT_COLOR[entry.key] ?? "var(--color-line)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "6px" }}>
            {chartData.map((entry) => (
              <div key={entry.key} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: EVENT_COLOR[entry.key] ?? "var(--color-line)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--color-text-muted)" }}>{entry.name}</span>
                <span style={{ marginLeft: "auto", fontWeight: 600 }}>{entry.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 中央: タイムライン */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            padding: "var(--space-4)",
            overflowY: "auto",
          }}
        >
          <h2
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-3)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              position: "sticky",
              top: 0,
              background: "var(--color-surface)",
              paddingBottom: "var(--space-2)",
            }}
          >
            行動タイムライン
          </h2>

          {logs.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>ログがありません</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {logs.map((log) => {
                const productId = String(
                  (log.event_data as Record<string, unknown>)?.item_id ??
                  (log.event_data as Record<string, unknown>)?.product_id ??
                  ""
                );
                const product = productId ? products[productId] : null;
                const detail = getEventDetail(log);
                const color = EVENT_COLOR[log.event_type] ?? "#9CA3AF";

                return (
                  <div
                    key={log.id}
                    style={{
                      display: "flex",
                      gap: "var(--space-3)",
                      padding: "var(--space-2) 0",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                        width: 72,
                        paddingTop: 2,
                        fontFamily: "monospace",
                      }}
                    >
                      {formatDatetime(log.created_at)}
                    </div>
                    <div style={{ flexShrink: 0, paddingTop: 6 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: color,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                        {EVENT_LABEL[log.event_type] ?? log.event_type}
                      </div>
                      {detail && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-muted)",
                            marginTop: "2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {detail}
                        </div>
                      )}
                      {product && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            marginTop: "var(--space-1)",
                          }}
                        >
                          {(product.line_display_image_url ?? product.image_url) && (
                            <img
                              src={product.line_display_image_url ?? product.image_url!}
                              alt=""
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: "cover",
                                border: "1px solid var(--color-border)",
                              }}
                            />
                          )}
                          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                            {product.title ?? "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右: AIアドバイザー */}
        <AdvicePanel lineUserId={id} />
      </div>
    </div>
  );
}
