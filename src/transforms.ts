import type { PersistConfig } from './types';

export function runTransforms<State>({
  allTransforms,
  reducerName,
  direction,
  state: initialState,
}: {
  allTransforms: NonNullable<PersistConfig['transforms']>;
  reducerName: string;
  direction: 'beforeHydrate' | 'beforePersist';
  state: State;
}): State {
  const transformFnName = direction === 'beforeHydrate' ? 'onBeforeRehydrate' : 'onBeforePersist';
  const transforms = allTransforms.filter((transform) => transform.reducerName === reducerName);
  if (!transforms.length) return initialState;

  const reducerFn = (state: State, transform: typeof transforms[number]) => {
    const transformFn = transform[transformFnName];

    if (transformFn) {
      return transformFn(state);
    }

    return state;
  };

  if (direction === 'beforePersist') {
    return transforms.reduce(reducerFn, initialState);
  } else {
    return transforms.reduceRight(reducerFn, initialState);
  }
}

/** This helper function can be used to create type-safe transforms, and allows for explicit typing
 *  of the state which comes from storage if it is different to the hydrated state. */
export function createTransform<
  /** The root state of all combined reducers */
  RootState,
  /** The key of the reducer this transform is for. This needs to be specified explicitly because
   *  Typescript can't yet infer it. See https://github.com/microsoft/TypeScript/issues/26242 */
  K extends keyof RootState,
  /** Optional: The type of this reducer when it is in storage. If not specified, defaults to the
   *  same as the hydrated state. */
  StateFromStorageForKey = RootState[K]
>(transform: {
  reducerName: K;
  onBeforeRehydrate?: (state: StateFromStorageForKey) => RootState[K];
  onBeforePersist?: (state: RootState[K]) => StateFromStorageForKey;
}) {
  if (!transform.onBeforeRehydrate && !transform.onBeforePersist) {
    throw new Error(`redux-persist: No transform functions provided for ${String(transform.reducerName)}`);
  }

  return transform;
}
