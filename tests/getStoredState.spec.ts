import { describe, expect, it } from 'vitest';

import getStoredState from '../src/getStoredState';
import { PersistConfig, Storage } from '../src/types';

describe('getStoredState', () => {
  const storedState = { counter: JSON.stringify(15), user: JSON.stringify('tester') };
  const serialized = JSON.stringify(storedState);

  it('works with an asynchronous getItem (promise)', async () => {
    const storage: Storage = {
      getItem: (key: string) => Promise.resolve(key === 'persist:test' ? serialized : null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
    const config: PersistConfig = { key: 'test', storage };

    const result = await getStoredState(config);
    expect(result).toEqual({ counter: 15, user: 'tester' });
  });

  it('works with a synchronous getItem', async () => {
    const storage: Storage = {
      getItem: (key: string) => (key === 'persist:test' ? serialized : null),
      setItem: () => {},
      removeItem: () => {},
    };
    const config: PersistConfig = { key: 'test', storage };

    const result = await getStoredState(config);
    expect(result).toEqual({ counter: 15, user: 'tester' });
  });
});
