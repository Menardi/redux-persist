import {
  Persistor,
  PersistConfig,
  PersistorOptions,
  PersistorState,
  MigrationManifest,
  RehydrateAction,
  RehydrateErrorType,
  PersistorAction,
} from './types'

import { Store, createStore, AnyAction } from 'redux'
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from './constants'

type BoostrappedCb = () => any

const initialState: PersistorState = {
  registry: [],
  bootstrapped: false,
}

const persistorReducer = (
  state: PersistorState = initialState,
  action: PersistorAction
): PersistorState => {
  switch (action.type) {
    case REGISTER:
      return { ...state, registry: [...state.registry, action.key] }
    case REHYDRATE:
      let firstIndex = state.registry.indexOf(action.key)
      let registry = [...state.registry]
      registry.splice(firstIndex, 1)
      return { ...state, registry, bootstrapped: registry.length === 0 }
    default:
      return state
  }
}

export default function persistStore(
  store: Store<any, AnyAction>,
  options?: PersistorOptions | null,
  cb?: BoostrappedCb
): Persistor {
  // help catch incorrect usage of passing PersistConfig in as PersistorOptions
  if (process.env.NODE_ENV !== 'production') {
    let optionsToTest: Record<string, any> = options || {}
    let bannedKeys = [
      'blacklist',
      'whitelist',
      'transforms',
      'storage',
      'keyPrefix',
      'migrate',
    ]
    bannedKeys.forEach(k => {
      if (!!optionsToTest[k])
        console.error(
          `redux-persist: invalid option passed to persistStore: "${k}". You may be incorrectly passing persistConfig into persistStore, whereas it should be passed into persistReducer.`
        )
    })
  }
  let boostrappedCb: BoostrappedCb | false = cb || false

  let _pStore = createStore(
    persistorReducer,
    initialState,
    options && options.enhancer ? options.enhancer : undefined
  )
  let register = (key: string): void => {
    _pStore.dispatch({
      type: REGISTER,
      key,
    })
  }

  let rehydrate = (key: string, payload: object | null, err: any): void => {
    let rehydrateAction: RehydrateAction = {
      type: REHYDRATE,
      payload,
      err,
      key,
    }
    // dispatch to `store` to rehydrate and `persistor` to track result
    store.dispatch(rehydrateAction as any)
    _pStore.dispatch(rehydrateAction)
    if (boostrappedCb && persistor.getState().bootstrapped) {
      boostrappedCb()
      boostrappedCb = false
    }
  }

  let persistor: Persistor = {
    ..._pStore,
    purge: (): Promise<any> => {
      let results: Array<Promise<any>> = []
      store.dispatch({
        type: PURGE,
        result: (purgeResult: Promise<any>) => {
          results.push(purgeResult)
        },
      } as any)
      return Promise.all(results)
    },
    flush: (): Promise<any> => {
      let results: Array<Promise<any>> = []
      store.dispatch({
        type: FLUSH,
        result: (flushResult: Promise<any>) => {
          results.push(flushResult)
        },
      } as any)
      return Promise.all(results)
    },
    pause: (): void => {
      store.dispatch({
        type: PAUSE,
      } as any)
    },
    persist: (): void => {
      store.dispatch({ type: PERSIST, register, rehydrate } as any)
    },
  }

  if (!(options && options.manualPersist)) {
    persistor.persist()
  }

  return persistor
}
