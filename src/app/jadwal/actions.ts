"use server";

import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { generateWeek } from "@/lib/generator";
import { getPeriodForDate, getWeeksInPeriod, parseISODate } from "@/lib/period";
import { revalidatePath } from "next/cache";

export async function setAssignment(staffId: string, dateISO: string, shiftCodeId: string) {
  const date = parseISODate(dateISO);
  if (!shiftCodeId) {
    await prisma.assignment.deleteMany({ where: { staffId, date } });
  } else {
    await prisma.assignment.upsert({
      where: { staffId_date: { staffId, date } },
      update: { shiftCodeId },
      create: { staffId, date, shiftCodeId },
    });
  }
  revalidatePath("/jadwal");
}

export type GenerateResult = { ok: boolean; count?: number; error?: string };

export async function generateWeekSchedule(
  periodStartISO: string,
  weekIndex: number
): Promise<GenerateResult> {
  try {
    const config = await getConfig();
    const refDate = parseISODate(periodStartISO);
    const period = getPeriodForDate(
      new Date(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate()),
      config.periodeMulaiTgl,
      config.periodeSelesaiTgl
    );
    const weeks = getWeeksInPeriod(period);
    const week = weeks[weekIndex];
    if (!week) return { ok: false, error: `Minggu ke-${weekIndex + 1} tidak ada di periode ini.` };

    const totalDaysInPeriod = weeks.reduce((acc, w) => acc + w.dates.length, 0);
    const [staff, shiftCodes] = await Promise.all([
      prisma.staff.findMany({ where: { aktif: true }, orderBy: [{ tipe: "asc" }, { nama: "asc" }] }),
      prisma.shiftCode.findMany(),
    ]);
    if (staff.length === 0) return { ok: false, error: "Tidak ada staff aktif." };

    const generated = generateWeek({
      dates: week.dates,
      staff,
      shiftCodes,
      config,
      totalDaysInPeriod,
      weekIndex,
    });

    const weekStart = week.dates[0];
    const weekEnd = week.dates[week.dates.length - 1];
    await prisma.$transaction([
      prisma.assignment.deleteMany({
        where: {
          staffId: { in: staff.map((s) => s.id) },
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.assignment.createMany({
        data: generated.map((g) => ({
          staffId: g.staffId,
          shiftCodeId: g.shiftCodeId,
          date: parseISODate(g.dateISO),
        })),
      }),
    ]);

    revalidatePath("/jadwal");
    return { ok: true, count: generated.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
