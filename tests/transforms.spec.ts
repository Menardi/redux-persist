import { describe, expect, it, vi } from 'vitest';

import { runTransforms } from '../src/transforms';

type TestState = {
  counter: number;
  user: { name: string };
};

describe('runTransform', () => {
  it('throws an error if the transform function throws an error', () => {
    const transforms = [
      {
        reducerName: 'counter' as const,
        onBeforePersist: () => {
          throw new Error('transform failed');
        },
      },
    ];

    expect(() =>
      runTransforms<TestState, 'counter'>({
        allTransforms: transforms,
        reducerName: 'counter',
        direction: 'beforePersist',
        state: 1,
      }),
    ).toThrow('transform failed');
  });

  it('only runs transforms for the given key', () => {
    const userSpy = vi.fn();
    const transforms = [
      {
        reducerName: 'counter' as const,
        onBeforePersist: (state: number) => state + 10,
      },
      {
        reducerName: 'user' as const,
        onBeforePersist: userSpy,
      },
    ];

    const result = runTransforms<TestState, 'counter'>({
      allTransforms: transforms,
      reducerName: 'counter',
      direction: 'beforePersist',
      state: 1,
    });

    expect(result).toBe(11);
    expect(userSpy).not.toHaveBeenCalled();
  });

  it('applies transforms from left to right when persisting', () => {
    const transforms = [
      {
        reducerName: 'counter' as const,
        onBeforePersist: (state: number) => state * 2,
      },
      {
        reducerName: 'counter' as const,
        onBeforePersist: (state: number) => state + 3,
      },
    ];

    // Left to right: 5 * 2 = 10, then 10 + 3 = 13
    const result = runTransforms<TestState, 'counter'>({
      allTransforms: transforms,
      reducerName: 'counter',
      direction: 'beforePersist',
      state: 5,
    });

    expect(result).toBe(13);
  });

  it('applies transforms from right to left when hydrating', () => {
    const transforms = [
      {
        reducerName: 'counter' as const,
        onBeforeRehydrate: (state: number) => state * 2,
      },
      {
        reducerName: 'counter' as const,
        onBeforeRehydrate: (state: number) => state + 3,
      },
    ];

    // Right to left: 5 + 3 = 8, then 8 * 2 = 16
    const result = runTransforms<TestState, 'counter'>({
      allTransforms: transforms,
      reducerName: 'counter',
      direction: 'beforeHydrate',
      state: 5,
    });

    expect(result).toBe(16);
  });
});
