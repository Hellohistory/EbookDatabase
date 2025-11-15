// path: frontend/src/components/HeaderIcons.jsx
import { useState } from 'react'
import SettingsModal from './SettingsModal'

const HeaderIcons = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div id="platform-icons" className="platform-icons-style">
        <a href="https://github.com/Hellohistory/EbookDatabase" target="_blank" rel="noreferrer">
          <img src="/github-mark.svg" alt="GitHub" width="30" height="30" />
        </a>
        <a href="https://gitee.com/etojsyc/EbookDatabase" target="_blank" rel="noreferrer">
          <img src="/gitee-svgrepo-com.svg" alt="Gitee" width="30" height="30" />
        </a>
        <button type="button" className="icon-button" onClick={() => setIsModalOpen(true)}>
          <img src="/settings-icon.svg" alt="设置" width="30" height="30" />
        </button>
      </div>
      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

export default HeaderIcons
