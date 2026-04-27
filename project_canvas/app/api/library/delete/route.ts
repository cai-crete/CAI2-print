import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id 필드가 필요합니다.' }, { status: 400 })

  // 본인 소유 확인 + 경로 조회
  const { data: item, error: fetchError } = await supabase
    .from('library_items')
    .select('storage_path, thumbnail_path, file_size')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !item) {
    return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  }

  // Storage 파일 삭제
  const pathsToRemove = [item.storage_path, item.thumbnail_path].filter(Boolean) as string[]
  await supabase.storage.from('library').remove(pathsToRemove)

  // DB 행 삭제
  const { error: deleteError } = await supabase
    .from('library_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // 누적 용량 감소
  if (item.file_size) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('storage_used')
      .eq('id', user.id)
      .single()

    const newUsed = Math.max(0, (profile?.storage_used ?? 0) - item.file_size)
    await supabase.from('profiles').update({ storage_used: newUsed }).eq('id', user.id)
  }

  return NextResponse.json({ success: true })
}
