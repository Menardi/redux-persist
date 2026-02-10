import { configureStore, createSlice } from '@reduxjs/toolkit';
import { combineReducers, createStore } from 'redux';
import { spy } from 'sinon';
import { describe, expect, it } from 'vitest';

import persistReducer from '../src/persistReducer';
import persistStore from '../src/persistStore';
import brokenStorage from './utils/brokenStorage';
import { createInMemoryStorage } from './utils/inMemoryStorage';
import { ALL_PERSIST_ACTIONS } from '../src/constants';

const reducer = () => ({});
const config = {
  key: 'persist-reducer-test',
  version: 1,
  storage: createInMemoryStorage(),
  debug: true,
  timeout: 5,
};

describe('complete integration', () => {
  it('multiple persistReducers work together', () => {
    return new Promise<void>((resolve) => {
      const r1 = persistReducer(config, reducer);
      const r2 = persistReducer(config, reducer);
      const rootReducer = combineReducers({ r1, r2 });
      const store = createStore(rootReducer);
      const persistor = persistStore(store, {}, () => {
        expect(persistor.getState().bootstrapped).toBe(true);
        resolve();
      });
    });
  });

  it('persistStore timeout 0 never bootstraps', () => {
    return new Promise<void>((resolve, reject) => {
      const r1 = persistReducer({...config, storage: brokenStorage, timeout: 0}, reducer);
      const rootReducer = combineReducers({ r1 });
      const store = createStore(rootReducer);
      const persistor = persistStore(store, null, () => {
        console.log('resolve');
        reject();
      });
      setTimeout(() => {
        expect(persistor.getState().bootstrapped).toBe(false);
        resolve();
      }, 10);
    });
  });

  it('persistStore timeout calls onError and does not bootstrap', () => {
    return new Promise<void>((resolve) => {
      const onError = spy();
      const r1 = persistReducer({...config, storage: brokenStorage, onError}, reducer);
      const rootReducer = combineReducers({ r1 });
      const store = createStore(rootReducer);
      const persistor = persistStore(store, null);
      setTimeout(() => {
        expect(persistor.getState().bootstrapped).toBe(false);
        expect(onError.callCount).toBe(1);
        expect(onError.firstCall.args[0].message).toContain('persist timed out');
        resolve();
      }, 10);
    });
  });

  it('persists and rehydrates with redux-toolkit', async () => {
    const storage = createInMemoryStorage();
    const persistConfig = {
      key: 'rtk-test',
      version: 1,
      storage,
      timeout: 5,
    };

    const counterSlice = createSlice({
      name: 'counter',
      initialState: { value: 26 },
      reducers: {
        increment: (state) => { state.value += 1; },
      },
    });

    const persistedReducer = persistReducer(persistConfig, counterSlice.reducer);
    const store1 = configureStore({
      reducer: persistedReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: { ignoredActions: ALL_PERSIST_ACTIONS } }),
    });

    // Wait for first rehydration
    let persistor1!: ReturnType<typeof persistStore>;
    await new Promise<void>((resolve) => { persistor1 = persistStore(store1, null, resolve); });

    // After first rehydration, dispatch an action to change state
    store1.dispatch(counterSlice.actions.increment());
    expect(store1.getState().value).toBe(27);

    // Flush to ensure state is written to storage
    await persistor1.flush();

    // Create a second store with the same storage to verify rehydration
    const persistedReducer2 = persistReducer(persistConfig, counterSlice.reducer);
    const store2 = configureStore({
      reducer: persistedReducer2,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: { ignoredActions: ALL_PERSIST_ACTIONS } }),
    });

    await new Promise<void>((resolve) => { persistStore(store2, null, resolve); });
    expect(store2.getState().value).toBe(27);
  });
});
