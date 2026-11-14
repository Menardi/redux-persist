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

  const serialized = await storage.getItem(storageKey);
  if (!serialized) return undefined;

  try {
    const state: Record<string, any> = {};
    const rawState = JSON.parse(serialized);

    Object.keys(rawState).forEach(key => {
      state[key] = runTransforms({
        allTransforms: transforms,
        direction: 'beforeHydrate',
        reducerName: key,
        state: JSON.parse(rawState[key]),
      });
    });

    return state;
  } catch (err) {
    logger.log(`getStoredState: Error restoring data ${serialized}`, err);
    throw err;
  }
}
