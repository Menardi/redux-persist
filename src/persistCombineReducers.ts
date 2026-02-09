import { combineReducers, Reducer, ReducersMapObject } from 'redux'
import persistReducer from './persistReducer'
import autoMergeLevel2 from './stateReconciler/autoMergeLevel2'

import { PersistConfig, PersistState } from './types'

type PersistPartial = { _persist: PersistState }

// combineReducers + persistReducer with stateReconciler defaulted to autoMergeLevel2
export default function persistCombineReducers<S>(
  config: PersistConfig<S>,
  reducers: ReducersMapObject<S, any>
): Reducer<S & PersistPartial, any> {
  config.stateReconciler =
    config.stateReconciler === undefined
      ? autoMergeLevel2
      : config.stateReconciler
  return persistReducer(config, combineReducers(reducers) as Reducer<S, any>)
}
