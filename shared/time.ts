// Date utilities shared by Worker and client.
// `due` is stored as epoch days (UTC midnight): floor(epoch_ms / 86_400_000).

export const MS_PER_DAY = 86_400_000;

export function epochDays(ms: number = Date.now()): number {
  return Math.floor(ms / MS_PER_DAY);
}

export function addDays(epochDay: number, days: number): number {
  return epochDay + days;
}
