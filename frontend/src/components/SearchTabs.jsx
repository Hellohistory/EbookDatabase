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
      <ul className="search-tab">
        {tabs.map((tab) => (
          <li
            key={tab.id}
            className={activeTab === tab.id ? 'on' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </li>
        ))}
      </ul>
      <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
        <BasicSearchForm />
      </div>
      <div style={{ display: activeTab === 'advanced' ? 'block' : 'none' }}>
        <AdvancedSearchForm />
      </div>
      <div style={{ display: activeTab === 'remote' ? 'block' : 'none' }}>
        <RemoteAccess />
      </div>
    </div>
  )
}

export default SearchTabs
