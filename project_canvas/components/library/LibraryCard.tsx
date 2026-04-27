'use client'

import { useState } from 'react'
import type { LibraryItem } from '@/lib/types/library'

interface Props {
  item: LibraryItem
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, item: LibraryItem) => void
}

export default function LibraryCard({ item, onDelete, onDragStart }: Props) {
  const [hovered, setHovered] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const res = await fetch('/api/library/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    if (res.ok) onDelete(item.id)
    else setDeleting(false)
    setConfirmDelete(false)
  }

  function handleDownload() {
    if (!item.signedUrl) return
    const a = document.createElement('a')
    a.href = item.signedUrl
    a.download = item.title ?? item.id
    a.click()
  }

  const thumb = item.type === 'video' ? item.thumbnailUrl : item.signedUrl

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-box)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-gray-100)',
        aspectRatio: '1 / 1',
        cursor: 'grab',
        border: hovered ? '1px solid var(--color-gray-300)' : '1px solid transparent',
        transition: 'border-color 0.15s',
      }}
    >
      {/* 썸네일 */}
      {thumb ? (
        <img
          src={thumb}
          alt={item.title ?? ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-300)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
          </svg>
        </div>
      )}

      {/* 영상 재생 아이콘 */}
      {item.type === 'video' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '2.25rem', height: '2.25rem', borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* 호버 액션 */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0.5rem',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
          display: 'flex', gap: '0.375rem', justifyContent: 'flex-end',
        }}>
          <IconBtn title="다운로드" onClick={handleDownload}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </IconBtn>
          <IconBtn
            title={confirmDelete ? '한 번 더 클릭하면 삭제됩니다' : '삭제'}
            onClick={handleDelete}
            danger={confirmDelete}
            disabled={deleting}
          >
            {deleting
              ? <span style={{ fontSize: '0.625rem', color: 'white' }}>...</span>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
            }
          </IconBtn>
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, title, onClick, danger, disabled }: {
  children: React.ReactNode
  title: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick() }}
      disabled={disabled}
      style={{
        width: '1.75rem', height: '1.75rem',
        borderRadius: '0.375rem',
        backgroundColor: danger ? 'rgba(220,38,38,0.85)' : 'rgba(0,0,0,0.5)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white',
        transition: 'background-color 0.15s',
      }}
    >
      {children}
    </button>
  )
}
