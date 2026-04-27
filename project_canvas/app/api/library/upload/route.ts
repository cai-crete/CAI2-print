import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
])
const IMAGE_MAX = 20 * 1024 * 1024   // 20MB
const VIDEO_MAX = 50 * 1024 * 1024   // 50MB
const USER_QUOTA = 2 * 1024 * 1024 * 1024  // 2GB

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const itemId = formData.get('itemId') as string | null
  const type = formData.get('type') as string | null

  if (!file || !itemId || !type) {
    return NextResponse.json({ error: 'file, itemId, type 필드가 필요합니다.' }, { status: 400 })
  }

  // MIME 타입 서버 검증
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다.' }, { status: 415 })
  }

  // 파일 크기 검증
  const isVideo = file.type.startsWith('video/')
  const maxSize = isVideo ? VIDEO_MAX : IMAGE_MAX
  if (file.size > maxSize) {
    return NextResponse.json({ error: `파일 크기 초과 (최대 ${isVideo ? '50MB' : '20MB'})` }, { status: 413 })
  }

  // 사용자 용량 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('storage_used')
    .eq('id', user.id)
    .single()

  const currentUsed = profile?.storage_used ?? 0
  if (currentUsed + file.size > USER_QUOTA) {
    return NextResponse.json({ error: '저장 용량(2GB)을 초과했습니다. 기존 항목을 삭제해 주세요.' }, { status: 409 })
  }

  // 버킷 내 상대 경로 (storage_path)
  const ext = file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'webp')
  const folder = isVideo ? 'videos' : 'images'
  const storagePath = `${user.id}/${folder}/${itemId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('library')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 누적 용량 업데이트
  await supabase
    .from('profiles')
    .upsert({ id: user.id, storage_used: currentUsed + file.size })

  return NextResponse.json({ storagePath, fileSize: file.size })
}
