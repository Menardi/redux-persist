import { logger } from '../utils';

/** autoMergeLevel2:
 * - Merges 2 level of substate
 * - Skips substate if already modified */
export default function autoMergeLevel2<State extends Record<string, any>>(
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
        logger.debug(`autoMergeLevel2: sub state for key \`${key}\` modified, skipping.`);
        return;
      }

      if (isPlainEnoughObject(reducedState[key])) {
        // if object is plain enough shallow merge the new values (hence "Level2")
        newState[key] = { ...newState[key], ...inboundState[key] };
        return;
      }

      // otherwise hard set
      newState[key] = inboundState[key];
    });
  }

  if (inboundState && typeof inboundState === 'object') {
    logger.debug(`autoMergeLevel2: rehydrated keys '${Object.keys(inboundState).join(', ')}'`);
  }

  return newState;
}

function isPlainEnoughObject(o: any): o is Record<string, any> {
  return o !== null && !Array.isArray(o) && typeof o === 'object';
}
