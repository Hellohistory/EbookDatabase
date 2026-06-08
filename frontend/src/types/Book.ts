// path: frontend/src/types/Book.ts
export interface Book {
  id: string
  title: string
  authors: string[]
  description?: string
  tags?: string[]
  publisher?: string
  publish_date?: string
  page_count?: number
  isbn?: string
  ss_code?: string
  dxid?: string
  source: string
  has_cover: boolean
  can_download: boolean
}
