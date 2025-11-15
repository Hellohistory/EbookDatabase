// path: frontend/src/components/CopyTools.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { toast } from 'react-hot-toast'
import type { Book } from '../types/Book'
import { ensureFilename } from '../utils/filename'

interface CopyToolsItem {
  key: string
  book: Book
}

interface CopyToolsProps {
  items: CopyToolsItem[]
  children: ReactNode
}

interface CopyToolsContextValue {
  isSelected: (key: string) => boolean
  toggleSelection: (key: string) => void
  copySingle: (key: string) => Promise<void>
}

const CopyToolsContext = createContext<CopyToolsContextValue | null>(null)

const CopyTools = ({ items, children }: CopyToolsProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const filenameStore = useRef<Record<string, number>>({})

  useEffect(() => {
    setSelectedIds(new Set())
    filenameStore.current = {}
  }, [items])

  const itemMap = useMemo(() => {
    const map = new Map<string, Book | undefined>()
    items.forEach((item) => {
      map.set(item.key, item.book)
    })
    return map
  }, [items])

  const selectAll = () => {
    setSelectedIds(new Set(items.map((item) => item.key)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const toggleSelection = (key: string) => {
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

  const isSelected = (key: string) => selectedIds.has(key)

  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) {
      throw new Error('浏览器不支持剪贴板操作')
    }
    await navigator.clipboard.writeText(text)
  }

  const copySelected = async () => {
    const lines: string[] = []
    selectedIds.forEach((key) => {
      const book = itemMap.get(key)
      if (book?.second_pass_code) {
        lines.push(ensureFilename(filenameStore.current, book.second_pass_code))
      }
    })

    if (lines.length === 0) {
      toast.error('请选择至少一个条目。')
      return
    }

    try {
      await copyToClipboard(lines.join('\n'))
      toast.success('复制成功！')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(`复制失败：${message}`)
    }
  }

  const copySingle = async (key: string) => {
    const book = itemMap.get(key)
    if (!book?.second_pass_code) {
      return
    }

    try {
      const filename = ensureFilename(filenameStore.current, book.second_pass_code)
      await copyToClipboard(filename)
      toast.success(`复制成功：${filename}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(`复制失败：${message}`)
    }
  }

  const contextValue: CopyToolsContextValue = {
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
