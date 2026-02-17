import type { REHYDRATE, REGISTER } from './constants';

export interface PersistState {
  version: number;
  rehydrated: boolean;
}

export type PersistedState = {
  _persist: PersistState;
} | undefined;

export type PersistMigrate = (
  state: PersistedState,
  currentVersion: number
) => Promise<PersistedState>;

export interface PersistConfig {
  /** The storage provider which will be used to persist and rehydrate your data.
   *
   *  It must provide `getItem`, `setItem` and `removeItem` functions. See the README for specific
   *  use cases such as React Native, Capacitor and web. */
  storage: Storage;
  /** The key which will be used to persist your data i.e. the value which will be passed to
   *  the provided storage's `setItem`. It will be prefixed with "persist:" to avoid accidental
   *  collisions with other existing data. */
  key: string;
  /** Names of reducers to persist. If this array is included, only reducers explicitly named here
   *  will be persisted. All other reducers will be ignored. */
  allowlist?: string[];
  /** Names of reducers to exclude from persistence. If set, all reducers will be persisted except
   *  for those included in this array. */
  blocklist?: string[];
  /** @deprecated Use `allowlist` instead */
  whitelist?: string[];
  /** @deprecated Use `blocklist` instead */
  blacklist?: string[];
  /** Transform data per reducer before it is persisted, and before it is hydrated. Use the
   *  `createTransform` function to create type-safe transforms rather than passing them directly. */
  transforms?: {
    reducerName: string;
    onBeforeRehydrate?: (state: any) => any;
    onBeforePersist?: (state: any) => any;
  }[];
  /** The minimum time in milliseconds between processing each reducer to be persisted.
   *  The default is 0, but this does not mean that all reducers get processed at once. This value
   *  is passed to `setInterval`, meaning that even when it is 0, there is a slight delay between
   *  each reducer being processed. Data is only written to storage once all reducers have been
   *  processed.
   *
   *  If you need to write everything immediately, call `persistor.flush()`.
   *
   *  @default 0
   */
  throttle?: number;
  /** Version is used to determine whether migrations need to be run. If the version provided here
   *  is higher than the version of the previously persisted storage, all migrations between the
   *  stored data version and this version will be run.
   *
   *  @default -1
   */
  version?: number;
  /** Migration configuration to handle changes in data structure. Use the `createMigrate` function
   *  to create this configuration option.
   *
   *  For example, say you change how dates are stored in your application. Existing persisted data
   *  will still be in the old format, so you need to change it. To do this, first you increase the
   *  version — -1 is the default, so set it to 0.
   *
   *  Then create a `handleDateFormatMigration` function, which takes the whole persisted state
   *  object (which still has your old date format), and returns a new state object which has
   *  converted it to the new date format.
   *
   *  Pass `handleDateFormatMigration` as key `0` to `createMigration`. This function will be run once,
   *  the first time your application runs after the version has increased.
   *
   *  @example
   *  migrate: createMigration({
   *   0: handleDateFormatMigration,
   *  })
   */
  migrate?: PersistMigrate;
  /** How deeply should rehydration merge into the existing state?
   *
   *  1 - Overwrite existing reducers at the top level. If you later add new keys inside a reducer
   *      with default values, they will be removed if they are not in the rehydrated state.
   *
   *  2 - (Default) Merge each incoming reducer into the initialised reducer. If you later add new
   *      keys in side a reducer with default values, they will be merged into the rehydrated state.
   */
  rehydrationDepth?: 1 | 2;
  /** A custom serialization function. Or set to `false` to disable per-reducer serialization (the
   *  whole state will still be passed to `JSON.stringify` before being persisted) */
  serialize?: boolean | ((state: any) => string);
  /** A custom deserialization function. Or set to `false` to disable per-reducer deserialization. */
  deserialize?: boolean | ((serialized: string) => any);
  /** How long to wait (in milliseconds) for initial rehydration to complete. If timeout is reached,
   *  an error will be thrown. Set to 0 to disable the timeout and wait forever.
   *
   *  @default 5000
   */
  timeout?: number;
  /** A callback function which is called whenever a call to the storage's `setItem` fails */
  writeFailHandler?: (err: Error) => void;
  /** A callback function which is called if redux-persist fails to start correctly, such as a
   *  failure in rehydration. */
  onError?: (err: Error) => void;
}

export interface PersistorOptions {
  enhancer?: (createStore: any) => any;
  manualPersist?: boolean;
}

export interface Storage {
  getItem(key: string, ...args: Array<any>): any;
  setItem(key: string, value: any, ...args: Array<any>): any;
  removeItem(key: string, ...args: Array<any>): any;
}

export interface MigrationManifest {
  [key: string]: (state: PersistedState) => PersistedState;
}

type RehydrateErrorType = any;

export interface RehydrateAction {
  type: typeof REHYDRATE;
  key: string;
  payload?: object | null;
  err?: RehydrateErrorType | null;
}

export interface Persistoid {
  update(state: object): void;
  flush(): Promise<any>;
}

interface RegisterAction {
  type: typeof REGISTER;
  key: string;
}

export type PersistorAction = RehydrateAction | RegisterAction;

export interface PersistorState {
  registry: Array<string>;
  bootstrapped: boolean;
}

type PersistorSubscribeCallback = () => any;

/**
 * A persistor is a redux store unto itself, allowing you to purge stored state, flush all
 * pending state serialization and immediately write to disk
 */
export interface Persistor {
  pause(): void;
  persist(): void;
  purge(): Promise<any>;
  flush(): Promise<any>;
  readonly dispatch: (action: PersistorAction) => PersistorAction;
  readonly getState: () => PersistorState;
  readonly subscribe: (callback: PersistorSubscribeCallback) => () => any;
}
