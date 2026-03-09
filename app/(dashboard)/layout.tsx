import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConsoleSidebar from "@/components/ConsoleSidebar";

export const dynamic = 'force-dynamic'

/**
 * 金杢犀 ブランドエクスペリエンスコンソール（ダーク・金）
 * /dashboard 以下をサイドバー付きで表示。認証必須。
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null
  let setupError: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {
    setupError = e instanceof Error ? e.message : 'Supabase に接続できませんでした。'
  }

  if (setupError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ maxWidth: 440, padding: '2rem', border: '1px solid #3a2a10', background: '#1a1000', color: '#c8b89a', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>設定が必要です</p>
          <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{setupError}</p>
          <p style={{ fontSize: '0.75rem', color: '#888' }}>
            .env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ConsoleSidebar />
      <main style={{ flex: 1, padding: "var(--space-5) var(--space-6)", overflow: "auto", background: "var(--color-bg)" }}>
        {children}
      </main>
    </div>
  );
}
