import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { nodeId, type, title, storagePath, thumbnailPath, fileSize, metadata } = body

  if (!nodeId || !type || !storagePath) {
    return NextResponse.json({ error: 'nodeId, type, storagePath 필드가 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('library_items')
    .insert({
      user_id: user.id,
      node_id: nodeId,
      type,
      title: title ?? null,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath ?? null,
      file_size: fileSize ?? null,
      metadata: metadata ?? {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ item: data })
}
