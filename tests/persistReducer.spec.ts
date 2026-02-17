import { spy, type SinonSpy } from 'sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { PERSIST, REHYDRATE } from '../src/constants';
import persistReducer from '../src/persistReducer';
import { createInMemoryStorage } from './utils/inMemoryStorage';
import sleep from './utils/sleep';
import * as autoMergeLevel1Module from '../src/stateReconciler/autoMergeLevel1';
import * as autoMergeLevel2Module from '../src/stateReconciler/autoMergeLevel2';

const reconcilerSpies = {
  level1: vi.spyOn(autoMergeLevel1Module, 'default'),
  level2: vi.spyOn(autoMergeLevel2Module, 'default'),
};

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

  it('does not automatically set _persist state', () => {
    const persistedReducer = persistReducer(config, emptyReducer);
    const state = persistedReducer({} as any, {});
    expect(state._persist).toBe(undefined);
  });

  it('returns versioned, rehydrate tracked _persist state upon PERSIST', () => {
    const persistedReducer = persistReducer(config, emptyReducer);
    const state = persistedReducer({} as any, { type: PERSIST, register, rehydrate });
    expect(state._persist).toEqual({ version: 1, rehydrated: false});
  });

  it('calls register and rehydrate after PERSIST', async () => {
    const persistedReducer = persistReducer(config, emptyReducer);
    persistedReducer({} as any, { type: PERSIST, register, rehydrate });
    await sleep(1);
    expect(register.callCount).toBe(1);
    expect(rehydrate.callCount).toBe(1);
  });

  it('does not rehydrate on storage error and calls onError', async () => {
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

  it('pauses persistence on rehydration error', async () => {
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

  it('does not rehydrate on migration error and calls onError', async () => {
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

  describe('rehydrationDepth', () => {
    const baseReducer = (state: any = { count: 0 }, action: any) => {
      if (action.type === 'INCREMENT') return { ...state, count: state.count + 1 };
      return state;
    };

    beforeEach(() => {
      reconcilerSpies.level1.mockClear();
      reconcilerSpies.level2.mockClear();
    });

    it('uses autoMergeLevel2 for state reconciliation if rehydrationDepth is not specified', async () => {
      const storage = createInMemoryStorage();
      await storage.setItem('persist:depth-default', JSON.stringify({ count: '"5"' }));
      const testConfig = { key: 'depth-default', version: 1, storage };

      const persistedReducer = persistReducer(testConfig, baseReducer);
      const state = persistedReducer(undefined, { type: PERSIST, register, rehydrate });
      await sleep(10);

      const payload = rehydrate.firstCall.args[1];
      persistedReducer(state, { type: REHYDRATE, key: testConfig.key, payload });

      expect(reconcilerSpies.level2).toHaveBeenCalledOnce();
      expect(reconcilerSpies.level1).not.toHaveBeenCalled();
    });

    it('uses autoMergeLevel1 for state reconciliation if rehydrationDepth=1', async () => {
      const storage = createInMemoryStorage();
      await storage.setItem('persist:depth-1', JSON.stringify({ count: '"5"' }));
      const testConfig = { key: 'depth-1', version: 1, storage, rehydrationDepth: 1 as const };

      const persistedReducer = persistReducer(testConfig, baseReducer);
      const state = persistedReducer(undefined, { type: PERSIST, register, rehydrate });
      await sleep(10);

      const payload = rehydrate.firstCall.args[1];
      persistedReducer(state, { type: REHYDRATE, key: testConfig.key, payload });

      expect(reconcilerSpies.level1).toHaveBeenCalledOnce();
      expect(reconcilerSpies.level2).not.toHaveBeenCalled();
    });

    it('uses autoMergeLevel2 for state reconciliation if rehydrationDepth=2', async () => {
      const storage = createInMemoryStorage();
      await storage.setItem('persist:depth-2', JSON.stringify({ count: '"5"' }));
      const testConfig = { key: 'depth-2', version: 1, storage, rehydrationDepth: 2 as const };

      const persistedReducer = persistReducer(testConfig, baseReducer);
      const state = persistedReducer(undefined, { type: PERSIST, register, rehydrate });
      await sleep(10);

      const payload = rehydrate.firstCall.args[1];
      persistedReducer(state, { type: REHYDRATE, key: testConfig.key, payload });

      expect(reconcilerSpies.level2).toHaveBeenCalledOnce();
      expect(reconcilerSpies.level1).not.toHaveBeenCalled();
    });
  });
});
