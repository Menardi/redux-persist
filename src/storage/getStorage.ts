import { Storage } from '../types'

function noop(): void {}
let noopStorage: Storage = {
  getItem: noop,
  setItem: noop,
  removeItem: noop,
}

function hasStorage(storageType: string): boolean {
  const globalSelf = typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : {}) as any
  if (typeof globalSelf !== 'object' || !(storageType in globalSelf)) {
    return false
  }

  try {
    let storage = globalSelf[storageType]
    const testKey = `redux-persist ${storageType} test`
    storage.setItem(testKey, 'test')
    storage.getItem(testKey)
    storage.removeItem(testKey)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production')
      console.warn(
        `redux-persist ${storageType} test failed, persistence will be disabled.`
      )
    return false
  }
  return true
}

export default function getStorage(type: string): Storage {
  const storageType = `${type}Storage`
  const globalSelf = typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : {}) as any
  if (hasStorage(storageType)) return globalSelf[storageType]
  else {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        `redux-persist failed to create sync storage. falling back to noop storage.`
      )
    }
    return noopStorage
  }
}
