// path: frontend/src/components/ResultsList.tsx
import BookItem from './BookItem'
import type { Book } from '../types/Book'

type Props = {
  books: Book[]
}

const ResultsList = ({ books }: Props) => {
  if (!books.length) {
    return <p className="no-results">没有找到匹配的结果。</p>
  }

  return (
    <div>
      {books.map((book) => (
        <BookItem key={`${book.source}-${book.id}`} book={book} />
      ))}
    </div>
  )
}

export default ResultsList
