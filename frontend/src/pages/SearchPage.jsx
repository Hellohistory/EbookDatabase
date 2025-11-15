// path: frontend/src/pages/SearchPage.jsx
import { Link } from 'react-router-dom'
import SearchTabs from '../components/SearchTabs'

const SearchPage = () => {
  return (
    <div id="container" className="container-style">
      <div className="about-container">
        <Link to="/about" className="about-link">
          <img src="/about.svg" alt="关于" width="30" height="30" />
        </Link>
        <div className="version-display">版本:1.0.0</div>
      </div>
      <h1>EbookDatabase</h1>
      <SearchTabs />
    </div>
  )
}

export default SearchPage
