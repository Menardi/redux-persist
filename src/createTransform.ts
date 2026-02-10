import { TransformConfig, Transform } from './types';

export default function createTransform<HSS = any, ESS = any, S = any, RS = any>(
  // @NOTE inbound: transform state coming from redux on its way to being serialized and stored
  inbound: ((subState: HSS, key: keyof S, state: S) => ESS) | null | undefined,
  // @NOTE outbound: transform state coming from storage, on its way to be rehydrated into redux
  outbound: ((state: ESS, key: keyof RS, rawState: RS) => HSS) | null | undefined,
  config: TransformConfig<HSS, ESS, S, RS> = {},
): Transform<HSS, ESS, S, RS> {
  const whitelist = config.whitelist || null;
  const blacklist = config.blacklist || null;

  function whitelistBlacklistCheck(key: keyof S | keyof RS): boolean {
    if (whitelist && whitelist.indexOf(key as keyof S) === -1) return true;
    if (blacklist && blacklist.indexOf(key as keyof S) !== -1) return true;
    return false;
  }

  return {
    in: (state: HSS, key: keyof S, fullState: S): ESS =>
      !whitelistBlacklistCheck(key) && inbound
        ? inbound(state, key, fullState)
        : (state as any as ESS),
    out: (state: ESS, key: keyof RS, fullState: RS): HSS =>
      !whitelistBlacklistCheck(key) && outbound
        ? outbound(state, key, fullState)
        : (state as any as HSS),
  };
}
