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
import { sumJam, countLibur, jamStatus, validasiLiburHarian, validasiLiburMingguan } from "@/lib/summary";
import { labourCostFor, formatRupiah } from "@/lib/labour";
import { AssignmentSelect } from "./AssignmentSelect";
import { GenerateButton } from "./GenerateButton";
import type { ShiftCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { period?: string; week?: string };

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

  const weekIndex = Math.min(Math.max(Number(params.week ?? 0) || 0, 0), weeks.length - 1);
  const currentWeek = weeks[weekIndex];

  const [staff, shiftCodes] = await Promise.all([
    prisma.staff.findMany({ where: { aktif: true }, orderBy: [{ tipe: "asc" }, { nama: "asc" }] }),
    prisma.shiftCode.findMany({ orderBy: { code: "asc" } }),
  ]);

  const assignments = await prisma.assignment.findMany({
    where: {
      staffId: { in: staff.map((s) => s.id) },
      date: { gte: period.start, lt: period.end },
    },
    include: { shiftCode: true },
  });

  const byStaff = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = byStaff.get(a.staffId) ?? [];
    list.push(a);
    byStaff.set(a.staffId, list);
  }

  const byStaffAndDate = new Map<string, Map<string, (typeof assignments)[number]>>();
  for (const a of assignments) {
    const iso = toISODate(a.date);
    const inner = byStaffAndDate.get(a.staffId) ?? new Map();
    inner.set(iso, a);
    byStaffAndDate.set(a.staffId, inner);
  }

  const optionsForType = (tipe: "FT" | "PT") =>
    shiftCodes.filter((sc) => sc.category === tipe || (["OFF", "HOLIDAY", "MEETING"] as ShiftCategory[]).includes(sc.category));

  const prevPeriod = shiftPeriod(period, -1, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const nextPeriod = shiftPeriod(period, 1, config.periodeMulaiTgl, config.periodeSelesaiTgl);

  const dailyLibur = currentWeek.dates.map((d) => {
    const iso = toISODate(d);
    const libur = staff.filter((s) => byStaffAndDate.get(s.id)?.get(iso)?.shiftCode.category === "OFF").length;
    const totalJam = staff.reduce(
      (acc, s) => acc + (byStaffAndDate.get(s.id)?.get(iso)?.shiftCode.hours ?? 0),
      0
    );
    const cost = staff.reduce(
      (acc, s) =>
        acc + labourCostFor(s, byStaffAndDate.get(s.id)?.get(iso)?.shiftCode.hours ?? 0, config),
      0
    );
    return { date: d, libur, masuk: staff.length - libur, totalJam, cost };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Jadwal Shift</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/jadwal?period=${toISODate(prevPeriod.start)}&week=0`}
            className="rounded border border-zinc-300 px-2 py-1 hover:bg-white"
          >
            ← Periode sebelumnya
          </Link>
          <span className="rounded bg-white px-2 py-1 font-medium">
            Periode {formatShort(period.start)} – {formatShort(addDays(period.end, -1))}
          </span>
          <Link
            href={`/jadwal?period=${toISODate(nextPeriod.start)}&week=0`}
            className="rounded border border-zinc-300 px-2 py-1 hover:bg-white"
          >
            Periode berikutnya →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {weeks.map((w) => (
          <Link
            key={w.index}
            href={`/jadwal?period=${toISODate(period.start)}&week=${w.index}`}
            className={`rounded px-3 py-1 ${
              w.index === weekIndex ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white hover:bg-zinc-100"
            }`}
          >
            Minggu {w.index + 1}
          </Link>
        ))}
        <div className="ml-auto">
          <GenerateButton periodStartISO={toISODate(period.start)} weekIndex={weekIndex} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
              <th className="sticky left-0 bg-zinc-50 px-3 py-2">Nama</th>
              <th className="px-2 py-2">Tipe</th>
              {currentWeek.dates.map((d) => (
                <th key={toISODate(d)} className="px-1 py-2 text-center">
                  <div>{dayName(d)}</div>
                  <div className="font-normal text-zinc-500">{formatShort(d)}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-right">Jam/Minggu</th>
              <th className="px-2 py-2 text-right">Libur/Minggu</th>
              <th className="px-2 py-2 text-right">Jam Periode</th>
              <th className="px-2 py-2 text-right">Labour Cost</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const periodAssignments = byStaff.get(s.id) ?? [];
              const weekAssignments = currentWeek.dates
                .map((d) => byStaffAndDate.get(s.id)?.get(toISODate(d)))
                .filter((a): a is NonNullable<typeof a> => Boolean(a));

              const totalJamMinggu = sumJam(weekAssignments);
              const totalLiburMinggu = countLibur(weekAssignments);
              const totalJamPeriode = sumJam(periodAssignments);
              const costMinggu = labourCostFor(s, totalJamMinggu, config);
              const status = jamStatus(s.tipe, totalJamPeriode, config.targetJamPT);
              // aturan libur 2-3/minggu hanya untuk PT; FT cukup 1 dayoff
              const liburOk =
                s.tipe === "PT"
                  ? validasiLiburMingguan(totalLiburMinggu, config.liburMinMinggu, config.liburMaxMinggu)
                  : totalLiburMinggu >= 1;

              return (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                  <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-1.5 font-medium">{s.nama}</td>
                  <td className="px-2 py-1.5 text-zinc-500">{s.tipe}</td>
                  {currentWeek.dates.map((d) => {
                    const iso = toISODate(d);
                    const current = byStaffAndDate.get(s.id)?.get(iso);
                    return (
                      <td key={iso} className="px-1 py-1.5">
                        <AssignmentSelect
                          staffId={s.id}
                          dateISO={iso}
                          currentShiftCodeId={current?.shiftCodeId ?? null}
                          options={optionsForType(s.tipe).map((o) => ({ id: o.id, code: o.code }))}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right">{totalJamMinggu}</td>
                  <td className={`px-2 py-1.5 text-right ${liburOk ? "" : "text-red-600"}`}>{totalLiburMinggu}</td>
                  <td className="px-2 py-1.5 text-right">{totalJamPeriode}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{formatRupiah(costMinggu)}</td>
                  <td className="px-2 py-1.5">
                    {status && (
                      <span className={status.ok ? "text-green-700" : "text-red-600"}>
                        {status.ok ? "✅" : "❌"} {status.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td colSpan={14} className="px-3 py-6 text-center text-zinc-400">
                  Belum ada staff aktif. Tambahkan di halaman Staff.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 bg-zinc-50">
              <td className="sticky left-0 bg-zinc-50 px-3 py-1.5 font-medium" colSpan={2}>
                Yang Masuk
              </td>
              {dailyLibur.map(({ date, masuk }) => (
                <td key={toISODate(date)} className="px-1 py-1.5 text-center">
                  {masuk}
                </td>
              ))}
              <td colSpan={5}></td>
            </tr>
            <tr className="bg-zinc-50">
              <td className="sticky left-0 bg-zinc-50 px-3 py-1.5 font-medium" colSpan={2}>
                Yang Libur
              </td>
              {dailyLibur.map(({ date, libur }) => {
                const ok = validasiLiburHarian(libur, config.liburHarianMin, config.liburHarianMax);
                return (
                  <td key={toISODate(date)} className={`px-1 py-1.5 text-center ${ok ? "" : "text-red-600 font-semibold"}`}>
                    {libur}
                  </td>
                );
              })}
              <td colSpan={5}></td>
            </tr>
            <tr className="bg-zinc-50">
              <td className="sticky left-0 bg-zinc-50 px-3 py-1.5 font-medium" colSpan={2}>
                Total Jam Harian
              </td>
              {dailyLibur.map(({ date, totalJam }) => (
                <td key={toISODate(date)} className="px-1 py-1.5 text-center">
                  {totalJam}
                </td>
              ))}
              <td colSpan={5}></td>
            </tr>
            <tr className="bg-zinc-50">
              <td className="sticky left-0 bg-zinc-50 px-3 py-1.5 font-medium" colSpan={2}>
                Labour Cost Harian
              </td>
              {dailyLibur.map(({ date, cost }) => (
                <td key={toISODate(date)} className="px-1 py-1.5 text-center whitespace-nowrap">
                  {formatRupiah(cost)}
                </td>
              ))}
              <td className="px-2 py-1.5 text-right font-semibold whitespace-nowrap" colSpan={5}>
                Total minggu: {formatRupiah(dailyLibur.reduce((a, d) => a + d.cost, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Target jam PT per periode: {config.targetJamPT} jam · Libur/minggu: {config.liburMinMinggu}–{config.liburMaxMinggu}{" "}
        · Libur harian (jumlah orang): {config.liburHarianMin}–{config.liburHarianMax}. Ubah di halaman{" "}
        <Link href="/config" className="underline">
          Pengaturan
        </Link>
        .
      </p>
    </div>
  );
}
