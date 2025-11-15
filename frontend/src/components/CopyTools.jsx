// path: frontend/src/components/CopyTools.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const CopyToolsContext = createContext(null)

const deriveKey = (item) => item.key

const ensureFilename = (store, filename) => {
  if (!filename) {
    return ''
  }
  const match = filename.match(/(.+)(\.[^.]*)$/)
  if (!match) {
    if (!store[filename]) {
      store[filename] = 1
      return filename
    }
    let counter = store[filename]
    let candidate
    do {
      counter += 1
      candidate = `${filename}(${counter})`
    } while (store[candidate])
    store[filename] = counter
    store[candidate] = 1
    return candidate
  }
  const [, name, extension] = match
  if (!store[filename]) {
    store[filename] = 1
    return filename
  }
  let counter = store[filename]
  let newName
  do {
    counter += 1
    newName = `${name}(${counter})${extension}`
  } while (store[newName])
  store[filename] = counter
  store[newName] = 1
  return newName
}

const CopyTools = ({ items, children }) => {
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const filenameStore = useRef({})

  useEffect(() => {
    setSelectedIds(new Set())
    filenameStore.current = {}
  }, [items])

  const itemMap = useMemo(() => {
    const map = new Map()
    items.forEach((item) => {
      map.set(item.key, item.book)
    })
    return map
  }, [items])

  const selectAll = () => {
    setSelectedIds(new Set(items.map(deriveKey)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const toggleSelection = (key) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const isSelected = (key) => selectedIds.has(key)

  const copyToClipboard = async (text) => {
    if (!navigator.clipboard) {
      throw new Error('浏览器不支持剪贴板操作')
    }
    await navigator.clipboard.writeText(text)
  }

  const copySelected = async () => {
    const lines = []
    selectedIds.forEach((key) => {
      const book = itemMap.get(key)
      if (book?.second_pass_code) {
        lines.push(ensureFilename(filenameStore.current, book.second_pass_code))
      }
    })
    if (lines.length === 0) {
      window.alert('请选择至少一个条目。')
      return
    }
    try {
      await copyToClipboard(lines.join('\n'))
      window.alert('复制成功！')
    } catch (error) {
      window.alert(`复制失败：${error.message}`)
    }
  }

  const copySingle = async (key) => {
    const book = itemMap.get(key)
    if (!book?.second_pass_code) {
      return
    }
    try {
      const filename = ensureFilename(filenameStore.current, book.second_pass_code)
      await copyToClipboard(filename)
      window.alert(`复制成功：${filename}`)
    } catch (error) {
      window.alert(`复制失败：${error.message}`)
    }
  }

  const contextValue = {
    isSelected,
    toggleSelection,
    copySingle
  }

  return (
    <CopyToolsContext.Provider value={contextValue}>
      <div className="button-container">
        <button type="button" className="select-all-btn" onClick={selectAll}>
          全选
        </button>
        <button type="button" className="deselect-all-btn" onClick={deselectAll}>
          全不选
        </button>
        <button type="button" className="copy-selected-btn" onClick={copySelected}>
          复制选中的秒传链接
        </button>
      </div>
      {children}
    </CopyToolsContext.Provider>
  )
}

export const useCopyTools = () => {
  const context = useContext(CopyToolsContext)
  if (!context) {
    throw new Error('useCopyTools 必须在 CopyTools 组件内部使用')
  }
  return context
}

export default CopyTools
