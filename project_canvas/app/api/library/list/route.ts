import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SIGNED_URL_TTL = 3600  // 1시간

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')           // 'image' | 'video' | null(전체)
  const cursor = searchParams.get('cursor')        // 마지막 created_at
  const limit = Math.min(Number(searchParams.get('limit') ?? 24), 48)

  let query = supabase
    .from('library_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('type', type)
  if (cursor) query = query.lt('created_at', cursor)

  const { data: items, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 각 아이템의 signed URL 동적 생성
  const itemsWithUrls = await Promise.all(
    (items ?? []).map(async item => {
      const { data: signed } = await supabase.storage
        .from('library')
        .createSignedUrl(item.storage_path, SIGNED_URL_TTL)

      let thumbnailUrl: string | null = null
      if (item.thumbnail_path) {
        const { data: thumb } = await supabase.storage
          .from('library')
          .createSignedUrl(item.thumbnail_path, SIGNED_URL_TTL)
        thumbnailUrl = thumb?.signedUrl ?? null
      }

      return {
        ...item,
        signedUrl: signed?.signedUrl ?? null,
        thumbnailUrl,
      }
    })
  )

  const nextCursor = items && items.length === limit
    ? items[items.length - 1].created_at
    : null

  return NextResponse.json({ items: itemsWithUrls, nextCursor })
}
