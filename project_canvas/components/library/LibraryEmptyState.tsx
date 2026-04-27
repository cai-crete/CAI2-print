import Link from 'next/link'

export default function LibraryEmptyState({ type }: { type: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1rem', paddingTop: '5rem',
      color: 'var(--color-gray-300)',
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-400)', margin: 0 }}>
        저장된 {type === 'video' ? '영상' : type === 'image' ? '이미지' : '항목'}이 없습니다
      </p>
      <Link href="/" style={{
        height: 'var(--h-cta-sm)',
        padding: '0 1.25rem',
        backgroundColor: 'var(--color-black)',
        color: 'var(--color-white)',
        borderRadius: 'var(--radius-box)',
        textDecoration: 'none',
        fontSize: '0.8125rem',
        display: 'flex', alignItems: 'center',
      }}>
        캔버스로 이동
      </Link>
    </div>
  )
}
