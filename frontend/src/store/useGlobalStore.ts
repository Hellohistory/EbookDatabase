// path: frontend/src/store/useGlobalStore.ts
import { create } from 'zustand'
import type { Settings } from '../types/Settings'

type LoadingKey = 'dbs' | 'settings'

interface LoadingState {
  dbs: boolean
  settings: boolean
}

interface UpdateResult {
  success: boolean
  message?: string
}

interface AvailableDBResponse {
  available_dbs?: unknown
}

interface SearchSettingsPayload {
  pageSize?: unknown
  defaultSearchField?: unknown
  [key: string]: unknown
}

export interface GlobalState {
  availableDBs: string[]
  selectedDBs: string[]
  settings: Partial<Settings>
  loading: LoadingState
  fetchAvailableDBs: () => Promise<void>
  fetchSettings: () => Promise<void>
  toggleDB: (dbPath: string) => void
  setSelectedDBs: (dbs: string[]) => void
  updateSettings: (newSettings: Record<string, unknown>) => Promise<UpdateResult>
}

const normalizeSettings = (payload: SearchSettingsPayload): Partial<Settings> => {
  const normalized: Partial<Settings> = {}

  if (payload.pageSize !== undefined) {
    const value =
      typeof payload.pageSize === 'number'
        ? payload.pageSize
        : Number.parseInt(String(payload.pageSize), 10)
    if (!Number.isNaN(value) && value > 0) {
      normalized.pageSize = value
    }
  }

  if (typeof payload.defaultSearchField === 'string' && payload.defaultSearchField.trim() !== '') {
    normalized.defaultSearchField = payload.defaultSearchField
  }

  return normalized
}

const updateLoading = (key: LoadingKey, value: boolean) =>
  (state: GlobalState): Partial<GlobalState> => ({
    loading: {
      ...state.loading,
      [key]: value
    }
  })

const useGlobalStore = create<GlobalState>((set, get) => ({
  availableDBs: [],
  selectedDBs: [],
  settings: {},
  loading: { dbs: false, settings: false },
  fetchAvailableDBs: async () => {
    set(updateLoading('dbs', true))
    try {
      const response = await fetch('/api/v1/available-dbs')
      if (!response.ok) {
        throw new Error('无法获取数据库列表')
      }
      const data = (await response.json()) as AvailableDBResponse
      const availableDBs = Array.isArray(data.available_dbs)
        ? data.available_dbs.filter((item): item is string => typeof item === 'string')
        : []
      set({
        availableDBs,
        selectedDBs: availableDBs
      })
    } catch (error) {
      console.error(error)
    } finally {
      set(updateLoading('dbs', false))
    }
  },
  fetchSettings: async () => {
    set(updateLoading('settings', true))
    try {
      const response = await fetch('/api/v1/settings')
      if (!response.ok) {
        throw new Error('无法获取设置')
      }
      const data = (await response.json()) as SearchSettingsPayload
      set((state) => ({ settings: { ...state.settings, ...normalizeSettings(data) } }))
    } catch (error) {
      console.error(error)
    } finally {
      set(updateLoading('settings', false))
    }
  },
  toggleDB: (dbPath: string) => {
    const { selectedDBs } = get()
    if (selectedDBs.includes(dbPath)) {
      set({ selectedDBs: selectedDBs.filter((db) => db !== dbPath) })
    } else {
      set({ selectedDBs: [...selectedDBs, dbPath] })
    }
  },
  setSelectedDBs: (dbs: string[]) => set({ selectedDBs: dbs }),
  updateSettings: async (newSettings: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      })
      if (!response.ok) {
        throw new Error('保存设置失败')
      }
      const data = (await response.json()) as SearchSettingsPayload
      set((state) => ({ settings: { ...state.settings, ...normalizeSettings(data) } }))
      return { success: true }
    } catch (error) {
      console.error(error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '保存设置失败'
      }
    }
  }
}))

export default useGlobalStore
