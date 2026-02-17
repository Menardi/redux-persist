import { KEY_PREFIX } from './constants';
import { runTransforms } from './transforms';
import { PersistConfig } from './types';
import { logger } from './utils';

export default async function getStoredState(
  config: PersistConfig,
): Promise<Record<string, any> | undefined> {
  const transforms = config.transforms || [];
  const storageKey = `${KEY_PREFIX}${config.key}`;
  const storage = config.storage;

  let deserialize: (serialized: string) => any;
  if (config.deserialize === false) {
    deserialize = (x: any) => x;
  } else if (typeof config.deserialize === 'function') {
    deserialize = config.deserialize;
  } else {
    deserialize = defaultDeserialize;
  }

  const serialized = await storage.getItem(storageKey);
  if (!serialized) return undefined;

  try {
    const state: Record<string, any> = {};
    const rawState = deserialize(serialized);

    Object.keys(rawState).forEach(key => {
      state[key] = runTransforms({
        allTransforms: transforms,
        direction: 'beforeHydrate',
        reducerName: key,
        state: deserialize(rawState[key]),
      });
    });

    return state;
  } catch (err) {
    logger.log(`getStoredState: Error restoring data ${serialized}`, err);
    throw err;
  }
}

function defaultDeserialize(serial: string): any {
  return JSON.parse(serial);
}
