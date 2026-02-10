import { TransformConfig, Transform } from './types';

export default function createTransform<HSS = any, ESS = any, S = any, RS = any>(
  /** inbound: transform state coming from redux on its way to being serialized and stored */
  inbound: ((subState: HSS, key: keyof S, state: S) => ESS) | null | undefined,
  /** outbound: transform state coming from storage, on its way to be rehydrated into redux */
  outbound: ((state: ESS, key: keyof RS, rawState: RS) => HSS) | null | undefined,
  config: TransformConfig<HSS, ESS, S, RS> = {},
): Transform<HSS, ESS, S, RS> {
  const allowlist = config.allowlist || config.whitelist || null;
  const blocklist = config.blocklist || config.blacklist || null;

  function checkAllowBlock(key: keyof S | keyof RS): boolean {
    if (allowlist && allowlist.indexOf(key as keyof S) === -1) return true;
    if (blocklist && blocklist.indexOf(key as keyof S) !== -1) return true;
    return false;
  }

  return {
    in: (state: HSS, key: keyof S, fullState: S): ESS => (
      !checkAllowBlock(key) && inbound
        ? inbound(state, key, fullState)
        : (state as any as ESS)
    ),
    out: (state: ESS, key: keyof RS, fullState: RS): HSS => (
      !checkAllowBlock(key) && outbound
        ? outbound(state, key, fullState)
        : (state as any as HSS)
    ),
  };
}
