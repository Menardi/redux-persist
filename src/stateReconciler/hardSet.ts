/*
  hardSet:
    - hard set incoming state
*/

export default function hardSet<State extends Record<string, any>>(
  inboundState: State
): State {
  return inboundState
}
