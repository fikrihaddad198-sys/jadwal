import type { Config, ShiftCode, Staff } from "@prisma/client";
import { toISODate } from "./period";

export type GeneratedAssignment = {
  staffId: string;
  dateISO: string;
  shiftCodeId: string;
};

type Pools = {
  dayoff: ShiftCode;
  ftOpening: ShiftCode[];
  ftClosing: ShiftCode[];
  ftMid: ShiftCode[];
  ptByDuration: Map<number, ShiftCode[]>;
};

function parseMinutes(t: string | null): number | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function buildPools(shiftCodes: ShiftCode[]): Pools {
  const dayoff = shiftCodes.find((c) => c.category === "OFF");
  if (!dayoff) throw new Error("Kode shift kategori OFF (dayoff) tidak ditemukan.");

  const ftOpening: ShiftCode[] = [];
  const ftClosing: ShiftCode[] = [];
  const ftMid: ShiftCode[] = [];
  const ptByDuration = new Map<number, ShiftCode[]>();

  for (const c of shiftCodes) {
    const start = parseMinutes(c.startTime);
    const end = parseMinutes(c.endTime);
    if (c.category === "FT") {
      if (c.hours <= 0 || start === null || end === null) continue;
      if (start <= 7 * 60) ftOpening.push(c);
      else if (end >= 23 * 60) ftClosing.push(c);
      else ftMid.push(c);
    } else if (c.category === "PT") {
      if (c.hours <= 0 || start === null) continue;
      const list = ptByDuration.get(c.hours) ?? [];
      list.push(c);
      ptByDuration.set(c.hours, list);
    }
  }

  const byStart = (a: ShiftCode, b: ShiftCode) =>
    (parseMinutes(a.startTime) ?? 0) - (parseMinutes(b.startTime) ?? 0);
  ftOpening.sort(byStart);
  ftClosing.sort(byStart);
  ftMid.sort(byStart);
  for (const list of ptByDuration.values()) list.sort(byStart);

  return { dayoff, ftOpening, ftClosing, ftMid, ptByDuration };
}

/**
 * Susun rencana jam kerja satu staff PT untuk `slots` hari kerja agar
 * totalnya mendekati `target`, dengan campuran shift 4 & 6 jam.
 */
function planPtHours(target: number, slots: number, durations: number[]): number[] {
  const sorted = [...durations].sort((a, b) => a - b);
  const min = sorted[0] ?? 4;
  const max = sorted[sorted.length - 1] ?? 6;
  const plan: number[] = [];
  let remaining = target;
  for (let i = slots; i > 0; i--) {
    const avg = remaining / i;
    // pilih durasi tersedia yang paling dekat dengan rata-rata kebutuhan
    let pick = sorted[0] ?? min;
    for (const d of sorted) {
      if (Math.abs(d - avg) < Math.abs(pick - avg)) pick = d;
    }
    pick = Math.min(Math.max(pick, min), max);
    plan.push(pick);
    remaining -= pick;
  }
  return plan;
}

/**
 * Generate jadwal draft satu minggu (greedy deterministik).
 * - FT: 1 dayoff/minggu dirotasi, tiap hari dijamin ada opening & closing.
 * - PT: libur liburMin–liburMax/minggu, total jam mendekati target mingguan,
 *   jumlah orang libur per hari dijaga ≤ liburHarianMax.
 */
export function generateWeek(opts: {
  dates: Date[];
  staff: Staff[];
  shiftCodes: ShiftCode[];
  config: Config;
  totalDaysInPeriod: number;
  weekIndex: number;
}): GeneratedAssignment[] {
  const { dates, staff, shiftCodes, config, totalDaysInPeriod, weekIndex } = opts;
  const pools = buildPools(shiftCodes);
  const nDays = dates.length;
  const result: GeneratedAssignment[] = [];
  if (nDays === 0) return result;

  const ft = staff.filter((s) => s.tipe === "FT");
  const pt = staff.filter((s) => s.tipe === "PT");
  const offPerDay = new Array<number>(nDays).fill(0);
  const rot = weekIndex; // rotasi antar minggu supaya pola tidak monoton

  // ===== FT =====
  const ftOffDay = new Map<string, number>();
  ft.forEach((s, i) => {
    if (nDays < 3) return; // minggu pendek di ujung periode: FT masuk semua
    const day = (i + rot) % nDays;
    ftOffDay.set(s.id, day);
    offPerDay[day]++;
  });

  dates.forEach((date, d) => {
    const iso = toISODate(date);
    const working = ft.filter((s) => ftOffDay.get(s.id) !== d);
    working.forEach((s, i) => {
      // posisi dirotasi per hari: 0 = opening, 1 = closing, sisanya mid
      const pos = (i + d + rot) % Math.max(working.length, 1);
      let pool: ShiftCode[];
      if (pos === 0) pool = pools.ftOpening;
      else if (pos === 1 && pools.ftClosing.length > 0) pool = pools.ftClosing;
      else pool = pools.ftMid.length > 0 ? pools.ftMid : pools.ftOpening;
      if (pool.length === 0) pool = shiftCodes.filter((c) => c.category === "FT" && c.hours > 0);
      const code = pool[(d + i + rot) % pool.length];
      result.push({ staffId: s.id, dateISO: iso, shiftCodeId: code.id });
    });
    for (const s of ft) {
      if (ftOffDay.get(s.id) === d) {
        result.push({ staffId: s.id, dateISO: iso, shiftCodeId: pools.dayoff.id });
      }
    }
  });

  // ===== PT =====
  // Pakai mix standar 4 & 6 jam seperti di spreadsheet; fallback ke semua durasi
  const allDurations = [...pools.ptByDuration.keys()].sort((a, b) => a - b);
  const preferred = allDurations.filter((d) => d === 4 || d === 6);
  const durations = preferred.length > 0 ? preferred : allDurations;
  if (pt.length > 0 && durations.length > 0) {
    const weeklyTarget = (config.targetJamPT / totalDaysInPeriod) * nDays;
    const offCount = Math.min(config.liburMinMinggu, Math.max(nDays - 1, 0));

    // bagikan hari libur PT: pilih hari dengan jumlah libur paling sedikit
    const ptOffDays = new Map<string, Set<number>>();
    pt.forEach((s, i) => {
      const offs = new Set<number>();
      for (let k = 0; k < offCount; k++) {
        let best = -1;
        for (let d = 0; d < nDays; d++) {
          const day = (d + i + k * 3 + rot) % nDays; // offset agar tersebar
          if (offs.has(day)) continue;
          if (offPerDay[day] >= config.liburHarianMax) continue;
          if (best === -1 || offPerDay[day] < offPerDay[best]) best = day;
        }
        if (best === -1) {
          // semua hari penuh kuota libur: pilih hari tersedikit tanpa batas max
          for (let d = 0; d < nDays; d++) {
            if (offs.has(d)) continue;
            if (best === -1 || offPerDay[d] < offPerDay[best]) best = d;
          }
        }
        if (best !== -1) {
          offs.add(best);
          offPerDay[best]++;
        }
      }
      ptOffDays.set(s.id, offs);
    });

    pt.forEach((s, i) => {
      const offs = ptOffDays.get(s.id) ?? new Set<number>();
      const workSlots = nDays - offs.size;
      const plan = planPtHours(weeklyTarget, workSlots, durations);
      let slot = 0;
      dates.forEach((date, d) => {
        const iso = toISODate(date);
        if (offs.has(d)) {
          result.push({ staffId: s.id, dateISO: iso, shiftCodeId: pools.dayoff.id });
          return;
        }
        const hours = plan[slot] ?? durations[0];
        const pool = pools.ptByDuration.get(hours) ?? pools.ptByDuration.get(durations[0])!;
        // pool terurut jam mulai; indeks disebar agar shift pagi/siang/malam merata
        const step = Math.max(1, Math.floor(pool.length / Math.max(pt.length, 1)));
        const code = pool[(i * step + d + rot) % pool.length];
        result.push({ staffId: s.id, dateISO: iso, shiftCodeId: code.id });
        slot++;
      });
    });
  }

  return result;
}
