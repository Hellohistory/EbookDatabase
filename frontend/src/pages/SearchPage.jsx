// path: frontend/src/pages/SearchPage.jsx
import SearchTabs from '../components/SearchTabs'

const SearchPage = () => {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
      <div className="flex w-full justify-end text-sm text-gray-500">
        <div className="rounded-full bg-gray-100 px-4 py-1 font-medium text-gray-600">版本: 1.0.0</div>
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">EbookDatabase</h1>
        <p className="mt-3 text-base text-gray-500">在多数据源间快速检索并发现感兴趣的电子书</p>
      </div>
      <div className="w-full">
        <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100 sm:p-8">
          <SearchTabs />
        </div>
      </div>
    </div>
  )
}

export default SearchPage
