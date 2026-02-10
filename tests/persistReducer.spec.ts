import { describe, test, expect, beforeEach } from 'vitest'
import { spy, type SinonSpy } from 'sinon'

import persistReducer from '../src/persistReducer'
import { PERSIST } from '../src/constants'
import sleep from './utils/sleep'
import { createInMemoryStorage } from './utils/inMemoryStorage'

let emptyReducer = () => ({})
const config = {
  key: 'persist-reducer-test',
  version: 1,
  storage: createInMemoryStorage()
}

describe('persistReducer', () => {
  let register: SinonSpy
  let rehydrate: SinonSpy

  beforeEach(() => {
    register = spy()
    rehydrate = spy()
  })

  test('does not automatically set _persist state', () => {
    let persistedReducer = persistReducer(config, emptyReducer)
    let state = persistedReducer({} as any, {})
    expect(state._persist).toBe(undefined)
  })

  test('returns versioned, rehydrate tracked _persist state upon PERSIST', () => {
    let persistedReducer = persistReducer(config, emptyReducer)
    let state = persistedReducer({} as any, { type: PERSIST, register, rehydrate })
    expect(state._persist).toEqual({ version: 1, rehydrated: false})
  })

  test('calls register and rehydrate after PERSIST', async () => {
    let persistedReducer = persistReducer(config, emptyReducer)
    let state = persistedReducer({} as any, { type: PERSIST, register, rehydrate })
    await sleep(1)
    expect(register.callCount).toBe(1)
    expect(rehydrate.callCount).toBe(1)
  })

  test('does not rehydrate on storage error and calls onError', async () => {
    const errorStorage = {
      getItem: () => Promise.reject(new Error('storage read error')),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    }
    let onError = spy()
    let errorConfig = {
      key: 'persist-reducer-error-test',
      version: 1,
      storage: errorStorage,
      onError,
    }
    let persistedReducer = persistReducer(errorConfig, emptyReducer)
    persistedReducer({} as any, { type: PERSIST, register, rehydrate })
    // wait for getStoredState rejection + setTimeout for onError
    await sleep(10)
    expect(rehydrate.callCount).toBe(0)
    expect(onError.callCount).toBe(1)
    expect(onError.firstCall.args[0].message).toBe('storage read error')
  })

  test('pauses persistence on rehydration error', async () => {
    const errorStorage = {
      getItem: () => Promise.reject(new Error('storage error')),
      setItem: spy(() => Promise.resolve()),
      removeItem: () => Promise.resolve(),
    }
    let onError = spy()
    let errorConfig = {
      key: 'persist-reducer-pause-test',
      version: 1,
      storage: errorStorage,
      onError,
    }
    let baseReducer = (state: any = { count: 0 }, action: any) => {
      if (action.type === 'INCREMENT') return { ...state, count: state.count + 1 }
      return state
    }
    let persistedReducer = persistReducer(errorConfig, baseReducer)
    let state = persistedReducer(undefined, { type: PERSIST, register, rehydrate })
    await sleep(10)
    // After the error, _paused should be true, so updates should not persist
    persistedReducer(state, { type: 'INCREMENT' })
    await sleep(10)
    // setItem should never have been called since persistence is paused
    expect(errorStorage.setItem.callCount).toBe(0)
  })

  test('does not rehydrate on migration error and calls onError', async () => {
    const storage = createInMemoryStorage()
    // Pre-populate storage so getStoredState returns data
    await storage.setItem('persist:persist-reducer-migrate-test', JSON.stringify({ foo: '"bar"' }))
    let onError = spy()
    let migrateConfig = {
      key: 'persist-reducer-migrate-test',
      version: 2,
      storage,
      onError,
      migrate: () => Promise.reject(new Error('migration failed')),
    }
    let persistedReducer = persistReducer(migrateConfig, emptyReducer)
    persistedReducer({} as any, { type: PERSIST, register, rehydrate })
    await sleep(10)
    expect(rehydrate.callCount).toBe(0)
    expect(onError.callCount).toBe(1)
    expect(onError.firstCall.args[0].message).toBe('migration failed')
  })
})
