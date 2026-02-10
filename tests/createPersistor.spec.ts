import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { spy, useFakeTimers } from 'sinon'

import createPersistoid from '../src/createPersistoid'
import { createInMemoryStorage } from './utils/inMemoryStorage'

const memoryStorage = createInMemoryStorage()

const config = {
  key: 'persist-reducer-test',
  version: 1,
  storage: memoryStorage,
  debug: true
}

describe('createPersistoid', () => {
  let setItemSpy: sinon.SinonSpy
  let clock: sinon.SinonFakeTimers

  beforeEach(() => {
    setItemSpy = spy(memoryStorage, 'setItem')
    clock = useFakeTimers()
  })

  afterEach(() => {
    setItemSpy.restore()
    clock.restore()
  })

  test('updates changed state', () => {
    const { update } = createPersistoid(config)
    update({ a: 1 })
    clock.tick(1)
    update({ a: 2 })
    clock.tick(1)
    expect(setItemSpy.calledTwice).toBe(true)
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{"a":"1"}').calledOnce).toBe(true)
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{"a":"2"}').calledOnce).toBe(true)
  })

  test('does not update unchanged state', () => {
    const { update } = createPersistoid(config)
    update({ a: undefined, b: 1 })
    clock.tick(1)
    // This update should not cause a write.
    update({ a: undefined, b: 1 })
    clock.tick(1)
    expect(setItemSpy.calledOnce).toBe(true)
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{"b":"1"}').calledOnce).toBe(true)
  })

  test('updates removed keys', () => {
    const { update } = createPersistoid(config)
    update({ a: undefined, b: 1 })
    clock.tick(1)
    update({ a: undefined, b: undefined })
    clock.tick(1)
    expect(setItemSpy.calledTwice).toBe(true)
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{"b":"1"}').calledOnce).toBe(true)
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{}').calledOnce).toBe(true)
  })

  test('throws when a transform errors', () => {
    const errorTransform = {
      in: () => { throw new Error('transform error') },
      out: (s: any) => s,
    }
    const { update } = createPersistoid({
      ...config,
      transforms: [errorTransform],
    })
    update({ a: 1 })
    expect(() => clock.tick(1)).toThrow('transform error')
  })

  test('does not write to storage after a transform error', () => {
    const errorTransform = {
      in: () => { throw new Error('transform error') },
      out: (s: any) => s,
    }
    const { update } = createPersistoid({
      ...config,
      transforms: [errorTransform],
    })
    update({ a: 1 })
    try { clock.tick(1) } catch (_e) { /* expected */ }
    expect(setItemSpy.callCount).toBe(0)
  })
})
