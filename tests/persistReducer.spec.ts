import { test, expect } from 'vitest'
import sinon from 'sinon'

import _ from 'lodash'
import configureStore from 'redux-mock-store'

import persistReducer from '../src/persistReducer'
import { createMemoryStorage } from 'storage-memory'
import { PERSIST, REHYDRATE } from '../src/constants'
import sleep from './utils/sleep'

let mockStore = configureStore([])
let reducer = () => ({})
const config = {
  key: 'persist-reducer-test',
  version: 1,
  storage: createMemoryStorage()
}

test('persistedReducer does not automatically set _persist state', () => {
  let persistedReducer = persistReducer(config, reducer)
  let state = persistedReducer({}, {})
  console.log('state', state)
  expect(state._persist).toBe(undefined)
})

test('persistedReducer does returns versioned, rehydrate tracked _persist state upon PERSIST', () => {
  let persistedReducer = persistReducer(config, reducer)
  let register = sinon.spy()
  let rehydrate = sinon.spy()
  let state = persistedReducer({}, { type: PERSIST, register, rehydrate })
  expect(state._persist).toEqual({ version: 1, rehydrated: false})
})

test('persistedReducer calls register and rehydrate after PERSIST', async () => {
  let persistedReducer = persistReducer(config, reducer)
  let register = sinon.spy()
  let rehydrate = sinon.spy()
  let state = persistedReducer({}, { type: PERSIST, register, rehydrate })
  await sleep(1)
  expect(register.callCount).toBe(1)
  expect(rehydrate.callCount).toBe(1)
})