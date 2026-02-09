import { test, expect } from 'vitest'
import sinon from 'sinon'

import _ from 'lodash'
import configureStore from 'redux-mock-store'
import { combineReducers, createStore } from 'redux'

import persistReducer from '../src/persistReducer'
import persistStore from '../src/persistStore'
import { createMemoryStorage } from 'storage-memory'
import brokenStorage from './utils/brokenStorage'
import { PERSIST, REHYDRATE } from '../src/constants'
import sleep from './utils/sleep'

let reducer = () => ({})
const config = {
  key: 'persist-reducer-test',
  version: 1,
  storage: createMemoryStorage(),
  debug: true,
  timeout: 5,
}

test('multiple persistReducers work together', () => {
  return new Promise<void>((resolve) => {
    let r1 = persistReducer(config, reducer)
    let r2 = persistReducer(config, reducer)
    const rootReducer = combineReducers({ r1, r2 })
    const store = createStore(rootReducer)
    const persistor = persistStore(store, {}, () => {
      expect(persistor.getState().bootstrapped).toBe(true)
      resolve()
    })
  })
})

test('persistStore timeout 0 never bootstraps', () => {
  return new Promise<void>((resolve, reject) => {
    let r1 = persistReducer({...config, storage: brokenStorage, timeout: 0}, reducer)
    const rootReducer = combineReducers({ r1 })
    const store = createStore(rootReducer)
    const persistor = persistStore(store, null, () => {
      console.log('resolve')
      reject()
    })
    setTimeout(() => {
      expect(persistor.getState().bootstrapped).toBe(false)
      resolve()
    }, 10)
  })
})


test('persistStore timeout forces bootstrap', () => {
  return new Promise<void>((resolve, reject) => {
    let r1 = persistReducer({...config, storage: brokenStorage}, reducer)
    const rootReducer = combineReducers({ r1 })
    const store = createStore(rootReducer)
    const persistor = persistStore(store, null, () => {
      expect(persistor.getState().bootstrapped).toBe(true)
      resolve()
    })
    setTimeout(() => {
      reject()
    }, 10)
  })
})
