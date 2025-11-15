// path: frontend/src/components/AdvancedSearchForm.tsx
import { useEffect, useReducer, useState } from 'react'
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
  'w-full rounded-lg border-gray-300 text-sm text-gray-700 shadow-sm focus:border-primary focus:ring-primary'

const inputClasses =
  'w-full rounded-lg border-gray-300 text-sm text-gray-700 shadow-sm focus:border-primary focus:ring-primary'

const checkboxClasses = 'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'

const buttonPrimaryClassName =
  'inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

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
  const settings = useGlobalStore((state) => state.settings)

  const [conditions, dispatch] = useReducer(conditionsReducer, [{ ...defaultCondition }])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [touched, setTouched] = useState<Record<number, boolean>>({})

  const validateConditionQuery = (value: string, field: SearchField): string | null => {
    const trimmed = value.trim()
    if (!trimmed) {
      return '此项不能为空'
    }
    if (field === 'isbn' && !/^\d+$/.test(trimmed)) {
      return 'ISBN 只能包含数字'
    }
    if (field === 'publishdate' && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return '出版时间需符合 YYYY-MM-DD 格式'
    }
    return null
  }

  useEffect(() => {
    if (settings?.defaultSearchField) {
      dispatch({ type: 'SET_FIRST_FIELD', field: settings.defaultSearchField as SearchField })
    }
  }, [settings])

  const updateCondition = <K extends keyof Condition>(index: number, key: K, value: Condition[K]) => {
    dispatch({ type: 'UPDATE_CONDITION', index, key, value })
  }

  const setErrorForIndex = (index: number, message: string | null) => {
    setErrors((prev) => {
      const next = { ...prev }
      if (message) {
        next[index] = message
      } else {
        delete next[index]
      }
      return next
    })
  }

  const markTouched = (index: number) => {
    setTouched((prev) => ({ ...prev, [index]: true }))
  }

  const handleFieldChange = (index: number, nextField: SearchField) => {
    const currentQuery = conditions[index]?.query ?? ''
    updateCondition(index, 'field', nextField)
    if (touched[index]) {
      setErrorForIndex(index, validateConditionQuery(currentQuery, nextField))
    }
  }

  const handleQueryChange = (index: number, value: string) => {
    const currentField = conditions[index]?.field ?? 'title'
    updateCondition(index, 'query', value)
    if (touched[index]) {
      setErrorForIndex(index, validateConditionQuery(value, currentField))
    }
  }

  const handleQueryBlur = (index: number, value: string) => {
    const currentField = conditions[index]?.field ?? 'title'
    markTouched(index)
    setErrorForIndex(index, validateConditionQuery(value, currentField))
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
    setErrors((prev) => {
      const next: Record<number, string> = {}
      Object.entries(prev).forEach(([key, value]) => {
        const idx = Number(key)
        if (idx === index) {
          return
        }
        next[idx > index ? idx - 1 : idx] = value
      })
      return next
    })
    setTouched((prev) => {
      const next: Record<number, boolean> = {}
      Object.entries(prev).forEach(([key, value]) => {
        const idx = Number(key)
        if (idx === index) {
          return
        }
        next[idx > index ? idx - 1 : idx] = value
      })
      return next
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const params = new URLSearchParams()
    const nextErrors: Record<number, string> = {}
    let hasErrors = false

    conditions.forEach((condition, index) => {
      const validationMessage = validateConditionQuery(condition.query, condition.field)
      if (validationMessage) {
        nextErrors[index] = validationMessage
        hasErrors = true
        return
      }

      const trimmedQuery = condition.query.trim()
      if (index > 0) {
        params.append('logics', condition.logic || 'AND')
      }
      params.append('fields', condition.field)
      params.append('queries', trimmedQuery)
      params.append('fuzzies', condition.fuzzy ? 'true' : 'false')
    })

    const allErrorsAreEmpty =
      hasErrors && Object.values(nextErrors).every((message) => message === '此项不能为空')

    if (hasErrors) {
      toast.error(allErrorsAreEmpty ? '请至少输入一个搜索条件。' : '请修正标红的搜索条件后再试。')
      setErrors(nextErrors)
      setTouched(
        conditions.reduce<Record<number, boolean>>((accumulator, _condition, index) => {
          accumulator[index] = true
          return accumulator
        }, {})
      )
      setLoading(false)
      return
    }

    setErrors({})
    setTouched({})
    setLoading(true)
    navigate(`/search?${params.toString()}`)
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        {conditions.map((condition, index) => {
          const errorMessage = errors[index]
          const isTouched = Boolean(touched[index])
          const showError = Boolean(isTouched && errorMessage)
          const isIsbnField = condition.field === 'isbn'
          const isPublishDateField = condition.field === 'publishdate'

          return (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 shadow-sm md:flex-row md:items-start md:gap-6"
            >
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                <select
                  name={`field-${index}`}
                  className={`${selectClasses} md:w-44`}
                  value={condition.field}
                  onChange={(event) => handleFieldChange(index, event.target.value as Condition['field'])}
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
                <div className="flex flex-1 flex-col">
                  <input
                    type="text"
                    name={`query-${index}`}
                    placeholder={
                      isPublishDateField ? '请输入 YYYY-MM-DD 格式的日期' : '请输入关键词'
                    }
                    className={`${inputClasses} ${
                      showError
                        ? 'border-red-500 ring-2 ring-red-500 focus:border-red-500 focus:ring-red-500'
                        : ''
                    }`}
                    required
                    value={condition.query}
                    aria-invalid={showError ? 'true' : 'false'}
                    inputMode={isIsbnField ? 'numeric' : 'text'}
                    pattern={
                      isIsbnField ? '\d+' : isPublishDateField ? '\d{4}-\d{2}-\d{2}' : undefined
                    }
                    onChange={(event) => handleQueryChange(index, event.target.value)}
                    onBlur={(event) => handleQueryBlur(index, event.target.value)}
                  />
                  {showError && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
                </div>
              </div>
              <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-3 md:w-auto">
                {index > 0 && (
                  <select
                    name={`logic-${index}`}
                    className={`${selectClasses} sm:w-28`}
                    value={condition.logic}
                    onChange={(event) => updateCondition(index, 'logic', event.target.value as Condition['logic'])}
                  >
                    <option value="AND">与 (AND)</option>
                    <option value="OR">或 (OR)</option>
                  </select>
                )}
                <label className="inline-flex items-center justify-between gap-2 text-sm text-gray-600 sm:justify-start">
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
                    className={`${buttonSecondaryClassName} w-full sm:w-auto`}
                    onClick={() => removeCondition(index)}
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="button" className={`${buttonSecondaryClassName} w-full sm:w-auto`} onClick={addCondition}>
          添加条件
        </button>
        <button
          type="submit"
          className={`${buttonPrimaryClassName} ${loading ? 'gap-2' : ''} w-full sm:w-auto`}
          disabled={loading}
          aria-busy={loading}
        >
          {loading && (
            <svg
              className="h-4 w-4 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {loading ? '检索中…' : '搜索'}
        </button>
      </div>
    </form>
  )
}

export default AdvancedSearchForm
