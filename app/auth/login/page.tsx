'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
    }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 1rem' }}>
        {/* ロゴ */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: '#141414',
            border: '1px solid #c8b89a44',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '1.8rem' }}>🌿</span>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f0ebe3', marginBottom: '0.25rem' }}>
            金杢犀 管理画面
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>管理者としてログイン</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleLogin} style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#c8b89a', letterSpacing: '0.1em' }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              style={{
                padding: '0.65rem 0.75rem',
                background: '#0a0a0a',
                border: '1px solid #2a2a2a',
                color: '#f0ebe3',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#c8b89a', letterSpacing: '0.1em' }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                padding: '0.65rem 0.75rem',
                background: '#0a0a0a',
                border: '1px solid #2a2a2a',
                color: '#f0ebe3',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{
              fontSize: '0.82rem',
              color: '#e74c3c',
              background: '#2a1010',
              border: '1px solid #5a2020',
              padding: '0.5rem 0.75rem',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem',
              background: loading ? '#333' : '#06C755',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
