import { describe, it, expect } from 'vitest';

import autoMergeLevel1 from '../src/stateReconciler/autoMergeLevel1';
import autoMergeLevel2 from '../src/stateReconciler/autoMergeLevel2';
import type { PersistConfig } from '../src/types';

const config = {} as PersistConfig;

describe('state reconciliation', () => {
  describe('autoMergeLevel1', () => {
    it('should hard-set inbound substate and skip keys modified by the reducer', () => {
      const original = { a: { x: 1 }, b: { y: 2 }, c: { z: 3 } };
      const reduced = { ...original, b: { y: 99 } }; // b was modified by reducer
      const inbound = { a: { x: 10, extra: true }, b: { y: 20 }, c: { z: 30 } };

      const result = autoMergeLevel1(inbound, original, reduced, config);

      // a: not modified by reducer, so inbound replaces it entirely
      expect(result.a).toEqual({ x: 10, extra: true });
      // b: modified by reducer (original !== reduced), so inbound is skipped
      expect(result.b).toEqual({ y: 99 });
      // c: not modified, inbound replaces it
      expect(result.c).toEqual({ z: 30 });
    });
  });

  describe('autoMergeLevel2', () => {
    it('should shallow-merge inbound into plain object substate and skip keys modified by the reducer', () => {
      const original = { a: { x: 1, kept: true }, b: { y: 2 }, c: { z: 3 } };
      const reduced = { ...original, b: { y: 99 } };
      const inbound = { a: { x: 10, extra: true }, b: { y: 20 }, c: { z: 30 } };

      const result = autoMergeLevel2(inbound, original as any, reduced, config);

      // a: shallow merge — inbound keys override, but reduced-only keys (kept) are preserved
      expect(result.a).toEqual({ x: 10, kept: true, extra: true });
      // b: modified by reducer, skipped
      expect(result.b).toEqual({ y: 99 });
      // c: shallow merge
      expect(result.c).toEqual({ z: 30 });
    });
  });
});
