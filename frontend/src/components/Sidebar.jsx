// path: frontend/src/components/Sidebar.jsx
import { XMarkIcon } from '@heroicons/react/24/outline'
import useGlobalStore from '../store/useGlobalStore'

const Sidebar = ({ isOpen, onClose }) => {
  const availableDBs = useGlobalStore((state) => state.availableDBs)
  const selectedDBs = useGlobalStore((state) => state.selectedDBs)
  const toggleDB = useGlobalStore((state) => state.toggleDB)

  const sidebarClasses = [
    'fixed inset-y-0 left-0 z-40 flex h-full w-72 flex-col transform overflow-y-auto bg-gray-50 p-6 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:w-80 lg:translate-x-0 lg:border-r lg:border-gray-200 lg:shadow-none',
    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
  ].join(' ')

  return (
    <aside className={sidebarClasses} aria-label="数据源">
      <div className="flex items-center justify-between lg:mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">数据源</h2>
          <p className="mt-1 text-sm text-gray-500">选择参与检索的书库</p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 lg:hidden"
          onClick={onClose}
          aria-label="关闭数据源选择"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {availableDBs.map((db) => {
          const id = `db-${db}`
          const isSelected = selectedDBs.includes(db)
          return (
            <label
              key={db}
              htmlFor={id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-white px-4 py-3 shadow-sm transition hover:bg-primary/5 ${isSelected ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
            >
              <input
                id={id}
                type="checkbox"
                name="db_names"
                value={db}
                checked={isSelected}
                onChange={() => toggleDB(db)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="truncate text-sm font-medium">{db}</span>
            </label>
          )
        })}
      </div>
    </aside>
  )
}

export default Sidebar
