// path: frontend/src/pages/SearchPage.jsx
import SearchTabs from '../components/SearchTabs'

const SearchPage = () => {
  return (
    <div className="mx-auto w-full max-w-5xl min-w-0">
      <section className="surface min-w-0 overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="meta-label">Library Console</p>
              <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">书库检索工作台</h1>
            </div>
            <div className="w-fit border-l-4 border-amberline bg-white/60 px-3 py-2 text-xs font-semibold text-[var(--muted)]">
              v1.0.0
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <SearchTabs />
        </div>
      </section>
    </div>
  )
}

export default SearchPage
