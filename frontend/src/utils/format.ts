// path: frontend/src/utils/format.ts
export const formatFileSize = (sizeValue?: string | null): string | null => {
  if (!sizeValue) {
    return null
  }

  const trimmed = sizeValue.trim()

  if (!/^\d*(?:\.\d+)?$/.test(trimmed)) {
    return sizeValue
  }

  const numeric = Number.parseFloat(trimmed)

  if (Number.isNaN(numeric)) {
    return sizeValue
  }

  if (numeric <= 0) {
    return '0 Byte'
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const
  const exponent = Math.floor(Math.log(numeric) / Math.log(1024))
  const index = Math.min(exponent, units.length - 1)
  const value = numeric / Math.pow(1024, index)

  return `${value.toFixed(2)} ${units[index]}`
}
