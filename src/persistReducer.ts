import type { Reducer } from 'redux';

import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REHYDRATE,
  DEFAULT_VERSION,
} from './constants';
import createPersistoid from './createPersistoid';
import defaultGetStoredState from './getStoredState';
import purgeStoredState from './purgeStoredState';
import autoMergeLevel1 from './stateReconciler/autoMergeLevel1';
import autoMergeLevel2 from './stateReconciler/autoMergeLevel2';
import {
  PersistConfig,
  PersistState,
  Persistoid,
} from './types';

type PersistPartial = { _persist: PersistState };

// Internal action types with callbacks
interface PersistAction {
  type: typeof PERSIST
  register: (key: string) => void
  rehydrate: (key: string, payload: any, err?: any) => void
  [key: string]: any
}

interface PurgeAction {
  type: typeof PURGE
  result: (result: Promise<any>) => void
  [key: string]: any
}

interface FlushAction {
  type: typeof FLUSH
  result: (result: Promise<any> | null) => void
  [key: string]: any
}

interface PauseAction {
  type: typeof PAUSE
  [key: string]: any
}

interface RehydrateInternalAction {
  type: typeof REHYDRATE
  key: string
  payload?: any
  err?: any
  [key: string]: any
}

type InternalAction = PersistAction | PurgeAction | FlushAction | PauseAction | RehydrateInternalAction;

const INTERNAL_ACTION_TYPES: ReadonlySet<string> = new Set([PERSIST, PURGE, FLUSH, PAUSE, REHYDRATE]);

function isInternalAction(action: any): action is InternalAction {
  return action && typeof action.type === 'string' && INTERNAL_ACTION_TYPES.has(action.type);
}

const DEFAULT_TIMEOUT = 5000;
/*
  @TODO add validation / handling for:
  - persisting a reducer which has nested _persist
  - handling actions that fire before reydrate is called
*/
export default function persistReducer<State, PreloadedState = State>(
  config: PersistConfig<State>,
  baseReducer: Reducer<State, any, PreloadedState>,
): Reducer<State & PersistPartial, any> {
  if (process.env.NODE_ENV !== 'production') {
    if (!config) throw new Error('config is required for persistReducer');
    if (!config.key) throw new Error('key is required in persistor config');
    if (!config.storage)
      throw new Error(
        "redux-persist: config.storage is required. Try using one of the provided storage engines `import storage from 'redux-persist/lib/storage'`",
      );
  }

  const version = config.version !== undefined ? config.version : DEFAULT_VERSION;

  const rehydrationDepth = config.rehydrationDepth || 2;
  const stateReconciler = rehydrationDepth === 1 ? autoMergeLevel1 : autoMergeLevel2;

  const getStoredState = config.getStoredState || defaultGetStoredState;
  const timeout =
    config.timeout !== undefined ? config.timeout : DEFAULT_TIMEOUT;
  let _persistoid: Persistoid | null = null;
  let _purge = false;
  let _paused = true;
  const conditionalUpdate = (state: State & PersistPartial): State & PersistPartial => {
    // update the persistoid only if we are rehydrated and not paused
    state._persist.rehydrated &&
      _persistoid &&
      !_paused &&
      _persistoid.update(state);
    return state;
  };

  return (state: State | undefined, action: any): State & PersistPartial => {
    const { _persist, ...rest } = (state || {}) as any;
    const restState: State = rest as State;

    if (isInternalAction(action)) {
      switch (action.type) {
        case PERSIST: {
          let _sealed = false;
          const _rehydrate = (payload: any, err?: any): void => {
            // dev warning if we are already sealed
            if (process.env.NODE_ENV !== 'production' && _sealed)
              console.error(
                `redux-persist: rehydrate for "${
                  config.key
                }" called after timeout.`,
                payload,
                err,
              );

            // only rehydrate if we are not already sealed
            if (err) {
              console.error('redux-persist: Not rehydrating due to', err);
              _paused = true; // stop any further redux-persist processing
              setTimeout(() => config.onError?.(err)); // wrapped in setTimeout to ensure it breaks out of the promise
            } else if (!_sealed) {
              action.rehydrate(config.key, payload, err);
              _sealed = true;
            }
          };
          timeout &&
            setTimeout(() => {
              !_sealed &&
                _rehydrate(
                  undefined,
                  new Error(
                    `redux-persist: persist timed out for persist key "${
                      config.key
                    }"`,
                  ),
                );
            }, timeout);

          /** PERSIST resumes if paused. */
          _paused = false;

          /** only ever create persistoid once, ensure we call it at least once, even if _persist has already been set */
          if (!_persistoid) _persistoid = createPersistoid(config);

          /** PERSIST can be called multiple times, noop after the first */
          if (_persist) {
            // We still need to call the base reducer because there might be nested
            // uses of persistReducer which need to be aware of the PERSIST action
            return {
              ...baseReducer(restState, action),
              _persist,
            };
          }

          if (
            typeof action.rehydrate !== 'function' ||
            typeof action.register !== 'function'
          )
            throw new Error(
              'redux-persist: either rehydrate or register is not a function on the PERSIST action. This can happen if the action is being replayed. This is an unexplored use case, please open an issue and we will figure out a resolution.',
            );

          action.register(config.key);

          getStoredState(config).then(
            restoredState => {
              const migrate = config.migrate || ((s: any) => Promise.resolve(s));
              migrate(restoredState as any, version).then(
                migratedState => {
                  _rehydrate(migratedState);
                },
                migrateErr => {
                  if (process.env.NODE_ENV !== 'production' && migrateErr)
                    console.error('redux-persist: migration error', migrateErr);
                  _rehydrate(undefined, migrateErr);
                },
              );
            },
            err => {
              _rehydrate(undefined, err);
            },
          );

          return {
            ...baseReducer(restState, action),
            _persist: { version, rehydrated: false },
          };
        }
        case PURGE: {
          _purge = true;
          action.result(purgeStoredState(config));
          return {
            ...baseReducer(restState, action),
            _persist,
          };
        }
        case FLUSH: {
          action.result(_persistoid && _persistoid.flush());
          return {
            ...baseReducer(restState, action),
            _persist,
          };
        }
        case PAUSE: {
          _paused = true;
          break;
        }
        case REHYDRATE: {
          // noop on restState if purging
          if (_purge)
            return {
              ...restState,
              _persist: { ..._persist, rehydrated: true },
            } as State & PersistPartial;

          /** if key does not match, will continue to default below */
          if (action.key === config.key) {
            const reducedState = baseReducer(restState, action);
            const inboundState = action.payload;
            // only reconcile state if inboundState is defined
            const reconciledRest: State =
              inboundState !== undefined
                ? stateReconciler(inboundState, state as any, reducedState, config)
                : reducedState;

            const newState = {
              ...reconciledRest,
              _persist: { ..._persist, rehydrated: true },
            };
            return conditionalUpdate(newState);
          }
          break;
        }
      }
    }

    // if we have not already handled PERSIST, straight passthrough
    if (!_persist) return baseReducer(state, action) as State & PersistPartial;

    // run base reducer:
    // is state modified ? return original : return updated
    const newState = baseReducer(restState, action);
    if (newState === restState) return state as State & PersistPartial;
    return conditionalUpdate({ ...newState, _persist });
  };
}

