"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Customer = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  status: string;
  created_at: string;
  tags?: string[] | null;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function UsersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { users?: Customer[] }) => {
        const list = Array.isArray(data?.users) ? data.users : [];
        setCustomers(list);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>顧客一覧</h1>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          読み込み中…
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        顧客一覧
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
        LINE でメッセージをやり取りした顧客（Supabase line_users から実データ取得）
      </p>

      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "480px",
            }}
          >
            <thead>
              <tr style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600 }}>
                  アイコン
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600 }}>
                  表示名
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600 }}>
                  状態
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600 }}>
                  登録日
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600 }}>
                  LINE ID
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <td style={{ padding: "0.75rem 1rem" }}>
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
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>
                    {c.display_name ?? "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.8rem",
                        background:
                          c.status === "active"
                            ? "rgba(45, 80, 22, 0.15)"
                            : "var(--color-bg)",
                        color:
                          c.status === "active"
                            ? "var(--color-primary)"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {c.status === "active" ? "有効" : c.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                    {formatDate(c.created_at)}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                    {c.line_user_id.slice(0, 12)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {customers.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
          顧客データがありません
        </p>
      )}
    </div>
  );
}
