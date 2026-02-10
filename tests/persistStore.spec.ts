import { createStore, AnyAction } from 'redux';
import { spy } from 'sinon';
import { describe, test, expect, beforeEach } from 'vitest';

import { PERSIST, REHYDRATE } from '../src/constants';
import persistStore from '../src/persistStore';

/**
 * Creates a real Redux store that records all dispatched actions.
 * Replaces redux-mock-store usage.
 */
function createTestStore() {
  const actions: AnyAction[] = [];
  const store = createStore((state: any = {}, action: AnyAction) => {
    actions.push(action);
    return state;
  });
  return { store, getActions: () => actions };
}

describe('persistStore', () => {
  let store: ReturnType<typeof createTestStore>['store'];
  let getActions: ReturnType<typeof createTestStore>['getActions'];
  let persistor: ReturnType<typeof persistStore>;
  let persistAction: AnyAction;

  beforeEach(() => {
    ({ store, getActions } = createTestStore());
    persistor = persistStore(store);
    persistAction = getActions().find(a => a.type === PERSIST)!;
  });

  test('dispatches PERSIST action', () => {
    expect(persistAction).toBeTruthy();
  });

  test('register method adds a key to the registry', () => {
    persistAction.register('canary');
    expect(persistor.getState().registry).toEqual(['canary']);
  });

  test('rehydrate method fires with the expected shape', () => {
    persistAction.rehydrate('canary', { foo: 'bar' }, null);
    const rehydrateAction = getActions().find(a => a.type === REHYDRATE);
    expect(rehydrateAction).toEqual({ type: REHYDRATE, key: 'canary', payload: { foo: 'bar' }, err: null });
  });

  test('rehydrate method removes provided key from registry', () => {
    persistAction.register('canary');
    expect(persistor.getState().registry).toEqual(['canary']);

    persistAction.rehydrate('canary', { foo: 'bar' }, null);
    expect(persistor.getState().registry).toEqual([]);
  });

  test('rehydrate method removes exactly one of provided key from registry', () => {
    persistAction.register('canary');
    persistAction.register('canary');
    expect(persistor.getState().registry).toEqual(['canary', 'canary']);

    persistAction.rehydrate('canary', { foo: 'bar' }, null);
    expect(persistor.getState().registry).toEqual(['canary']);
  });

  test('once registry is cleared for first time, persistor is flagged as bootstrapped', () => {
    persistAction.register('canary');
    expect(persistor.getState().bootstrapped).toBe(false);
    persistAction.rehydrate('canary', { foo: 'bar' }, null);
    expect(persistor.getState().bootstrapped).toBe(true);
  });

  test('once persistor is flagged as bootstrapped, further registry changes do not affect this value', () => {
    persistAction.register('canary');
    expect(persistor.getState().bootstrapped).toBe(false);
    persistAction.rehydrate('canary', { foo: 'bar' }, null);
    expect(persistor.getState().bootstrapped).toBe(true);

    // add canary back, registry is updated but bootstrapped remains true
    persistAction.register('canary');
    expect(persistor.getState().registry).toEqual(['canary']);
    expect(persistor.getState().bootstrapped).toBe(true);
  });

  test('calls bootstrapped callback (at most once) if provided', () => {
    // This test needs its own persistor with a callback
    ({ store, getActions } = createTestStore());
    const bootstrappedCb = spy();
    persistor = persistStore(store, {}, bootstrappedCb);
    persistAction = getActions().find(a => a.type === PERSIST)!;

    persistAction.register('canary');
    persistAction.rehydrate('canary', { foo: 'bar' }, null);
    expect(bootstrappedCb.callCount).toBe(1);

    // further rehydrates do not trigger the cb
    persistAction.register('canary');
    persistAction.rehydrate('canary', { foo: 'bar' }, null);
    expect(bootstrappedCb.callCount).toBe(1);
  });
});
