import { PayloadAction, Reducer, combineReducers, configureStore, createSlice } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it } from 'vitest';

import persistReducer from '../src/persistReducer';
import { createInMemoryStorage } from './utils/inMemoryStorage';
import { ALL_PERSIST_ACTIONS } from '../src/constants';

// This file doesn't have any real tests, but checks that the Typescript types work as expected.
// The vitest structure just helps to organise it a bit.

describe('Typescript types', () => {
  let storage: ReturnType<typeof createInMemoryStorage>;

  beforeEach(() => {
    storage = createInMemoryStorage();
  });

  it('has no typescript errors', () => {
    type Item = { id: string };

    type PlainReducerState = { [key in string]: Item };

    type PlainReducerAction = {
      type: 'ADD_ITEM';
      payload: Item;
    } | {
      type: 'REMOVE_ITEM';
      payload: string;
    };

    const plainReducer: Reducer<PlainReducerState, PlainReducerAction> = (state = {}, action) => {
      const clonedState = { ...state };

      switch (action.type) {
        case 'ADD_ITEM':
          clonedState[action.payload.id] = action.payload;
          return clonedState;
        case 'REMOVE_ITEM':
          delete clonedState[action.payload];
          return clonedState;
        default:
          return state;
      }
    };

    type RtkState = { isSelected: boolean; date: Date };

    const initialState: RtkState = { isSelected: true, date: new Date() };

    const rtkSlice = createSlice({
      name: 'rtk',
      initialState,
      reducers: {
        setIsSelected: (state, action: PayloadAction<boolean>) => {
          state.isSelected = action.payload;
        },
      },
    });

    const rootReducer = combineReducers({
      plain: plainReducer,
      [rtkSlice.name]: rtkSlice.reducer,
    });

    const persistedReducer = persistReducer<ReturnType<typeof rootReducer>>({
      key: 'root',
      storage,
      transforms: [{
        reducerName: 'plain',
        onBeforePersist: (state) => {
          return state;
        },
      }],
    }, rootReducer);

    const store = configureStore({
      reducer: persistedReducer,
      middleware: (getDefaultMiddleware) => (
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ALL_PERSIST_ACTIONS,
          },
        })
      ),
    });

    const state = store.getState();

    expect(state.plain.test).toBe(undefined);
    expect(state.rtk.isSelected).toBe(true);
  });
});
