// path: frontend/src/components/ResultsList.jsx
import BookItem from './BookItem'

const ResultsList = ({ items }) => {
  if (!items.length) {
    return <p className="no-results">没有找到匹配的结果。</p>
  }

  return (
    <div>
      {items.map((item) => (
        <BookItem key={item.key} item={item} />
      ))}
    </div>
  )
}

export default ResultsList
