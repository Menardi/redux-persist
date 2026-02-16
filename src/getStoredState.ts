import { KEY_PREFIX } from './constants';
import { PersistConfig } from './types';

export default async function getStoredState(
  config: PersistConfig,
): Promise<Record<string, any> | undefined> {
  const transforms = config.transforms || [];
  const storageKey = `${KEY_PREFIX}${config.key}`;
  const storage = config.storage;
  const debug = config.debug;
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
      state[key] = transforms.reduceRight((subState, transformer) => {
        return transformer.out(subState, key, rawState);
      }, deserialize(rawState[key]));
    });
    return state;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && debug)
      console.log(
        `redux-persist/getStoredState: Error restoring data ${serialized}`,
        err,
      );
    throw err;
  }
}

function defaultDeserialize(serial: string): any {
  return JSON.parse(serial);
}
