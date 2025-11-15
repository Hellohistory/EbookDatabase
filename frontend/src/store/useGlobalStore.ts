// path: frontend/src/store/useGlobalStore.ts
import { create } from 'zustand'
import type { Settings } from '../types/Settings'

type LoadingKey = 'settings'

interface LoadingState {
  settings: boolean
}

interface SearchSettingsPayload {
  pageSize?: unknown
  defaultSearchField?: unknown
  [key: string]: unknown
}

interface LoginResponse {
  token?: unknown
}

export interface GlobalState {
  token: string | null
  settings: Partial<Settings>
  loading: LoadingState
  fetchSettings: () => Promise<void>
  login: (password: string) => Promise<boolean>
  logout: () => void
}

const TOKEN_STORAGE_KEY = 'ebookdatabase_admin_token'

const getInitialToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  return stored && stored.trim() !== '' ? stored : null
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

const useGlobalStore = create<GlobalState>((set) => ({
  token: getInitialToken(),
  settings: {},
  loading: { settings: false },
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
  login: async (password: string) => {
    try {
      const response = await fetch('/api/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })
      if (!response.ok) {
        throw new Error('登录失败')
      }
      const data = (await response.json()) as LoginResponse
      const token = typeof data.token === 'string' ? data.token : ''
      if (!token) {
        throw new Error('登录失败')
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
      }
      set({ token })
      return true
    } catch (error) {
      console.error(error)
      set({ token: null })
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      }
      return false
    }
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
    set({ token: null })
  }
}))

export default useGlobalStore
