import { logger } from '../utils';

/** autoMergeLevel1
 * - Merges 1 level of substate
 * - Skips substate if already modified */
export default function autoMergeLevel1<State extends Record<string, any>>(
  inboundState: State,
  originalState: State,
  reducedState: State,
): State {
  const newState = { ...reducedState } as any;
  // only rehydrate if inboundState exists and is an object
  if (inboundState && typeof inboundState === 'object') {
    Object.keys(inboundState).forEach(key => {
      // ignore _persist data
      if (key === '_persist') return;
      // if reducer modifies substate, skip auto rehydration
      if (originalState[key] !== reducedState[key]) {
        logger.debug(`autoMergeLevel1: sub state for key \`${key}\` modified, skipping.`);
        return;
      }

      // otherwise hard set the new value
      newState[key] = inboundState[key];
    });
  }

  if (inboundState && typeof inboundState === 'object') {
    logger.debug(`autoMergeLevel1: rehydrated keys '${Object.keys(inboundState).join(', ')}'`);
  }

  return newState;
}
