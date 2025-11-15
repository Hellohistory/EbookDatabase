// path: frontend/src/utils/filename.ts
export const ensureFilename = (store: Record<string, number>, filename: string | null | undefined): string => {
  if (!filename) {
    return ''
  }

  const match = filename.match(/(.+)(\.[^.]*)$/)

  if (!match) {
    if (!store[filename]) {
      store[filename] = 1
      return filename
    }

    let counter = store[filename]
    let candidate: string

    do {
      counter += 1
      candidate = `${filename}(${counter})`
    } while (store[candidate])

    store[filename] = counter
    store[candidate] = 1
    return candidate
  }

  const [, name, extension] = match

  if (!store[filename]) {
    store[filename] = 1
    return filename
  }

  let counter = store[filename]
  let newName: string

  do {
    counter += 1
    newName = `${name}(${counter})${extension}`
  } while (store[newName])

  store[filename] = counter
  store[newName] = 1
  return newName
}
