'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { LibraryItem, LibraryType } from '@/lib/types/library'
import LibraryCard from '@/components/library/LibraryCard'
import LibraryEmptyState from '@/components/library/LibraryEmptyState'

type Tab = 'all' | LibraryType

const TABS: { value: Tab; label: string }[] = [
  { value: 'all',   label: 'ALL' },
  { value: 'image', label: 'IMAGE' },
  { value: 'video', label: 'VIDEO' },
]

export default function LibraryPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('all')
  const [items, setItems] = useState<LibraryItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchItems = useCallback(async (activeTab: Tab, cursor?: string) => {
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('type', activeTab)
    if (cursor) params.set('cursor', cursor)

    const res = await fetch(`/api/library/list?${params}`)
    if (res.status === 401) { router.push('/auth/login'); return }
    const json = await res.json()
    return json as { items: LibraryItem[]; nextCursor: string | null }
  }, [router])

  // 탭 변경 시 초기 로드
  useEffect(() => {
    setLoading(true)
    setItems([])
    setNextCursor(null)
    fetchItems(tab).then(data => {
      if (data) { setItems(data.items); setNextCursor(data.nextCursor) }
      setLoading(false)
    })
  }, [tab, fetchItems])

  // 무한 스크롤
  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingMore) return
      setLoadingMore(true)
      const data = await fetchItems(tab, nextCursor)
      if (data) {
        setItems(prev => [...prev, ...data.items])
        setNextCursor(data.nextCursor)
      }
      setLoadingMore(false)
    }, { threshold: 0.5 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [nextCursor, tab, loadingMore, fetchItems])

  function handleDelete(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function handleDragStart(e: React.DragEvent, item: LibraryItem) {
    e.dataTransfer.setData('application/cai-library', JSON.stringify({
      id: item.id,
      type: item.type,
      signedUrl: item.signedUrl,
      thumbnailUrl: item.thumbnailUrl,
      title: item.title,
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-app-bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 헤더 */}
      <header style={{
        height: 'var(--header-h)',
        backgroundColor: 'var(--color-white)',
        borderBottom: '1px solid var(--color-gray-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', flexShrink: 0,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="text-title" style={{ fontSize: '1.25rem', letterSpacing: '0.05em', color: 'var(--color-black)' }}>
            CAI&nbsp;&nbsp;CANVAS
          </span>
        </Link>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>라이브러리</span>
      </header>

      {/* 탭 + 콘텐츠 */}
      <div style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem' }}>
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              style={{
                height: 'var(--h-cta-sm)',
                padding: '0 1rem',
                border: tab === t.value ? '1px solid var(--color-black)' : '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-box)',
                backgroundColor: tab === t.value ? 'var(--color-black)' : 'var(--color-white)',
                color: tab === t.value ? 'var(--color-white)' : 'var(--color-gray-500)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-family-pretendard)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 그리드 */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-300)' }}>불러오는 중...</span>
          </div>
        ) : items.length === 0 ? (
          <LibraryEmptyState type={tab} />
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.875rem',
            }}>
              {items.map(item => (
                <LibraryCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
            {/* 무한 스크롤 sentinel */}
            <div ref={sentinelRef} style={{ height: '2rem', marginTop: '1rem' }}>
              {loadingMore && (
                <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-gray-300)' }}>
                  불러오는 중...
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
