import { KEY_PREFIX } from './constants';
import { PersistConfig } from './types';

export default function purgeStoredState(config: PersistConfig): Promise<any> {
  const storage = config.storage;
  const storageKey = `${KEY_PREFIX}${config.key}`;
  return new Promise(resolve => resolve(storage.removeItem(storageKey, warnIfRemoveError)));
}

function warnIfRemoveError(err: any): void {
  if (err && process.env.NODE_ENV !== 'production') {
    console.error(
      'redux-persist/purgeStoredState: Error purging data stored state',
      err,
    );
  }
}
