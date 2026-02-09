import getStorage from './getStorage'
import { WebStorage } from '../types'

export default function createWebStorage(type: string): WebStorage {
  let storage = getStorage(type)
  return {
    getItem: (key: string): Promise<string | null> => {
      return new Promise((resolve, reject) => {
        resolve(storage.getItem(key))
      })
    },
    setItem: (key: string, item: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        resolve(storage.setItem(key, item))
      })
    },
    removeItem: (key: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        resolve(storage.removeItem(key))
      })
    },
  }
}
