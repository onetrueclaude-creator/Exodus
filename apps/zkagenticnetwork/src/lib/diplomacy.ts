export type Attitude = 'hostile' | 'wary' | 'neutral' | 'friendly' | 'allied';

export function getClarityLevel(exchangeCount: number): number {
  if (exchangeCount >= 30) return 4;
  if (exchangeCount >= 15) return 3;
  if (exchangeCount >= 5) return 2;
  if (exchangeCount >= 1) return 1;
  return 0;
}

export function getAttitude(opinion: number): Attitude {
  if (opinion < -100) return 'hostile';
  if (opinion < 0) return 'wary';
  if (opinion < 50) return 'neutral';
  if (opinion < 100) return 'friendly';
  return 'allied';
}

type OpinionEvent = 'haiku_exchange' | 'proximity_tick' | 'block' | 'territory_encroach';

const OPINION_CHANGES: Record<OpinionEvent, number> = {
  haiku_exchange: 5,
  proximity_tick: 1,
  block: -20,
  territory_encroach: -10,
};

export function getOpinionChange(event: OpinionEvent): number {
  return OPINION_CHANGES[event];
}
