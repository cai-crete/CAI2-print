export type LibraryType = 'image' | 'video'

export interface LibraryItem {
  id: string
  userId: string
  nodeId: string
  type: LibraryType
  title?: string
  storagePath: string
  thumbnailPath?: string
  fileSize?: number
  metadata: Record<string, unknown>
  createdAt: string
  signedUrl?: string
  thumbnailUrl?: string
}
