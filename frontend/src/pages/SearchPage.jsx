// path: frontend/src/pages/SearchPage.jsx
import SearchTabs from '../components/SearchTabs'

const SearchPage = () => {
  return (
    <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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

      <aside className="grid min-w-0 gap-4 lg:content-start">
        <div className="surface-flat p-5">
          <p className="meta-label">Scope</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--muted)]">模式</dt>
              <dd className="mt-1 font-bold text-ink">基础 / 高级</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">排序</dt>
              <dd className="mt-1 font-bold text-ink">新记录优先</dd>
            </div>
          </dl>
        </div>
        <div className="surface-flat p-5">
          <p className="meta-label">Fields</p>
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 text-xs font-semibold text-ink min-[520px]:grid-cols-3 sm:flex sm:flex-wrap">
            {['书名', '作者', '出版社', '出版时间', 'ISBN', 'SS码', 'DXID'].map((item) => (
              <span key={item} className="rounded-md border border-[var(--line)] bg-white/55 px-2 py-1 text-center sm:px-2.5">
                {item}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

export default SearchPage
