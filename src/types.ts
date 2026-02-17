import { REHYDRATE, REGISTER } from './constants';

export interface PersistState {
  version: number
  rehydrated: boolean
}

export type PersistedState = {
  _persist: PersistState
} | undefined;

export type PersistMigrate = (
  state: PersistedState,
  currentVersion: number
) => Promise<PersistedState>;

export type StateReconciler<S> = (
  inboundState: any,
  state: S,
  reducedState: S,
  config: PersistConfig
) => S;

export interface PersistConfig {
  version?: number
  storage: Storage
  key: string
  allowlist?: string[]
  blocklist?: string[]
  /** @deprecated Use `allowlist` instead */
  whitelist?: string[]
  /** @deprecated Use `blocklist` instead */
  blacklist?: string[]
  /** Transform data per reducer before it is persisted, and before it is hydrated. Use the
   *  `createTransform` function to create type-safe transforms rather than passing them directly. */
  transforms?: {
    reducerName: string;
    onBeforeRehydrate?: (state: any) => any;
    onBeforePersist?: (state: any) => any;
  }[]
  throttle?: number
  migrate?: PersistMigrate
  /** How deeply should rehydration merge into the existing state?
   *
   *  1 - Overwrite existing reducers at the top level. If you later add new keys inside a reducer
   *      with default values, they will be removed if they are not in the rehydrated state.
   *
   *  2 - (Default) Merge each incoming reducer into the initialised reducer. If you later add new
   *      keys in side a reducer with default values, they will be merged into the rehydrated state.
   */
  rehydrationDepth?: 1 | 2
  debug?: boolean
  serialize?: boolean | ((state: any) => string)
  deserialize?: boolean | ((serialized: string) => any)
  timeout?: number
  writeFailHandler?: (err: Error) => void
  onError?: (err: Error) => void
}

export interface PersistorOptions {
  enhancer?: (createStore: any) => any
  manualPersist?: boolean
}

export interface Storage {
  getItem(key: string, ...args: Array<any>): any
  setItem(key: string, value: any, ...args: Array<any>): any
  removeItem(key: string, ...args: Array<any>): any
}

export interface WebStorage extends Storage {
  /**
   * @desc Fetches key and returns item in a promise.
   */
  getItem(key: string): Promise<string | null>
  /**
   * @desc Sets value for key and returns item in a promise.
   */
  setItem(key: string, item: string): Promise<void>
  /**
   * @desc Removes value for key.
   */
  removeItem(key: string): Promise<void>
}

export interface MigrationManifest {
  [key: string]: (state: PersistedState) => PersistedState
}

export type RehydrateErrorType = any;

export interface RehydrateAction {
  type: typeof REHYDRATE
  key: string
  payload?: object | null
  err?: RehydrateErrorType | null
}

export interface Persistoid {
  update(state: object): void
  flush(): Promise<any>
}

export interface RegisterAction {
  type: typeof REGISTER
  key: string
}

export type PersistorAction = RehydrateAction | RegisterAction;

export interface PersistorState {
  registry: Array<string>
  bootstrapped: boolean
}

export type PersistorSubscribeCallback = () => any;

/**
 * A persistor is a redux store unto itself, allowing you to purge stored state, flush all
 * pending state serialization and immediately write to disk
 */
export interface Persistor {
  pause(): void
  persist(): void
  purge(): Promise<any>
  flush(): Promise<any>
  readonly dispatch: (action: PersistorAction) => PersistorAction
  readonly getState: () => PersistorState
  readonly subscribe: (callback: PersistorSubscribeCallback) => () => any
}
