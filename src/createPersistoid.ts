import { KEY_PREFIX } from './constants';
import { runTransforms } from './transforms';
import { Persistoid, PersistConfig } from './types';

type IntervalID = ReturnType<typeof setInterval>;

export default function createPersistoid(config: PersistConfig): Persistoid {
  const blocklist: Array<string> | null = config.blocklist || config.blacklist || null;
  const allowlist: Array<string> | null = config.allowlist || config.whitelist || null;
  const transforms = config.transforms || [];
  const throttle = config.throttle || 0;
  const storageKey = `${KEY_PREFIX}${config.key}`;
  const storage = config.storage;
  let serialize: (state: any) => string;
  if (config.serialize === false) {
    serialize = (x: any) => x;
  } else if (typeof config.serialize === 'function') {
    serialize = config.serialize;
  } else {
    serialize = defaultSerialize;
  }

  const writeFailHandler = config.writeFailHandler || null;

  // initialize stateful values
  let lastState: Record<string, any> = {};
  const stagedState: Record<string, any> = {};
  const keysToProcess: Array<string> = [];
  let timeIterator: IntervalID | null = null;
  let writePromise: Promise<any> | null = null;

  const update = (state: Record<string, any>): void => {
    // add any changed keys to the queue
    Object.keys(state).forEach(key => {
      if (!passesAllowBlocklists(key)) return; // is keyspace ignored? noop
      if (lastState[key] === state[key]) return; // value unchanged? noop
      if (keysToProcess.indexOf(key) !== -1) return; // is key already queued? noop
      keysToProcess.push(key); // add key to queue
    });

    //if any key is missing in the new state which was present in the lastState,
    //add it for processing too
    Object.keys(lastState).forEach(key => {
      if (
        state[key] === undefined &&
        passesAllowBlocklists(key) &&
        keysToProcess.indexOf(key) === -1 &&
        lastState[key] !== undefined
      ) {
        keysToProcess.push(key);
      }
    });

    // start the time iterator if not running (read: throttle)
    if (timeIterator === null) {
      timeIterator = setInterval(processNextKey, throttle);
    }

    lastState = state;
  };

  function processNextKey(): void {
    if (keysToProcess.length === 0) {
      if (timeIterator) clearInterval(timeIterator);
      timeIterator = null;
      return;
    }

    const key = keysToProcess.shift()!;
    const transformedState = runTransforms({
      state: lastState[key],
      reducerName: key,
      direction: 'beforePersist',
      allTransforms: transforms,
    });

    if (transformedState !== undefined) {
      try {
        stagedState[key] = serialize(transformedState);
      } catch (err) {
        console.error(
          'redux-persist/createPersistoid: error serializing state',
          err,
        );
        throw err;
      }
    } else {
      //if the transformedState is undefined, no need to persist the existing serialized content
      delete stagedState[key];
    }

    if (keysToProcess.length === 0) {
      writeStagedState();
    }
  }

  function writeStagedState(): void {
    // cleanup any removed keys just before write.
    Object.keys(stagedState).forEach(key => {
      if (lastState[key] === undefined) {
        delete stagedState[key];
      }
    });

    // Wrap in promise to allow for synchronous `setItem` calls. We create a new Promise rather than
    // just using `Promise.resolve` so errors on synchronous writes are thrown correctly.
    writePromise = new Promise(resolve => resolve(storage.setItem(storageKey, serialize(stagedState))))
      .catch(onWriteFail);
  }

  function passesAllowBlocklists(key: string): boolean {
    if (allowlist && allowlist.indexOf(key) === -1 && key !== '_persist') return false;
    if (blocklist && blocklist.indexOf(key) !== -1) return false;
    return true;
  }

  function onWriteFail(err: Error): void {
    if (writeFailHandler) writeFailHandler(err);
    if (err && process.env.NODE_ENV !== 'production') {
      console.error('Error storing data', err);
    }
  }

  const flush = (): Promise<any> => {
    while (keysToProcess.length !== 0) {
      processNextKey();
    }

    return writePromise || Promise.resolve();
  };

  return {
    update,
    flush,
  };
}

function defaultSerialize(data: any): string {
  return JSON.stringify(data);
}
