// path: frontend/src/components/SearchTabs.jsx
import { useState } from 'react'
import AdvancedSearchForm from './AdvancedSearchForm'
import BasicSearchForm from './BasicSearchForm'
import RemoteAccess from './RemoteAccess'

const tabs = [
  { id: 'basic', label: '基础检索' },
  { id: 'advanced', label: '高级检索' },
  { id: 'remote', label: '远程访问' }
]

const SearchTabs = () => {
  const [activeTab, setActiveTab] = useState('basic')

  return (
    <div>
      <div className="flex gap-1 border-b border-[var(--line)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`focus-ring -mb-px whitespace-nowrap border-b-2 px-3 pb-3 text-sm font-bold transition sm:px-4 ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div className="pt-6">
        {activeTab === 'basic' && <BasicSearchForm />}
        {activeTab === 'advanced' && <AdvancedSearchForm />}
        {activeTab === 'remote' && <RemoteAccess />}
      </div>
    </div>
  )
}

export default SearchTabs
