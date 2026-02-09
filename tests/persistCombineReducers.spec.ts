import persistCombineReducers from '../src/persistCombineReducers'
import { createMemoryStorage } from 'storage-memory'

import { test, expect } from 'vitest'

const config = {
  key: 'TestConfig',
  storage: createMemoryStorage()
}

test('persistCombineReducers returns a function', () => {
  let reducer = persistCombineReducers(config, {
    foo: () => ({})
  })

  expect(typeof reducer).toBe('function')
})

test.skip('persistCombineReducers merges two levels deep of state', () => {

})