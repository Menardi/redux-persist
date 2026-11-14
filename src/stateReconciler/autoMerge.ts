import { logger } from '../utils';

/** Merges inbound state into reduced state up to `depth` levels deep.
 * - Where both values are plain objects they are merged, otherwise the inbound value wins
 * - `undefined` inbound values are treated as missing, keeping the reduced value
 * - Skips top-level keys modified by the reducer while handling the rehydrate action */
export default function autoMerge<State extends Record<string, any>>(
  inboundState: State,
  originalState: State,
  reducedState: State,
  depth: number,
): State {
  const newState = { ...reducedState } as any;
  if (!isPlainObject(inboundState)) return newState;

  Object.keys(inboundState).forEach(key => {
    if (key === '_persist' || inboundState[key] === undefined) return;
    // if reducer modifies substate, skip auto rehydration
    if (originalState[key] !== reducedState[key]) {
      logger.debug(`autoMerge: sub state for key \`${key}\` modified, skipping.`);
      return;
    }

    setOwnProperty(newState, key, mergeValue(reducedState[key], inboundState[key], depth - 1));
  });

  logger.debug(`autoMerge: rehydrated keys '${Object.keys(inboundState).join(', ')}'`);

  return newState;
}

function mergeValue(current: unknown, inbound: unknown, depth: number): unknown {
  if (depth < 1 || !isPlainObject(current) || !isPlainObject(inbound)) return inbound;

  const merged = { ...current };
  Object.keys(inbound).forEach(key => {
    if (inbound[key] === undefined) return;
    setOwnProperty(merged, key, mergeValue(current[key], inbound[key], depth - 1));
  });
  return merged;
}

// Plain assignment of a `__proto__` key would replace the object's prototype
function setOwnProperty(target: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
}

function isPlainObject(o: unknown): o is Record<string, unknown> {
  if (o === null || typeof o !== 'object') return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}
