import { Store, createStore, AnyAction } from 'redux';

import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from './constants';
import type { Persistor, PersistorOptions, PersistorState, RehydrateAction, PersistorAction } from './types';

type BoostrappedCb = () => any;

const initialState: PersistorState = {
  registry: [],
  bootstrapped: false,
};

const persistorReducer = (
  state: PersistorState = initialState,
  action: PersistorAction,
): PersistorState => {
  switch (action.type) {
    case REGISTER:
      return { ...state, registry: [...state.registry, action.key] };
    case REHYDRATE:
      const firstIndex = state.registry.indexOf(action.key);
      const registry = [...state.registry];
      registry.splice(firstIndex, 1);
      return { ...state, registry, bootstrapped: registry.length === 0 };
    default:
      return state;
  }
};

export default function persistStore(
  store: Store<any, AnyAction>,
  options?: PersistorOptions | null,
  cb?: BoostrappedCb,
): Persistor {
  // help catch incorrect usage of passing PersistConfig in as PersistorOptions
  if (process.env.NODE_ENV !== 'production') {
    const optionsToTest: Record<string, any> = options || {};
    const bannedKeys = [
      'blacklist',
      'whitelist',
      'blocklist',
      'allowlist',
      'transforms',
      'storage',
      'keyPrefix',
      'migrate',
    ];
    bannedKeys.forEach(k => {
      if (!!optionsToTest[k]) {
        console.error(
          `redux-persist: invalid option passed to persistStore: "${k}". You may be incorrectly passing persistConfig into persistStore, whereas it should be passed into persistReducer.`,
        );
      }
    });
  }

  let boostrappedCb: BoostrappedCb | false = cb || false;

  const _pStore = createStore(
    persistorReducer,
    initialState,
    options && options.enhancer ? options.enhancer : undefined,
  );
  const register = (key: string): void => {
    _pStore.dispatch({
      type: REGISTER,
      key,
    });
  };

  const rehydrate = (key: string, payload: object | null, err: any): void => {
    const rehydrateAction: RehydrateAction = {
      type: REHYDRATE,
      payload,
      err,
      key,
    };
    // dispatch to `store` to rehydrate and `persistor` to track result
    store.dispatch(rehydrateAction as any);
    _pStore.dispatch(rehydrateAction);
    if (boostrappedCb && persistor.getState().bootstrapped) {
      boostrappedCb();
      boostrappedCb = false;
    }
  };

  const persistor: Persistor = {
    ..._pStore,
    purge: (): Promise<any> => {
      const results: Array<Promise<any>> = [];
      store.dispatch({
        type: PURGE,
        result: (purgeResult: Promise<any>) => {
          results.push(purgeResult);
        },
      } as any);
      return Promise.all(results);
    },
    flush: (): Promise<any> => {
      const results: Array<Promise<any>> = [];
      store.dispatch({
        type: FLUSH,
        result: (flushResult: Promise<any>) => {
          results.push(flushResult);
        },
      } as any);
      return Promise.all(results);
    },
    pause: (): void => {
      store.dispatch({
        type: PAUSE,
      } as any);
    },
    persist: (): void => {
      store.dispatch({ type: PERSIST, register, rehydrate } as any);
    },
  };

  if (!(options && options.manualPersist)) {
    persistor.persist();
  }

  return persistor;
}
