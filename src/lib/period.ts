export type Period = { start: Date; end: Date };

/** All dates in this module are UTC-midnight, matching Prisma's `@db.Date` columns. */

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

/**
 * Payroll-style period, e.g. tanggal 21 bulan ini s/d tanggal 20 bulan depan.
 * `end` is exclusive: one day after selesaiTgl, so the selesaiTgl itself is included.
 */
export function getPeriodForDate(date: Date, mulaiTgl: number, selesaiTgl: number): Period {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startMonth = date.getDate() >= mulaiTgl ? month : month - 1;
  const start = new Date(Date.UTC(year, startMonth, mulaiTgl));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, selesaiTgl + 1));
  return { start, end };
}

export function shiftPeriod(period: Period, months: number, mulaiTgl: number, selesaiTgl: number): Period {
  const ref = new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth() + months, mulaiTgl));
  return getPeriodForDate(ref, mulaiTgl, selesaiTgl);
}

export type Week = { index: number; start: Date; dates: Date[] };

export function getWeeksInPeriod(period: Period): Week[] {
  const weeks: Week[] = [];
  let cursor = new Date(period.start);
  let index = 0;
  while (cursor < period.end) {
    const dates: Date[] = [];
    for (let i = 0; i < 7 && addDays(cursor, i) < period.end; i++) {
      dates.push(addDays(cursor, i));
    }
    weeks.push({ index, start: new Date(cursor), dates });
    cursor = addDays(cursor, 7);
    index++;
  }
  return weeks;
}

const DAY_NAMES = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

export function dayName(d: Date): string {
  return DAY_NAMES[d.getUTCDay()];
}

export function formatShort(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", timeZone: "UTC" });
}
