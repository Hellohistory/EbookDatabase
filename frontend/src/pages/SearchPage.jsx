// path: frontend/src/pages/SearchPage.jsx
import SearchTabs from '../components/SearchTabs'

const SearchPage = () => {
  return (
    <div className="w-full min-w-0">
      <section className="surface min-w-0 overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="meta-label">Library Console</p>
              <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">书库检索</h1>
            </div>
            <div className="w-fit rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)]">
              v1.0.0
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <SearchTabs />
        </div>
      </section>
    </div>
  )
}

export default SearchPage
