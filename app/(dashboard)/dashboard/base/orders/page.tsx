"use client";

import { useEffect, useState } from "react";
import { Send, RefreshCw, CheckCircle, AlertCircle, User } from "lucide-react";

const STATUS_LABEL: Record<number, string> = {
  1: "未確認",
  2: "確認済み",
  3: "発送済み",
  4: "キャンセル",
};

type LineUser = { line_user_id: string; display_name: string } | null;

type OrderProduct = {
  item_id: number;
  title: string;
  variation: string | null;
  num: number;
  price: number;
};

type Order = {
  unique_key: string;
  order_date: string;
  order_status: number;
  customer_name: string;
  customer_mail: string | null;
  total_price: number;
  ordered_products: OrderProduct[];
  delivery_tracking_number: string | null;
  delivery_service_name: string | null;
  line_user: LineUser;
};

type NotifyState = "idle" | "sending" | "success" | "error";

export default function BaseOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("2"); // デフォルト: 確認済み
  const [notifyState, setNotifyState] = useState<Record<string, NotifyState>>({});
  const [notifyMsg, setNotifyMsg] = useState<Record<string, string>>({});
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  const fetchOrders = (status = statusFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ status, limit: "50" });
    fetch(`/api/base/orders?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d?.orders) ? d.orders : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendNotify = async (order: Order) => {
    const key = order.unique_key;
    setNotifyState((p) => ({ ...p, [key]: "sending" }));
    setNotifyMsg((p) => ({ ...p, [key]: "" }));

    const res = await fetch("/api/base/orders/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unique_key: key,
        tracking_number: trackingInputs[key]?.trim() || undefined,
      }),
    }).catch(() => null);

    if (!res) {
      setNotifyState((p) => ({ ...p, [key]: "error" }));
      setNotifyMsg((p) => ({ ...p, [key]: "通信エラー" }));
      return;
    }

    const data = await res.json();
    if (res.ok && data.ok) {
      setNotifyState((p) => ({ ...p, [key]: "success" }));
      setNotifyMsg((p) => ({ ...p, [key]: "送信しました" }));
    } else {
      setNotifyState((p) => ({ ...p, [key]: "error" }));
      setNotifyMsg((p) => ({ ...p, [key]: data.error ?? "送信失敗" }));
    }
  };

  return (
    <div>
      <h1
        style={{
          fontSize: "1.5rem",
          fontFamily: "var(--font-serif)",
          color: "var(--color-text)",
          marginBottom: "var(--space-2)",
        }}
      >
        注文管理 · 発送通知
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)", fontSize: "0.9rem" }}>
        BASE の注文一覧です。LINE 紐付き顧客には発送通知を直接送信できます。
      </p>

      {/* フィルター */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
        {Object.entries(STATUS_LABEL).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => {
              setStatusFilter(val);
              fetchOrders(val);
            }}
            style={{
              padding: "var(--space-1) var(--space-3)",
              border: `1px solid ${statusFilter === val ? "var(--color-line)" : "var(--color-border-strong)"}`,
              background: statusFilter === val ? "var(--color-line)" : "var(--color-surface)",
              color: statusFilter === val ? "#fff" : "var(--color-text)",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: statusFilter === val ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => fetchOrders()}
          disabled={loading}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "var(--space-1) var(--space-3)",
            border: "1px solid var(--color-border-strong)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "0.85rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={14} strokeWidth={1.5} />
          更新
        </button>
      </div>

      {/* 注文リスト */}
      {loading && (
        <p style={{ color: "var(--color-text-muted)", padding: "var(--space-6)", textAlign: "center" }}>
          取得中…
        </p>
      )}
      {!loading && orders.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", padding: "var(--space-6)", textAlign: "center" }}>
          該当する注文がありません
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {orders.map((order) => {
          const state = notifyState[order.unique_key] ?? "idle";
          const canNotify = !!order.line_user && state !== "sending" && state !== "success";

          return (
            <div
              key={order.unique_key}
              style={{
                padding: "var(--space-4)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              {/* ヘッダー */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-3)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "2px" }}>
                    {order.order_date?.slice(0, 10)} · {order.unique_key}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-text)" }}>
                    {order.customer_name}
                  </div>
                  {order.customer_mail && (
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {order.customer_mail}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "2px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      border: "1px solid var(--color-border-strong)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {STATUS_LABEL[order.order_status] ?? `状態${order.order_status}`}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text)" }}>
                    ¥{order.total_price.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 商品 */}
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
                {order.ordered_products.map((p, i) => (
                  <div key={i}>
                    {p.title}{p.variation ? `（${p.variation}）` : ""} × {p.num}
                  </div>
                ))}
              </div>

              {/* LINE 紐付け状況 + 通知 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  flexWrap: "wrap",
                  paddingTop: "var(--space-3)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                {/* LINE ユーザー状態 */}
                {order.line_user ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      fontSize: "0.8rem",
                      color: "var(--color-line)",
                    }}
                  >
                    <User size={14} strokeWidth={1.5} />
                    {order.line_user.display_name}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      fontSize: "0.8rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <User size={14} strokeWidth={1.5} />
                    LINE未紐付け
                  </div>
                )}

                {/* 追跡番号 */}
                <input
                  type="text"
                  placeholder="追跡番号（任意）"
                  value={trackingInputs[order.unique_key] ?? order.delivery_tracking_number ?? ""}
                  onChange={(e) =>
                    setTrackingInputs((p) => ({ ...p, [order.unique_key]: e.target.value }))
                  }
                  style={{
                    flex: "1 1 160px",
                    minWidth: 0,
                    padding: "var(--space-1) var(--space-2)",
                    border: "1px solid var(--color-border-strong)",
                    fontSize: "0.8rem",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                  }}
                />

                {/* 送信ボタン */}
                <button
                  type="button"
                  onClick={() => sendNotify(order)}
                  disabled={!canNotify}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "var(--space-1) var(--space-3)",
                    background: canNotify ? "var(--color-line)" : "var(--color-border-strong)",
                    color: "#fff",
                    border: "none",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: canNotify ? "pointer" : "not-allowed",
                    opacity: order.line_user ? 1 : 0.5,
                  }}
                >
                  {state === "sending" ? (
                    <RefreshCw size={14} strokeWidth={1.5} />
                  ) : state === "success" ? (
                    <CheckCircle size={14} strokeWidth={1.5} />
                  ) : (
                    <Send size={14} strokeWidth={1.5} />
                  )}
                  {state === "sending"
                    ? "送信中…"
                    : state === "success"
                    ? "送信済み"
                    : "LINE発送通知"}
                </button>

                {/* 結果メッセージ */}
                {notifyMsg[order.unique_key] && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.8rem",
                      color:
                        state === "success" ? "var(--color-line)" : "var(--color-error, #c00)",
                    }}
                  >
                    {state === "error" && <AlertCircle size={13} strokeWidth={1.5} />}
                    {notifyMsg[order.unique_key]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
