export const OPEN_HOUR = 6;
export const CLOSE_HOUR = 23; // slot terakhir: 22:00-23:00

export const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

export function parseHourMinutes(t: string | null): number | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** true bila shift (start–end dalam menit) mencakup slot jam `hour`:00–`hour`+1:00. */
export function onDutyAtHour(startMin: number, endMin: number, hour: number): boolean {
  const slotStart = hour * 60;
  const slotEnd = slotStart + 60;
  // dianggap bertugas bila shift menutupi minimal 30 menit dari slot ini
  const overlap = Math.min(endMin, slotEnd) - Math.max(startMin, slotStart);
  return overlap >= 30;
}
