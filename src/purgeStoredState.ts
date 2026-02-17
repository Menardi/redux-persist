import { KEY_PREFIX } from './constants';
import { PersistConfig } from './types';
import { logger } from './utils';

export default function purgeStoredState(config: PersistConfig): Promise<any> {
  const storage = config.storage;
  const storageKey = `${KEY_PREFIX}${config.key}`;
  return new Promise(resolve => resolve(storage.removeItem(storageKey, warnIfRemoveError)));
}

function warnIfRemoveError(err: any): void {
  if (err) {
    logger.error('purgeStoredState: Error purging data stored state', err);
  }
}
