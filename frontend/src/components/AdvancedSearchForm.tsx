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

const selectClasses =
  'rounded-lg border-gray-300 text-sm text-gray-700 shadow-sm focus:border-primary focus:ring-primary'

const inputClasses =
  'w-full rounded-lg border-gray-300 text-sm text-gray-700 shadow-sm focus:border-primary focus:ring-primary'

const checkboxClasses = 'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'

const buttonPrimaryClassName =
  'inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

const buttonSecondaryClassName =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

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
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        {conditions.map((condition, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 shadow-sm md:flex-row md:items-center"
          >
            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
              <select
                name={`field-${index}`}
                className={`${selectClasses} md:w-40`}
                value={condition.field}
                onChange={(event) => updateCondition(index, 'field', event.target.value as Condition['field'])}
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
              <span className="hidden text-gray-400 md:block">—</span>
              <input
                type="text"
                name={`query-${index}`}
                placeholder="请输入关键词"
                className={inputClasses}
                required
                value={condition.query}
                onChange={(event) => updateCondition(index, 'query', event.target.value)}
              />
            </div>
            <div className="flex flex-col items-start gap-3 md:w-auto md:flex-row md:items-center">
              {index > 0 && (
                <select
                  name={`logic-${index}`}
                  className={`${selectClasses} md:w-28`}
                  value={condition.logic}
                  onChange={(event) => updateCondition(index, 'logic', event.target.value as Condition['logic'])}
                >
                  <option value="AND">与 (AND)</option>
                  <option value="OR">或 (OR)</option>
                </select>
              )}
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className={checkboxClasses}
                  checked={condition.fuzzy}
                  onChange={(event) => updateCondition(index, 'fuzzy', event.target.checked)}
                />
                模糊
              </label>
              {index > 0 && (
                <button
                  type="button"
                  className={buttonSecondaryClassName}
                  onClick={() => removeCondition(index)}
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonSecondaryClassName} onClick={addCondition}>
          添加条件
        </button>
        <button type="submit" className={buttonPrimaryClassName}>
          搜索
        </button>
      </div>
    </form>
  )
}

export default AdvancedSearchForm
