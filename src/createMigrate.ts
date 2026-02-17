import { DEFAULT_VERSION } from './constants';
import { PersistedState, MigrationManifest, PersistMigrate } from './types';
import { logger } from './utils';

export default function createMigrate(
  migrations: MigrationManifest,
): PersistMigrate {
  return function (
    state: PersistedState,
    currentVersion: number,
  ): Promise<PersistedState> {
    if (!state) {
      logger.debug('createMigrate: No inbound state, skipping migration');
      return Promise.resolve(undefined);
    }

    const inboundVersion: number =
      state._persist && state._persist.version !== undefined
        ? state._persist.version
        : DEFAULT_VERSION;

    if (inboundVersion === currentVersion) {
      logger.debug('createMigrate: Versions match, noop migration');
      return Promise.resolve(state);
    }

    if (inboundVersion > currentVersion) {
      logger.error('Downgrading version is not supported');
      return Promise.resolve(state);
    }

    const migrationKeys = Object.keys(migrations)
      .map(ver => parseInt(ver))
      .filter(key => currentVersion >= key && key > inboundVersion)
      .sort((a, b) => a - b);

    try {
      const migratedState: PersistedState = migrationKeys.reduce((state: PersistedState, versionKey) => {
        logger.log(`Running migration for version ${versionKey}`);
        return migrations[versionKey](state);
      }, state);
      return Promise.resolve(migratedState);
    } catch (err) {
      return Promise.reject(err);
    }
  };
}
