// path: frontend/src/components/ResultsList.tsx
import BookItem from './BookItem'
import type { Book } from '../types/Book'

type Props = {
  books: Book[]
}

const ResultsList = ({ books }: Props) => {
  if (!books.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500">
        没有找到匹配的结果。
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {books.map((book) => (
        <BookItem key={`${book.source}-${book.id}`} book={book} />
      ))}
    </div>
  )
}

export default ResultsList
