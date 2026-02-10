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
  config: PersistConfig<S>
) => S;

/**
 * @desc
 * `HSS` means HydratedSubState
 * `ESS` means EndSubState
 * `S` means State
 * `RS` means RawState
 */
export interface PersistConfig<S = any, RS = any, HSS = any, ESS = any> {
  version?: number
  storage: Storage
  key: string
  allowlist?: Array<string>
  blocklist?: Array<string>
  /** @deprecated Use `allowlist` instead */
  whitelist?: Array<string>
  /** @deprecated Use `blocklist` instead */
  blacklist?: Array<string>
  transforms?: Array<Transform<HSS, ESS, S, RS>>
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
  /** Used for migrations */
  getStoredState?: (config: PersistConfig<S, RS, HSS, ESS>) => Promise<PersistedState>
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

/**
 * @desc
 * `SS` means SubState
 * `ESS` means EndSubState
 * `S` means State
 */
export type TransformInbound<SS, ESS, S = any> = (
  subState: SS,
  key: keyof S,
  state: S
) => ESS;

/**
 * @desc
 * `SS` means SubState
 * `HSS` means HydratedSubState
 * `RS` means RawState
 */
export type TransformOutbound<SS, HSS, RS = any> = (
  state: SS,
  key: keyof RS,
  rawState: RS
) => HSS;

export interface Transform<HSS = any, ESS = any, S = any, RS = any> {
  in: TransformInbound<HSS, ESS, S>
  out: TransformOutbound<ESS, HSS, RS>
  config?: PersistConfig<S, RS, HSS, ESS>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TransformConfig<HSS, ESS, S = any, RS = any> {
  allowlist?: Array<keyof S>
  blocklist?: Array<keyof S>
  /** @deprecated Use `allowlist` instead */
  whitelist?: Array<keyof S>
  /** @deprecated Use `blocklist` instead */
  blacklist?: Array<keyof S>
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
