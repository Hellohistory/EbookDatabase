// path: frontend/src/components/AdvancedSearchForm.tsx
import { useEffect, useReducer } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useGlobalStore from '../store/useGlobalStore'

const MAX_CONDITIONS = 6

type ConditionLogic = 'AND' | 'OR'

type SearchField =
  | 'title'
  | 'author'
  | 'publisher'
  | 'publishdate'
  | 'isbn'
  | 'tags'
  | 'sscode'
  | 'dxid'
  | 'identifier'

interface Condition {
  field: SearchField
  query: string
  logic: ConditionLogic
  fuzzy: boolean
}

const defaultCondition: Condition = {
  field: 'title',
  query: '',
  logic: 'AND',
  fuzzy: true
}

type ConditionAction =
  | { type: 'ADD_CONDITION' }
  | { type: 'REMOVE_CONDITION'; index: number }
  | { type: 'UPDATE_CONDITION'; index: number; key: keyof Condition; value: Condition[keyof Condition] }
  | { type: 'SET_FIRST_FIELD'; field: SearchField }

const conditionsReducer = (state: Condition[], action: ConditionAction): Condition[] => {
  switch (action.type) {
    case 'ADD_CONDITION':
      return [...state, { ...defaultCondition, field: 'title', fuzzy: false }]
    case 'REMOVE_CONDITION':
      return state.filter((_, idx) => idx !== action.index)
    case 'UPDATE_CONDITION':
      return state.map((condition, idx) =>
        idx === action.index ? { ...condition, [action.key]: action.value } : condition
      )
    case 'SET_FIRST_FIELD':
      if (state.length === 0) {
        return [{ ...defaultCondition, field: action.field }]
      }
      return state.map((condition, idx) => (idx === 0 ? { ...condition, field: action.field } : condition))
    default:
      return state
  }
}

const AdvancedSearchForm = () => {
  const navigate = useNavigate()
  const selectedDBs = useGlobalStore((state) => state.selectedDBs)
  const settings = useGlobalStore((state) => state.settings)

  const [conditions, dispatch] = useReducer(conditionsReducer, [{ ...defaultCondition }])

  useEffect(() => {
    if (settings?.defaultSearchField) {
      dispatch({ type: 'SET_FIRST_FIELD', field: settings.defaultSearchField as SearchField })
    }
  }, [settings])

  const updateCondition = <K extends keyof Condition>(index: number, key: K, value: Condition[K]) => {
    dispatch({ type: 'UPDATE_CONDITION', index, key, value })
  }

  const addCondition = () => {
    if (conditions.length >= MAX_CONDITIONS) {
      toast.error('最多只能添加六个搜索条件。')
      return
    }
    dispatch({ type: 'ADD_CONDITION' })
  }

  const removeCondition = (index: number) => {
    dispatch({ type: 'REMOVE_CONDITION', index })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams()
    selectedDBs.forEach((db) => params.append('db_names', db))

    let validConditions = 0

    conditions.forEach((condition, index) => {
      const trimmedQuery = condition.query.trim()
      if (!trimmedQuery) {
        return
      }
      if (index > 0) {
        params.append('logics', condition.logic || 'AND')
      }
      params.append('fields', condition.field)
      params.append('queries', trimmedQuery)
      params.append('fuzzies', condition.fuzzy ? 'true' : 'false')
      validConditions += 1
    })

    if (validConditions === 0) {
      toast.error('请至少输入一个搜索条件。')
      return
    }

    navigate(`/search?${params.toString()}`)
  }

  return (
    <form className="mt-4" onSubmit={handleSubmit}>
      <div className="search-conditions">
        {conditions.map((condition, index) => (
          <div key={index} className="mb-3 d-flex align-items-center search-condition">
            <div className="form-select-and-input d-flex align-items-center">
              <select
                name={`field-${index}`}
                className="form-select me-2"
                value={condition.field}
                onChange={(event) =>
                  updateCondition(index, 'field', event.target.value as Condition['field'])
                }
              >
                <option value="title">书名</option>
                <option value="author">作者</option>
                <option value="publisher">出版商</option>
                <option value="publishdate">出版时间</option>
                <option value="isbn">ISBN码</option>
                <option value="tags">标签</option>
                <option value="sscode">SS码</option>
                <option value="dxid">DXID</option>
              </select>
              <span className="me-2">-</span>
              <input
                type="text"
                name={`query-${index}`}
                placeholder="请输入关键词"
                className="form-control me-2"
                required
                value={condition.query}
                onChange={(event) => updateCondition(index, 'query', event.target.value)}
              />
            </div>
            {index > 0 && (
              <select
                name={`logic-${index}`}
                className="form-select ms-2 me-2"
                value={condition.logic}
                onChange={(event) =>
                  updateCondition(index, 'logic', event.target.value as Condition['logic'])
                }
              >
                <option value="AND">与 (AND)</option>
                <option value="OR">或 (OR)</option>
              </select>
            )}
            <div className="form-check form-switch me-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={condition.fuzzy}
                onChange={(event) => updateCondition(index, 'fuzzy', event.target.checked)}
              />
              <label className="form-check-label">模糊搜索</label>
            </div>
            {index > 0 && (
              <button type="button" className="custom-delete-btn ms-2" onClick={() => removeCondition(index)}>
                删除
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="custom-button" onClick={addCondition}>
        添加条件
      </button>
      <button type="submit" className="custom-button">
        搜索
      </button>
    </form>
  )
}

export default AdvancedSearchForm
