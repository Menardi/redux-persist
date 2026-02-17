import { spy, useFakeTimers, type SinonFakeTimers, type SinonSpy } from 'sinon';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import createPersistoid from '../src/createPersistoid';
import { PersistConfig } from '../src/types';
import { createInMemoryStorage } from './utils/inMemoryStorage';

describe('createPersistoid', () => {
  let memoryStorage: ReturnType<typeof createInMemoryStorage>;
  let setItemSpy: SinonSpy;
  let clock: SinonFakeTimers;
  let config: PersistConfig;

  beforeEach(() => {
    memoryStorage = createInMemoryStorage();
    setItemSpy = spy(memoryStorage, 'setItem');
    clock = useFakeTimers();
    config = {
      key: 'persist-reducer-test',
      version: 1,
      storage: memoryStorage,
    };
  });

  afterEach(() => {
    clock.restore();
  });

  it('writes transformed data to storage', () => {
    const { update } = createPersistoid({
      ...config,
      transforms: [
        {
          reducerName: 'count',
          onBeforePersist: (state: number) => state * 10,
        },
      ],
    });

    update({ count: 5 });
    clock.tick(1);

    expect(setItemSpy.calledOnce).toBe(true);
    // The transform should have turned 5 into 50
    expect(setItemSpy.firstCall.args[1]).toBe('{"count":"50"}');
  });

  it('does not write key to storage if a transform fails, but still writes successful keys', () => {
    const { update } = createPersistoid({
      ...config,
      transforms: [
        {
          reducerName: 'count',
          onBeforePersist: () => { throw new Error('transform error'); },
        },
        {
          reducerName: 'name',
          onBeforePersist: (state: string) => state.toUpperCase(),
        },
      ],
    });

    update({ count: 5, name: 'alice' });
    expect(() => clock.tick(1)).toThrow('transform error');
    // The failed 'count' key is not written, but 'name' still gets persisted
    expect(setItemSpy.calledOnce).toBe(true);
    expect(setItemSpy.firstCall.args[1]).toBe('{"name":"\\"ALICE\\""}');
  });

  it('throws an error if serialization fails for a key', () => {
    const { update } = createPersistoid({
      ...config,
      serialize: () => { throw new Error('serialization error'); },
    });

    update({ a: 1 });
    expect(() => clock.tick(1)).toThrow('serialization error');
    expect(setItemSpy.called).toBe(false);
  });
});
