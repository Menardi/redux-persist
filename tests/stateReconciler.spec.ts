import { describe, it, expect } from 'vitest';

import autoMerge from '../src/stateReconciler/autoMerge';

const reconcile = (inbound: any, original: any, reduced: any, depth: number): any => autoMerge(inbound, original, reduced, depth);

class Foo {
  v = 1;
}

describe.each([1, 2, 3, Infinity])('autoMerge at depth %s (shared behaviour)', depth => {
  it('returns a new object without mutating its inputs', () => {
    const original = { a: 1, b: { x: 1 } };
    const reduced = { ...original };
    const inbound = { a: 2, b: { x: 2 } };

    const result = reconcile(inbound, original, reduced, depth);

    expect(result).not.toBe(reduced);
    expect(original).toEqual({ a: 1, b: { x: 1 } });
    expect(reduced).toEqual({ a: 1, b: { x: 1 } });
    expect(inbound).toEqual({ a: 2, b: { x: 2 } });
  });

  it('ignores inbound _persist', () => {
    const original = { a: 1 };
    const inbound = { a: 2, _persist: { version: 1, rehydrated: true } };

    const result = reconcile(inbound, original, { ...original }, depth);

    expect(result).toEqual({ a: 2 });
    expect(result).not.toHaveProperty('_persist');
  });

  it('skips keys modified by the reducer, compared by reference', () => {
    const original = { a: { x: 1 }, b: 1 };
    const reduced = { a: { x: 1 }, b: 1 };
    const inbound = { a: { x: 2 }, b: 2 };

    const result = reconcile(inbound, original, reduced, depth);

    expect(result.a).toBe(reduced.a);
    expect(result.b).toBe(2);
  });

  it('skips keys the reducer added while handling the rehydrate action', () => {
    expect(reconcile({ a: 2 }, {}, { a: 1 }, depth)).toEqual({ a: 1 });
  });

  it('keeps reduced keys that are missing from inbound', () => {
    const original = { a: 1, b: { x: 1 } };

    const result = reconcile({ a: 2 }, original, { ...original }, depth);

    expect(result).toEqual({ a: 2, b: { x: 1 } });
    expect(result.b).toBe(original.b);
  });

  it('hard-sets inbound keys that are not in reduced', () => {
    const inbound = { b: { x: 1 } };

    const result = reconcile(inbound, {}, {}, depth);

    expect(result).toEqual({ b: { x: 1 } });
    expect(result.b).toBe(inbound.b);
  });

  it('hard-sets primitive values', () => {
    const original = { a: 1, b: 'x', c: true, d: null as any };
    const inbound = { a: 2, b: 'y', c: false, d: 5 };

    expect(reconcile(inbound, original, { ...original }, depth)).toEqual(inbound);
  });

  it('hard-sets arrays', () => {
    const original = { a: [1, 2, 3] };
    const inbound = { a: [4] };

    expect(reconcile(inbound, original, { ...original }, depth).a).toBe(inbound.a);
  });

  it.each([
    ['a primitive', 1],
    ['an object', { x: 1 }],
  ])('keeps %s when the inbound value is undefined', (_label, value) => {
    const original = { a: value };

    expect(reconcile({ a: undefined }, original, { ...original }, depth).a).toBe(value);
  });

  it.each([undefined, null, 'str', 5, true, ['x']])('returns a copy of reduced when inbound is %s', inbound => {
    const original = { a: 1 };
    const reduced = { ...original };

    const result = reconcile(inbound, original, reduced, depth);

    expect(result).toEqual({ a: 1 });
    expect(result).not.toBe(reduced);
  });

  it.each([null, 'ab', 5, true, [7, 8]])('hard-sets %s over object substate', value => {
    const original = { a: { x: 1 } };

    expect(reconcile({ a: value }, original, { ...original }, depth).a).toBe(value);
  });

  it.each([
    ['an array', [1]],
    ['null', null],
    ['a primitive', 5],
    ['a Date', new Date(0)],
    ['a class instance', new Foo()],
  ])('hard-sets inbound object over %s', (_label, value) => {
    const original = { a: value };
    const inbound = { a: { x: 1 } };

    expect(reconcile(inbound, original, { ...original }, depth).a).toBe(inbound.a);
  });

  it('keeps a top-level __proto__ key as an own property', () => {
    const original = { a: 1 };
    const inbound = JSON.parse('{"__proto__":{"polluted":true}}');

    const result = reconcile(inbound, original, { ...original }, depth);

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
    expect(result.polluted).toBeUndefined();
  });
});

describe('autoMerge at depth 1', () => {
  it('replaces object substate entirely', () => {
    const original = { a: { x: 1, kept: true } };
    const inbound = { a: { x: 10, extra: true } };

    expect(reconcile(inbound, original, { ...original }, 1).a).toBe(inbound.a);
  });
});

describe('autoMerge at depth 2', () => {
  it('shallow-merges inbound into object substate', () => {
    const original = { a: { x: 1, kept: true } };
    const inbound = { a: { x: 10, extra: true } };

    const result = reconcile(inbound, original, { ...original }, 2);

    expect(result.a).toEqual({ x: 10, kept: true, extra: true });
    expect(result.a).not.toBe(original.a);
    expect(result.a).not.toBe(inbound.a);
  });

  it('replaces values below the second level', () => {
    const original = { a: { n: { x: 1, y: 2 }, m: 1 } };
    const inbound = { a: { n: { x: 5 } } };

    const result = reconcile(inbound, original, { ...original }, 2);

    expect(result.a).toEqual({ n: { x: 5 }, m: 1 });
    expect(result.a.n).toBe(inbound.a.n);
  });

  it('keeps nested values when the inbound value is undefined', () => {
    const original = { a: { x: 1, y: 2 } };

    expect(reconcile({ a: { x: undefined, y: 3 } }, original, { ...original }, 2).a).toEqual({ x: 1, y: 3 });
  });

  it('merges into objects with a null prototype', () => {
    const nullProto = Object.assign(Object.create(null), { x: 1 });
    const original = { a: nullProto };

    expect(reconcile({ a: { y: 2 } }, original, { ...original }, 2).a).toEqual({ x: 1, y: 2 });
  });

  it('keeps a nested __proto__ key as an own property', () => {
    const original = { a: { x: 1 } };
    const inbound = JSON.parse('{"a":{"__proto__":{"polluted":true}}}');

    const result = reconcile(inbound, original, { ...original }, 2);

    expect(Object.getPrototypeOf(result.a)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(result.a, '__proto__')).toBe(true);
    expect(result.a.polluted).toBeUndefined();
    expect(result.a.x).toBe(1);
  });
});

describe('autoMerge at depth 3+', () => {
  it('merges three levels deep at depth 3', () => {
    const original = { a: { n: { x: 1, y: 2, deep: { p: 1, q: 2 } }, m: 1 } };
    const inbound = { a: { n: { x: 5, deep: { p: 9 } } } };

    const result = reconcile(inbound, original, { ...original }, 3);

    expect(result).toEqual({ a: { n: { x: 5, y: 2, deep: { p: 9 } }, m: 1 } });
    expect(result.a.n.deep).toBe(inbound.a.n.deep);
  });

  it('merges four levels deep at depth 4', () => {
    const original = { a: { n: { deep: { p: 1, q: 2, deeper: { r: 1, s: 2 } } } } };
    const inbound = { a: { n: { deep: { p: 9, deeper: { r: 9 } } } } };

    expect(reconcile(inbound, original, { ...original }, 4)).toEqual({ a: { n: { deep: { p: 9, q: 2, deeper: { r: 9 } } } } });
  });

  it('merges all levels at depth Infinity', () => {
    const original = { a: { b: { c: { d: { e: { x: 1, y: 2 } } } } } };
    const inbound = { a: { b: { c: { d: { e: { x: 5 } } } } } };

    expect(reconcile(inbound, original, { ...original }, Infinity)).toEqual({ a: { b: { c: { d: { e: { x: 5, y: 2 } } } } } });
  });

  it('hard-sets arrays at any depth', () => {
    const original = { a: { n: { list: [1, 2, 3] } } };
    const inbound = { a: { n: { list: [4] } } };

    expect(reconcile(inbound, original, { ...original }, Infinity).a.n.list).toBe(inbound.a.n.list);
  });

  it('hard-sets mismatched types at nested levels', () => {
    const date = new Date(0);
    const original = { a: { n: { x: 1 }, m: { y: 1 }, o: { z: 1 }, d: date } };
    const inbound = { a: { n: null, m: 'ab', o: [7], d: { iso: '1970' } } };

    const result = reconcile(inbound, original, { ...original }, Infinity);

    expect(result.a).toEqual({ n: null, m: 'ab', o: [7], d: { iso: '1970' } });
  });

  it('keeps deeply nested values when the inbound value is undefined', () => {
    const original = { a: { n: { x: 1, y: 2 } } };

    expect(reconcile({ a: { n: { x: undefined, y: 3 } } }, original, { ...original }, 3).a.n).toEqual({ x: 1, y: 3 });
  });

  it('keeps nested __proto__ keys as own properties when recursing', () => {
    const original = { a: { n: { x: 1 } } };
    const inbound = JSON.parse('{"a":{"n":{"__proto__":{"polluted":true}}}}');

    const result = reconcile(inbound, original, { ...original }, Infinity);

    expect(Object.getPrototypeOf(result.a.n)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(result.a.n, '__proto__')).toBe(true);
    expect(result.a.n.polluted).toBeUndefined();
    expect(result.a.n.x).toBe(1);
  });
});
