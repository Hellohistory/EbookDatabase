// path: frontend/src/types/Book.ts
export interface Book {
  id: string
  title: string
  authors: string[]
  description?: string
  tags?: string[]
  publisher?: string
  source: string
  has_cover: boolean
  can_download: boolean
}
