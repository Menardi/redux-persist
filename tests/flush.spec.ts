import { test, expect } from 'vitest'

import _ from 'lodash'
import { createStore } from 'redux'

import getStoredState from '../src/getStoredState'
import persistReducer from '../src/persistReducer'
import persistStore from '../src/persistStore'
import { createMemoryStorage } from 'storage-memory'

const INCREMENT = 'INCREMENT'

const initialState = { a: 0, b: 10, c: 100}
let reducer = (state = initialState, { type }) => {
  console.log('action', type)
  if (type === INCREMENT) {
    return _.mapValues(state, v => v + 1)
  }
  return state
}

const memoryStorage = createMemoryStorage()

const config = {
  key: 'persist-reducer-test',
  version: 1,
  storage: memoryStorage,
  debug: true,
  throttle: 1000,
}

test('state before flush is not updated, after flush is', () => {
  return new Promise<void>((resolve) => {
    let rootReducer = persistReducer(config, reducer)
    const store = createStore(rootReducer)
    const persistor = persistStore(store, {}, async () => {
      store.dispatch({ type: INCREMENT })
      const state = store.getState()
      let storedPreFlush = await getStoredState(config)
      expect(storedPreFlush && storedPreFlush.c).not.toBe(state.c)
      await persistor.flush()
      let storedPostFlush = await getStoredState(config)
      expect(storedPostFlush && storedPostFlush.c).toBe(state.c)
      resolve()
    })
  })
})
