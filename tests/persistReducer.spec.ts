import { spy, type SinonSpy } from 'sinon';
import { describe, test, expect, beforeEach } from 'vitest';

import { PERSIST } from '../src/constants';
import persistReducer from '../src/persistReducer';
import { createInMemoryStorage } from './utils/inMemoryStorage';
import sleep from './utils/sleep';

const emptyReducer = () => ({});
const config = {
  key: 'persist-reducer-test',
  version: 1,
  storage: createInMemoryStorage(),
};

describe('persistReducer', () => {
  let register: SinonSpy;
  let rehydrate: SinonSpy;

  beforeEach(() => {
    register = spy();
    rehydrate = spy();
  });

  test('does not automatically set _persist state', () => {
    const persistedReducer = persistReducer(config, emptyReducer);
    const state = persistedReducer({} as any, {});
    expect(state._persist).toBe(undefined);
  });

  test('returns versioned, rehydrate tracked _persist state upon PERSIST', () => {
    const persistedReducer = persistReducer(config, emptyReducer);
    const state = persistedReducer({} as any, { type: PERSIST, register, rehydrate });
    expect(state._persist).toEqual({ version: 1, rehydrated: false});
  });

  test('calls register and rehydrate after PERSIST', async () => {
    const persistedReducer = persistReducer(config, emptyReducer);
    persistedReducer({} as any, { type: PERSIST, register, rehydrate });
    await sleep(1);
    expect(register.callCount).toBe(1);
    expect(rehydrate.callCount).toBe(1);
  });

  test('does not rehydrate on storage error and calls onError', async () => {
    const errorStorage = {
      getItem: () => Promise.reject(new Error('storage read error')),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
    const onError = spy();
    const errorConfig = {
      key: 'persist-reducer-error-test',
      version: 1,
      storage: errorStorage,
      onError,
    };
    const persistedReducer = persistReducer(errorConfig, emptyReducer);
    persistedReducer({} as any, { type: PERSIST, register, rehydrate });
    // wait for getStoredState rejection + setTimeout for onError
    await sleep(10);
    expect(rehydrate.callCount).toBe(0);
    expect(onError.callCount).toBe(1);
    expect(onError.firstCall.args[0].message).toBe('storage read error');
  });

  test('pauses persistence on rehydration error', async () => {
    const errorStorage = {
      getItem: () => Promise.reject(new Error('storage error')),
      setItem: spy(() => Promise.resolve()),
      removeItem: () => Promise.resolve(),
    };
    const onError = spy();
    const errorConfig = {
      key: 'persist-reducer-pause-test',
      version: 1,
      storage: errorStorage,
      onError,
    };
    const baseReducer = (state: any = { count: 0 }, action: any) => {
      if (action.type === 'INCREMENT') return { ...state, count: state.count + 1 };
      return state;
    };
    const persistedReducer = persistReducer(errorConfig, baseReducer);
    const state = persistedReducer(undefined, { type: PERSIST, register, rehydrate });
    await sleep(10);
    // After the error, _paused should be true, so updates should not persist
    persistedReducer(state, { type: 'INCREMENT' });
    await sleep(10);
    // setItem should never have been called since persistence is paused
    expect(errorStorage.setItem.callCount).toBe(0);
  });

  test('does not rehydrate on migration error and calls onError', async () => {
    const storage = createInMemoryStorage();
    // Pre-populate storage so getStoredState returns data
    await storage.setItem('persist:persist-reducer-migrate-test', JSON.stringify({ foo: '"bar"' }));
    const onError = spy();
    const migrateConfig = {
      key: 'persist-reducer-migrate-test',
      version: 2,
      storage,
      onError,
      migrate: () => Promise.reject(new Error('migration failed')),
    };
    const persistedReducer = persistReducer(migrateConfig, emptyReducer);
    persistedReducer({} as any, { type: PERSIST, register, rehydrate });
    await sleep(10);
    expect(rehydrate.callCount).toBe(0);
    expect(onError.callCount).toBe(1);
    expect(onError.firstCall.args[0].message).toBe('migration failed');
  });
});
