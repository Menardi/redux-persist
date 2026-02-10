import { describe, test, expect } from 'vitest'

import persistCombineReducers from '../src/persistCombineReducers'
import { createInMemoryStorage } from './utils/inMemoryStorage'

const config = {
  key: 'TestConfig',
  storage: createInMemoryStorage()
}

describe('persistCombineReducers', () => {
  test('returns a function', () => {
    let reducer = persistCombineReducers(config, {
      foo: () => ({})
    })

    expect(typeof reducer).toBe('function')
  })

  test('merges two levels deep of state', () => {

  })
})
