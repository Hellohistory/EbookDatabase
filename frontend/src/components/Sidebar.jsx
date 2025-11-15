// path: frontend/src/components/Sidebar.jsx
import useGlobalStore from '../store/useGlobalStore'

const Sidebar = ({ isOpen, onClose }) => {
  const availableDBs = useGlobalStore((state) => state.availableDBs)
  const selectedDBs = useGlobalStore((state) => state.selectedDBs)
  const toggleDB = useGlobalStore((state) => state.toggleDB)

  return (
    <nav
      id="sidebar"
      className="sidebar-style"
      style={{ transform: isOpen ? 'translateX(0px)' : 'translateX(-100%)' }}
    >
      <div className="center-text padding-10 cursor-pointer close-icon-style" onClick={onClose}>
        &times;
      </div>
      <label htmlFor="db_names" className="form-label">
        选择数据库：
      </label>
      <div id="database-checkboxes">
        {availableDBs.map((db) => {
          const id = `db-${db}`
          return (
            <div key={db} className="database-item">
              <input
                id={id}
                type="checkbox"
                name="db_names"
                value={db}
                checked={selectedDBs.includes(db)}
                onChange={() => toggleDB(db)}
              />
              <label htmlFor={id}>{db}</label>
            </div>
          )
        })}
      </div>
    </nav>
  )
}

export default Sidebar
