// path: frontend/src/types/Settings.ts
export interface Settings {
  pageSize: number
  defaultSearchField: string
  resultDisplayMode: 'compact' | 'detail' | 'table' | 'card'
  resultDensity: 'compact' | 'comfortable'
  showCovers: boolean
  showIdentifiers: boolean
}
