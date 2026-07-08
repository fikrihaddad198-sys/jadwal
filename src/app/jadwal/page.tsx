import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import {
  getPeriodForDate,
  getWeeksInPeriod,
  shiftPeriod,
  toISODate,
  dayName,
  formatShort,
  addDays,
} from "@/lib/period";
import { hourlyRate } from "@/lib/labour";
import { PageHeader } from "../PageHeader";
import { ScheduleGrid } from "./ScheduleGrid";

export const dynamic = "force-dynamic";

type SearchParams = { period?: string };

export default async function JadwalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const config = await getConfig();

  const refDate = params.period ? new Date(params.period) : new Date();
  const period = getPeriodForDate(refDate, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const weeks = getWeeksInPeriod(period);

  const [staff, shiftCodes] = await Promise.all([
    prisma.staff.findMany({ where: { aktif: true }, orderBy: [{ tipe: "asc" }, { nama: "asc" }] }),
    prisma.shiftCode.findMany({ orderBy: { code: "asc" } }),
  ]);

  const assignments = await prisma.assignment.findMany({
    where: {
      staffId: { in: staff.map((s) => s.id) },
      date: { gte: period.start, lt: period.end },
    },
    select: { staffId: true, shiftCodeId: true, date: true, updatedAt: true },
  });

  const initialCells: Record<string, string> = {};
  let maxUpdated = 0;
  for (const a of assignments) {
    initialCells[`${a.staffId}|${toISODate(a.date)}`] = a.shiftCodeId;
    maxUpdated = Math.max(maxUpdated, a.updatedAt.getTime());
  }
  const dataVersion = `${assignments.length}-${maxUpdated}`;

  const todayISO = toISODate(
    new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))
  );

  const days = weeks.flatMap((w) =>
    w.dates.map((d) => ({
      iso: toISODate(d),
      hari: dayName(d).slice(0, 3),
      tanggal: formatShort(d),
      weekIndex: w.index,
      isToday: toISODate(d) === todayISO,
      isMinggu: d.getUTCDay() === 0,
    }))
  );

  const weekMeta = weeks.map((w) => ({
    index: w.index,
    label: `Minggu ${w.index + 1}`,
    span: w.dates.length,
  }));

  const prevPeriod = shiftPeriod(period, -1, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const nextPeriod = shiftPeriod(period, 1, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const periodLabel = `${formatShort(period.start)} – ${formatShort(addDays(period.end, -1))}`;

  return (
    <div>
      <PageHeader
        eyebrow="Jadwal Shift"
        title={`Periode ${periodLabel}`}
        description="Ketik langsung di sel seperti di Excel — kode shift (OP25, PT12) atau angka jam (4, 6, 8). Ketik 0 / off untuk libur, kosongkan untuk hapus. Enter pindah ke bawah, Tab ke kanan."
        actions={
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-zinc-950/5">
            <Link
              href={`/jadwal?period=${toISODate(prevPeriod.start)}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              ←
            </Link>
            <span className="px-2 text-sm font-semibold">{periodLabel}</span>
            <Link
              href={`/jadwal?period=${toISODate(nextPeriod.start)}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              →
            </Link>
          </div>
        }
      />

      <ScheduleGrid
        key={dataVersion}
        periodStartISO={toISODate(period.start)}
        days={days}
        weeks={weekMeta}
        staff={staff.map((s) => ({
          id: s.id,
          nama: s.nama,
          tipe: s.tipe,
          ratePerJam: hourlyRate(s, config),
        }))}
        codes={shiftCodes.map((c) => ({
          id: c.id,
          code: c.code,
          category: c.category,
          hours: c.hours,
          startTime: c.startTime,
          endTime: c.endTime,
        }))}
        initialCells={initialCells}
        rules={{
          targetJamPT: config.targetJamPT,
          liburMinMinggu: config.liburMinMinggu,
          liburMaxMinggu: config.liburMaxMinggu,
          liburHarianMin: config.liburHarianMin,
          liburHarianMax: config.liburHarianMax,
        }}
      />
    </div>
  );
}
