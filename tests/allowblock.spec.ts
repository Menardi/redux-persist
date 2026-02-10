import { spy, useFakeTimers } from 'sinon';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import createPersistoid from '../src/createPersistoid';
import { createInMemoryStorage } from './utils/inMemoryStorage';

const memoryStorage = createInMemoryStorage();

const config = {
  key: 'allowblock-test',
  version: 1,
  storage: memoryStorage,
  debug: true,
};

describe('allowlist / blocklist', () => {
  let setItemSpy: sinon.SinonSpy;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    setItemSpy = spy(memoryStorage, 'setItem');
    clock = useFakeTimers();
  });

  afterEach(() => {
    setItemSpy.restore();
    clock.restore();
  });

  it('persists all keys if neither allowlist or blocklist is specified', () => {
    const { update } = createPersistoid(config);
    update({ a: 1, b: 2, c: 3 });
    clock.tick(1);
    expect(setItemSpy.callCount).toBe(1);
    expect(setItemSpy.getCall(0).args).toEqual([
      'persist:allowblock-test',
      '{"a":"1","b":"2","c":"3"}',
    ]);
  });

  it('persists only allowed keys if allowlist is specified', () => {
    const { update } = createPersistoid({
      ...config,
      allowlist: ['a', 'c'],
    });
    update({ a: 1, b: 2, c: 3 });
    clock.tick(1);
    expect(setItemSpy.callCount).toBe(1);
    expect(setItemSpy.getCall(0).args).toEqual([
      'persist:allowblock-test',
      '{"a":"1","c":"3"}',
    ]);
  });

  it('does not persist keys on blocklist (if no allowlist is specified)', () => {
    const { update } = createPersistoid({
      ...config,
      blocklist: ['a', 'c'],
    });
    update({ a: 1, b: 2, c: 3 });
    clock.tick(1);
    expect(setItemSpy.callCount).toBe(1);
    expect(setItemSpy.getCall(0).args).toEqual([
      'persist:allowblock-test',
      '{"b":"2"}',
    ]);
  });
});
