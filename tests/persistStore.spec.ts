import { test, expect } from 'vitest'
import sinon from 'sinon'

import _ from 'lodash'
import configureStore from 'redux-mock-store'

import persistStore from '../src/persistStore'
import { PERSIST, REHYDRATE } from '../src/constants'

let mockStore = configureStore([])

test('persistStore dispatches PERSIST action', () => {
  let store = mockStore()
  let persistor = persistStore(store)
  let actions = store.getActions()
  let persistAction  =_.find(actions, { type: PERSIST })
  expect(persistAction).toBeTruthy()
})

test('register method adds a key to the registry', () => {
  let store = mockStore()
  let persistor = persistStore(store)
  let actions = store.getActions()
  let persistAction  =_.find(actions, { type: PERSIST })
  persistAction.register('canary')
  expect(persistor.getState().registry).toEqual(['canary'])
})

test('rehydrate method fires with the expected shape', () => {
  let store = mockStore()
  let persistor = persistStore(store)
  let actions = store.getActions()
  let persistAction  =_.find(actions, { type: PERSIST })
  persistAction.rehydrate('canary', { foo: 'bar' }, null)
  let rehydrateAction  =_.find(actions, { type: REHYDRATE })
  expect(rehydrateAction).toEqual({ type: REHYDRATE, key: 'canary', payload: { foo: 'bar' }, err: null })
})

test('rehydrate method removes provided key from registry', () => {
  let store = mockStore()
  let persistor = persistStore(store)
  let actions = store.getActions()
  let persistAction  =_.find(actions, { type: PERSIST })

  // register canary
  persistAction.register('canary')
  expect(persistor.getState().registry).toEqual(['canary'])

  // rehydrate canary
  persistAction.rehydrate('canary', { foo: 'bar' }, null)
  expect(persistor.getState().registry).toEqual([])
})

test('rehydrate method removes exactly one of provided key from registry', () => {
  let store = mockStore()
  let persistor = persistStore(store)
  let actions = store.getActions()
  let persistAction  =_.find(actions, { type: PERSIST })

  // register canary twice
  persistAction.register('canary')
  persistAction.register('canary')
  expect(persistor.getState().registry).toEqual(['canary', 'canary'])

  // rehydrate canary
  persistAction.rehydrate('canary', { foo: 'bar' }, null)
  expect(persistor.getState().registry).toEqual(['canary'])
})

test('once registry is cleared for first time, persistor is flagged as bootstrapped', () => {
  let store = mockStore()
  let persistor = persistStore(store)
  let actions = store.getActions()
  let persistAction  =_.find(actions, { type: PERSIST })

  persistAction.register('canary')
  expect(persistor.getState().bootstrapped).toBe(false)
  persistAction.rehydrate('canary', { foo: 'bar' }, null)
  expect(persistor.getState().bootstrapped).toBe(true)
})

test('once persistor is flagged as bootstrapped, further registry changes do not affect this value', () => {
  let store = mockStore()
  let persistor = persistStore(store)
  let actions = store.getActions()
  let persistAction  =_.find(actions, { type: PERSIST })

  persistAction.register('canary')
  expect(persistor.getState().bootstrapped).toBe(false)
  persistAction.rehydrate('canary', { foo: 'bar' }, null)
  expect(persistor.getState().bootstrapped).toBe(true)

  // add canary back, registry is updated but bootstrapped remains true
  persistAction.register('canary')
  expect(persistor.getState().registry).toEqual(['canary'])
  expect(persistor.getState().bootstrapped).toBe(true)
})

test('persistStore calls bootstrapped callback (at most once) if provided', () => {
  let store = mockStore()
  let bootstrappedCb = sinon.spy()
  let persistor = persistStore(store, {}, bootstrappedCb)
  let actions = store.getActions()
  let persistAction  =_.find(actions, { type: PERSIST })

  persistAction.register('canary')
  persistAction.rehydrate('canary', { foo: 'bar' }, null)
  expect(bootstrappedCb.callCount).toBe(1)

  // further rehydrates do not trigger the cb
  persistAction.register('canary')
  persistAction.rehydrate('canary', { foo: 'bar' }, null)
  expect(bootstrappedCb.callCount).toBe(1)
})