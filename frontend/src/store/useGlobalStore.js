// path: frontend/src/store/useGlobalStore.js
import { create } from 'zustand'

const useGlobalStore = create((set, get) => ({
  availableDBs: [],
  selectedDBs: [],
  settings: {},
  loading: {
    dbs: false,
    settings: false
  },
  fetchAvailableDBs: async () => {
    set((state) => ({ loading: { ...state.loading, dbs: true } }))
    try {
      const response = await fetch('/api/v1/available-dbs')
      if (!response.ok) {
        throw new Error('无法获取数据库列表')
      }
      const data = await response.json()
      set({
        availableDBs: data.available_dbs || [],
        selectedDBs: data.available_dbs || []
      })
    } catch (error) {
      console.error(error)
    } finally {
      set((state) => ({ loading: { ...state.loading, dbs: false } }))
    }
  },
  fetchSettings: async () => {
    set((state) => ({ loading: { ...state.loading, settings: true } }))
    try {
      const response = await fetch('/api/v1/settings')
      if (!response.ok) {
        throw new Error('无法获取设置')
      }
      const data = await response.json()
      set({ settings: data })
    } catch (error) {
      console.error(error)
    } finally {
      set((state) => ({ loading: { ...state.loading, settings: false } }))
    }
  },
  toggleDB: (dbPath) => {
    const { selectedDBs } = get()
    if (selectedDBs.includes(dbPath)) {
      set({ selectedDBs: selectedDBs.filter((db) => db !== dbPath) })
    } else {
      set({ selectedDBs: [...selectedDBs, dbPath] })
    }
  },
  setSelectedDBs: (dbs) => set({ selectedDBs: dbs }),
  updateSettings: async (newSettings) => {
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
      const data = await response.json()
      set({ settings: data })
      return { success: true }
    } catch (error) {
      console.error(error)
      return { success: false, message: error.message }
    }
  }
}))

export default useGlobalStore
