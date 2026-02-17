import { spy, useFakeTimers } from 'sinon';
import { describe, expect, beforeEach, afterEach, it } from 'vitest';

import createPersistoid from '../src/createPersistoid';
import { createInMemoryStorage } from './utils/inMemoryStorage';
import { PersistConfig } from '../src/types';

describe('createPersistoid', () => {
  let setItemSpy: sinon.SinonSpy;
  let clock: sinon.SinonFakeTimers;
  let config: PersistConfig;

  beforeEach(() => {
    const memoryStorage = createInMemoryStorage();
    setItemSpy = spy(memoryStorage, 'setItem');

    config = {
      key: 'persist-reducer-test',
      version: 1,
      storage: memoryStorage,
    };

    clock = useFakeTimers();
  });

  afterEach(() => {
    setItemSpy.restore();
    clock.restore();
  });

  it('updates changed state', () => {
    const { update } = createPersistoid(config);
    update({ a: 1 });
    clock.tick(1);
    update({ a: 2 });
    clock.tick(1);
    expect(setItemSpy.calledTwice).toBe(true);
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{"a":"1"}').calledOnce).toBe(true);
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{"a":"2"}').calledOnce).toBe(true);
  });

  it('does not update unchanged state', () => {
    const { update } = createPersistoid(config);
    update({ a: undefined, b: 1 });
    clock.tick(1);
    // This update should not cause a write.
    update({ a: undefined, b: 1 });
    clock.tick(1);
    expect(setItemSpy.calledOnce).toBe(true);
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{"b":"1"}').calledOnce).toBe(true);
  });

  it('updates removed keys', () => {
    const { update } = createPersistoid(config);
    update({ a: undefined, b: 1 });
    clock.tick(1);
    update({ a: undefined, b: undefined });
    clock.tick(1);
    expect(setItemSpy.calledTwice).toBe(true);
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{"b":"1"}').calledOnce).toBe(true);
    expect(setItemSpy.withArgs('persist:persist-reducer-test', '{}').calledOnce).toBe(true);
  });

  it('throws when a transform errors', () => {
    const { update } = createPersistoid({
      ...config,
      transforms: [{
        reducerName: 'a' as const,
        onBeforePersist: () => { throw new Error('transform error'); },
      }],
    });
    update({ a: 1 });
    expect(() => clock.tick(1)).toThrow('transform error');
  });

  it('does not write to storage after a transform error', () => {
    const { update } = createPersistoid({
      ...config,
      transforms: [{
        reducerName: 'a' as const,
        onBeforePersist: () => { throw new Error('transform error'); },
      }],
    });
    update({ a: 1 });
    try { clock.tick(1); } catch { /* expected */ }

    expect(setItemSpy.callCount).toBe(0);
  });
});
