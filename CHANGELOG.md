# Changelog

## [Unreleased]

### Changed

- **Breaking**: `createTransform` now takes an object argument to allow for stronger typing, and to make it more clear when each transform is called

### Fixed

- Fixed non-toolkit reducers being typed as `never`

### Removed

- Removed `debug` config option, which was being used inconsistently internally

## [7.0.1] - 2026-02-16

### Added

- Added support for using synchronous storage directly without a wrapper

## [7.0.0] - 2026-02-10

This is the first version of `@menardi/redux-persist`, forked from `redux-persist@6.0.0`.

### Added

- Added `rehydrationDepth` config option to simplify state reconciliation
- Added tests to cover more cases, replacing `ava` with `vitest`

### Changed

- Migrated the codebase from Flow to Typescript
- Errors are now thrown when something goes wrong, instead of deleting the persisted data and starting the persistor from scratch
- State reconciliation defaults to level 2, which means that adding new keys inside a reducer with default values works as expected
- The `whitelist` and `blacklist` config options have been renamed to `allowlist` and `blocklist`, but the old names are still supported for backwards compatibility

### Fixed

- Fixed Typescript errors when using Redux v5 and @reduxjs/toolkit

### Removed

- The `stateReconciler` config option has been removed, and replaced with `rehydrationDepth`
- `persistCombineReducers` has been removed
- The `redux-persist/lib/storage` export has been removed
- The deprecated `keyPrefix` config option has been removed
