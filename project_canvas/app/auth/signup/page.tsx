'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError('회원가입에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다.')
      setLoading(false)
      return
    }
    setDone(true)
  }

  async function handleGoogleSignup() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) {
      setError('Google 로그인에 실패했습니다.')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-app-bg)',
        padding: '1.5rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-box)',
          border: '1px solid var(--color-gray-100)',
          boxShadow: 'var(--shadow-float)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <span className="text-title" style={{ fontSize: '1.5rem', letterSpacing: '0.1em' }}>
            CAI&nbsp;&nbsp;CANVAS
          </span>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-black)', margin: 0 }}>
            인증 메일을 발송했습니다.
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', margin: 0 }}>
            {email}로 발송된 메일의 링크를 클릭하면<br />가입이 완료됩니다.
          </p>
          <Link href="/auth/login" style={{
            display: 'block',
            marginTop: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--color-black)',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            로그인 페이지로 →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-app-bg)',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-box)',
        border: '1px solid var(--color-gray-100)',
        boxShadow: 'var(--shadow-float)',
        padding: '2.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span className="text-title" style={{ fontSize: '1.5rem', letterSpacing: '0.1em' }}>
            CAI&nbsp;&nbsp;CANVAS
          </span>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-gray-400)' }}>
            새 계정을 만드세요
          </p>
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          style={{
            width: '100%',
            height: 'var(--h-cta-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-box)',
            backgroundColor: 'var(--color-white)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: 'var(--color-black)',
            fontFamily: 'var(--font-family-pretendard)',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-app-bg)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-white)')}
        >
          <GoogleIcon />
          Google로 계속하기
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-gray-100)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-300)' }}>또는</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-gray-100)' }} />
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            style={inputStyle}
          />

          {error && (
            <p style={{ fontSize: '0.8125rem', color: '#e53e3e', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 'var(--h-cta-lg)',
              backgroundColor: 'var(--color-black)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: 'var(--radius-box)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-family-pretendard)',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-gray-400)', margin: 0 }}>
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" style={{ color: 'var(--color-black)', fontWeight: 600, textDecoration: 'none' }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 'var(--h-cta-lg)',
  padding: '0 0.875rem',
  border: '1px solid var(--color-gray-200)',
  borderRadius: 'var(--radius-box)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-family-pretendard)',
  backgroundColor: 'var(--color-white)',
  color: 'var(--color-black)',
  outline: 'none',
  boxSizing: 'border-box',
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}
