"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type CustomerSummary = {
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  last_visit: string;
  top_interest: string;
  total_events: number;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { customers?: CustomerSummary[] }) => {
        setCustomers(Array.isArray(d?.customers) ? d.customers : []);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-serif)", marginBottom: "0.5rem" }}>
          顧客カルテ
        </h1>
        <p style={{ color: "var(--color-text-muted)" }}>読み込み中…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontFamily: "var(--font-serif)",
            marginBottom: "var(--space-1)",
          }}
        >
          顧客カルテ
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          LPを訪れたユーザーの行動履歴。最終訪問が新しい順。
        </p>
      </div>

      {customers.length === 0 ? (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            padding: "3rem",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          まだ訪問データがありません。LPを公開するとここに表示されます。
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--color-surface-alt)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {["", "表示名", "最終訪問", "主な興味関心", "行動数", ""].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.line_user_id}
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                    className="users-table-row"
                  >
                    {/* アバター */}
                    <td style={{ padding: "var(--space-3) var(--space-4)", width: 48 }}>
                      {c.picture_url ? (
                        <Image
                          src={c.picture_url}
                          alt=""
                          width={36}
                          height={36}
                          style={{ borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--color-border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          ?
                        </div>
                      )}
                    </td>

                    {/* 表示名 */}
                    <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {c.display_name ?? (
                        <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
                          未登録
                        </span>
                      )}
                    </td>

                    {/* 最終訪問 */}
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontSize: "0.875rem",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(c.last_visit)}
                    </td>

                    {/* 興味関心 */}
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          fontSize: "0.75rem",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-line)",
                          fontWeight: 500,
                        }}
                      >
                        {c.top_interest}
                      </span>
                    </td>

                    {/* 行動数 */}
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontSize: "0.875rem",
                        color: "var(--color-text-muted)",
                        textAlign: "right",
                      }}
                    >
                      {c.total_events}回
                    </td>

                    {/* カルテへ */}
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                      <Link
                        href={`/dashboard/customers/${encodeURIComponent(c.line_user_id)}`}
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-line)",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        カルテ →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
