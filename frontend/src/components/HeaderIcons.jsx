// path: frontend/src/components/HeaderIcons.jsx
import { useState } from 'react'
import SettingsModal from './SettingsModal'

const iconButtonClasses =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

const HeaderIcons = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/Hellohistory/EbookDatabase"
          target="_blank"
          rel="noreferrer"
          className={iconButtonClasses}
          aria-label="GitHub 仓库"
        >
          <img src="/github-mark.svg" alt="GitHub" className="h-5 w-5" />
        </a>
        <a
          href="https://gitee.com/etojsyc/EbookDatabase"
          target="_blank"
          rel="noreferrer"
          className={iconButtonClasses}
          aria-label="Gitee 仓库"
        >
          <img src="/gitee-svgrepo-com.svg" alt="Gitee" className="h-5 w-5" />
        </a>
        <button
          type="button"
          className={iconButtonClasses}
          onClick={() => setIsModalOpen(true)}
          aria-label="打开设置"
        >
          <img src="/settings-icon.svg" alt="设置" className="h-5 w-5" />
        </button>
      </div>
      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

export default HeaderIcons
