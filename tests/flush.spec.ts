import { mapValues } from 'lodash';
import { createStore } from 'redux';
import { describe, expect, it } from 'vitest';

import getStoredState from '../src/getStoredState';
import persistReducer from '../src/persistReducer';
import persistStore from '../src/persistStore';
import { createInMemoryStorage } from './utils/inMemoryStorage';

const INCREMENT = 'INCREMENT';

const initialState = { a: 0, b: 10, c: 100};
const reducer = (state = initialState, { type }) => {
  if (type === INCREMENT) {
    return mapValues(state, v => v + 1);
  }

  return state;
};

describe('flush', () => {
  it('state before flush is not updated, after flush is', () => {
    return new Promise<void>((resolve) => {
      const memoryStorage = createInMemoryStorage();

      const config = {
        key: 'persist-reducer-test',
        version: 1,
        storage: memoryStorage,
        debug: true,
        throttle: 1000,
      };

      const rootReducer = persistReducer(config, reducer);
      const store = createStore(rootReducer);
      const persistor = persistStore(store, {}, async () => {
        store.dispatch({ type: INCREMENT });
        const state = store.getState();
        const storedPreFlush = await getStoredState(config);
        expect(storedPreFlush && storedPreFlush.c).not.toBe(state.c);
        await persistor.flush();
        const storedPostFlush = await getStoredState(config);
        expect(storedPostFlush && storedPostFlush.c).toBe(state.c);
        resolve();
      });
    });
  });
});
