# @menardi/redux-persist

```
npm install @menardi/redux-persist
```

A fork of [redux-persist](https://github.com/rt2zz/redux-persist) (forked from v6.0.0) which is focused on more reliable usage as a permanent store rather than a cache.

## Main differences to redux-persist

I use this fork for my mobile apps, so my main goal is to ensure it stores data reliably inside a mobile app like React Native or Capacitor.

- Throws errors instead of silently deleting data when something goes wrong
- State reconciliation defaults to level 2, which means that adding new keys inside a reducer with default values works as expected
- Support for Redux v5 and @reduxjs/toolkit

### Breaking changes from redux-persist v6

1. The `stateReconciler` config option has been removed, and replaced with `rehydrationDepth`
    - `stateReconciler: autoMergeLevel1` -> `rehydrationDepth: 1`
    - `stateReconciler: autoMergeLevel2` -> `rehydrationDepth: 2`
    - `stateReconciler: hardSet` -> removed
2. The `whitelist` and `blacklist` config options have been renamed, but the old names are still supported for backwards compatibility
    - `whitelist` -> `allowlist`
    - `blacklist` -> `blocklist`
3. `persistCombineReducers` has been removed
    - If you were using this, separately call `combineReducers` and `persistReducer` instead
4. The `redux-persist/lib/storage` export has been removed
    - This offered browser-specific storage. Instead, set `storage: localStorage` or `storage: sessionStorage` directly
5. The deprecated `keyPrefix` config option has been removed
6. The `createTransform` function now takes an object argument
    - `createTransform(in, out, { whitelist: ['myReducer'] })` -> `createTransform({ reducerName: 'myReducer', onBeforePersist: in, onBeforeRehydrate: out })`

## Basic Usage
Basic usage involves adding `persistReducer` and `persistStore` to your setup.

```ts
// configureStore.ts
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, ALL_PERSIST_ACTIONS } from '@menardi/redux-persist';

const rootReducer = combineReducers({
  // your reducers here
});

const persistedReducer = persistReducer({
  key: 'root',
  storage: MyStorage,
}, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => (
    getDefaultMiddleware({
      serializableCheck: {
        // This tells redux-toolkit to ignore its serializability check for redux-persist's internal actions
        ignoredActions: ALL_PERSIST_ACTIONS,
      },
    })
  ),
});

export const persistor = persistStore(store);
```

### Usage with React

If you are using React, wrap your root component with `PersistGate`. This delays the rendering of your app's UI until your persisted state has been retrieved and saved to redux. **NOTE** the `PersistGate` loading prop can be null, or any react instance, e.g. `loading={<Loading />}`

```ts
import { PersistGate } from '@menardi/redux-persist/integration/react'

// ... normal setup, create store and persistor, import components etc.

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <RootComponent />
      </PersistGate>
    </Provider>
  );
};
```

## Storage

Any storage which provides `getItem`, `setItem` and `removeItem` functions can be used for your persistor.

### React Native

If you're starting a new React Native project, `react-native-mmkv` is the recommended storage option due to its speed and synchronous reads.

#### react-native-mmkv

You can create your own wrapper around react-native-mmkv to match the format that redux-persist expects.

```ts
import { createMMKV } from 'react-native-mmkv';

const mmkvStorage = createMMKV();

const PersistCompatibleMmkv = {
  setItem: (key: string, value: string) => {
    mmkvStorage.set(key, value);
  },
  getItem: (key: string) => {
    return mmkvStorage.getString(key);
  },
  removeItem: (key: string) => {
    mmkvStorage.remove(key);
  },
};

const rootReducer = combineReducers({
  // your reducers here
});

const persistedReducer = persistReducer({
  key: 'root',
  storage: PersistCompatibleMmkv,
}, rootReducer);
```

#### @react-native-async-storage/async-storage

AsyncStorage already provides the exact functions needed, and so can be passed directly to `persistReducer` as is.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const rootReducer = combineReducers({
  // your reducers here
});

const persistedReducer = persistReducer({
  key: 'root',
  storage: AsyncStorage,
}, rootReducer);
```

### Capacitor

#### @capacitor/preferences

You can create your own wrapper around @capacitor/preferences to match the format that redux-persist expects.

```ts
import { Preferences } from '@capacitor/preferences'

const PersistCompatiblePreferences = {
  setItem: (key: string, value: string) => {
    return Preferences.set({ key, value });
  },
  getItem: async (key: string) => {
    const result = await Preferences.get({ key });
    return result.value;
  },
  removeItem: (key: string) => {
    return Preferences.remove({ key });
  },
};

const rootReducer = combineReducers({
  // your reducers here
});

const persistedReducer = persistReducer({
  key: 'root',
  storage: PersistCompatiblePreferences,
}, rootReducer);
```

### Browser

#### localStorage

> [!IMPORTANT]
> If you're using redux-persist in a hybrid mobile app (like Capacitor or Cordova), do not use localStorage.
> The iOS system treats localStorage like a cache that can be cleared, so data can be lost unexpectedly.
> For hybrid apps, use a native storage option, like `@capacitor/preferences` above.

localStorage already provides the exact functions needed, and so can be passed directly to `persistReducer` as is.

```ts
const rootReducer = combineReducers({
  // your reducers here
});

const persistedReducer = persistReducer({
  key: 'root',
  storage: localStorage,
}, rootReducer);
```

## Allowlist and Blocklist

To block specific reducers from being persisted, add them to the `blocklist` config array. If you want to only persist specific reducers, you can use the `allowlist` config option.

```js
// BLOCKLIST
const persistConfig = {
  key: 'root',
  storage: storage,
  blocklist: ['navigation'] // navigation will not be persisted
};

// ALLOWLIST
const persistConfig = {
  key: 'root',
  storage: storage,
  allowlist: ['navigation'] // only navigation will be persisted
};
```

## Migrations
`persistReducer` has a general purpose "migrate" config which will be called after getting stored state but before actually reconciling with the reducer. It can be any function which takes state as an argument and returns a promise to return a new state object.

Redux Persist ships with `createMigrate`, which helps create a synchronous migration for moving from any version of stored state to the current state version.

### Example with createMigrate
```ts
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { createMigrate, persistReducer, persistStore, ALL_PERSIST_ACTIONS } from '@menardi/redux-persist';

const rootReducer = combineReducers({
  // your reducers here
});

const migrations = {
  0: (state) => {
    // migration to delete "device"
    return {
      ...state,
      device: undefined
    }
  },
  1: (state) => {
    // migration to keep only "device"
    return {
      device: state.device
    }
  }
}

const persistedReducer = persistReducer({
  key: 'root',
  version: 1,
  storage: MyStorage,
  migrate: createMigrate(migrations),
}, rootReducer);

...
```

### Alternative
The migrate method can be any function with which returns a promise of new state.
```ts
const persistedReducer = persistReducer({
  key: 'root',
  version: 1,
  storage: MyStorage,
  migrate: (state) => {
    console.log('Migration Running!')
    return Promise.resolve(state)
  }
}, rootReducer);
```

## Transforms
Transforms allow you to customize the state object that gets persisted and rehydrated.

When the state object gets persisted, it first gets serialized with `JSON.stringify()`. If parts of your state object are not mappable to JSON objects, the serialization process may transform these parts of your state in unexpected ways. For example, the javascript [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) type does not exist in JSON. When you try to serialize a Set via `JSON.stringify()`, it gets converted to an empty object, which is almost definitely not what you want.

Below is a Transform that successfully persists a Set property, which simply converts it to an array and back. In this way, the Set gets converted to an Array, which is a recognized data structure in JSON. When pulled out of the persisted store, the array gets converted back to a Set before being saved to the redux store.

```ts
import { createTransform } from '@menardi/redux-persist';

const rootReducer = combineReducers({
  reducerWithSet: ...
});

type RootState = ReturnType<typeof rootReducer>;

const SetTransform = createTransform<RootState, 'reducerWithSet'>({
  reducerName: 'reducerWithSet',
  onBeforePersist: (state) => {
    // Note that `state` is the state of the specified reducer (`reducerWithSet`), not the `rootReducer`
    return { ...state, mySet: [...state.mySet] };
  },
  onBeforeRehydrate: (state) => {
    return { ...state, mySet: new Set(state.mySet) };
  },
});

const persistedReducer = persistReducer({
  key: 'root',
  storage: MyStorage,
  transforms: [SetTransform]
}, rootReducer);
```
