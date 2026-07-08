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
import { hourlyRate, formatRupiah } from "@/lib/labour";
import { HOURS, parseHourMinutes, onDutyAtHour } from "@/lib/coverage";
import { saveHourlySales } from "./actions";
import { SaveSalesButton } from "./SaveSalesButton";
import { PageHeader } from "../PageHeader";

export const dynamic = "force-dynamic";

type SearchParams = { period?: string; week?: string; day?: string };

export default async function CoveragePage({
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
  const dayIndex = Math.min(
    Math.max(Number(params.day ?? 0) || 0, 0),
    currentWeek.dates.length - 1
  );
  const date = currentWeek.dates[dayIndex];
  const dateISO = toISODate(date);

  const prevPeriod = shiftPeriod(period, -1, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const nextPeriod = shiftPeriod(period, 1, config.periodeMulaiTgl, config.periodeSelesaiTgl);

  const [staff, assignments, hourlySales] = await Promise.all([
    prisma.staff.findMany({ where: { aktif: true }, orderBy: [{ tipe: "asc" }, { nama: "asc" }] }),
    prisma.assignment.findMany({
      where: { date },
      include: { shiftCode: true },
    }),
    prisma.hourlySale.findMany({ where: { date } }),
  ]);

  const salesByHour = new Map(hourlySales.map((h) => [h.hour, h.sales]));
  const assignmentByStaff = new Map(assignments.map((a) => [a.staffId, a]));

  // baris on-duty per staff: shift dengan jam mulai/selesai valid
  const dutyRows = staff
    .map((s) => {
      const a = assignmentByStaff.get(s.id);
      if (!a) return null;
      const start = parseHourMinutes(a.shiftCode.startTime);
      const end = parseHourMinutes(a.shiftCode.endTime);
      if (start === null || end === null || a.shiftCode.hours <= 0) return null;
      return { s, code: a.shiftCode.code, start, end };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const mpp = HOURS.map((h) => dutyRows.filter((r) => onDutyAtHour(r.start, r.end, h)).length);
  const labourPerHour = HOURS.map((h) =>
    dutyRows
      .filter((r) => onDutyAtHour(r.start, r.end, h))
      .reduce((acc, r) => acc + hourlyRate(r.s, config), 0)
  );
  const totalSales = HOURS.reduce((acc, h) => acc + (salesByHour.get(h) ?? 0), 0);
  const totalLabour = labourPerHour.reduce((a, b) => a + b, 0);

  const save = saveHourlySales.bind(null, dateISO);
  const baseQS = `period=${toISODate(period.start)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Man Power Plan"
        title="Coverage per Jam"
        description="Siapa bertugas di jam berapa, plus Labour% per jam dari sales harian."
        actions={
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-zinc-950/5">
            <Link
              href={`/coverage?period=${toISODate(prevPeriod.start)}&week=0&day=0`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              ←
            </Link>
            <span className="px-2 text-sm font-semibold">
              {formatShort(period.start)} – {formatShort(addDays(period.end, -1))}
            </span>
            <Link
              href={`/coverage?period=${toISODate(nextPeriod.start)}&week=0&day=0`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              →
            </Link>
          </div>
        }
      />

      <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950 ring-1 ring-indigo-100">
        <p className="font-semibold">ℹ️ Apa gunanya halaman ini?</p>
        <p className="mt-1 leading-relaxed">
          Ini <b>man power plan per jam</b> (pengganti tab WEEK1–WEEK6 di spreadsheet). Grid di
          bawah menunjukkan <b>siapa yang bertugas di tiap jam</b> berdasarkan jadwal yang sudah
          kamu buat di halaman Jadwal. Cara pakai: <b>1)</b> pilih Minggu, <b>2)</b> pilih Hari,{" "}
          <b>3)</b> lihat baris MPP — kalau ada angka merah berarti jam itu tidak ada yang jaga,{" "}
          <b>4)</b> isi penjualan per jam di baris &quot;Sales / jam&quot; lalu klik Simpan — Labour%
          per jam langsung terhitung (merah bila di atas 15%).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {weeks.map((w) => (
          <Link
            key={w.index}
            href={`/coverage?${baseQS}&week=${w.index}&day=0`}
            className={`rounded px-3 py-1 ${
              w.index === weekIndex ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white hover:bg-zinc-100"
            }`}
          >
            Minggu {w.index + 1}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {currentWeek.dates.map((d, i) => (
          <Link
            key={toISODate(d)}
            href={`/coverage?${baseQS}&week=${weekIndex}&day=${i}`}
            className={`rounded px-3 py-1 ${
              i === dayIndex ? "bg-blue-600 text-white" : "border border-zinc-300 bg-white hover:bg-zinc-100"
            }`}
          >
            {dayName(d)} {formatShort(d)}
          </Link>
        ))}
      </div>

      <form action={save}>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                <th className="sticky left-0 bg-zinc-50 px-3 py-2">
                  {dayName(date)} {formatShort(date)}
                </th>
                <th className="px-2 py-2">Shift</th>
                {HOURS.map((h) => (
                  <th key={h} className="px-1 py-2 text-center font-normal text-zinc-500">
                    {h}:00
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dutyRows.map(({ s, code, start, end }) => (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                  <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-1.5 font-medium">
                    {s.nama} <span className="text-zinc-400">({s.tipe})</span>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{code}</td>
                  {HOURS.map((h) => (
                    <td key={h} className="px-0.5 py-1.5">
                      {onDutyAtHour(start, end, h) ? (
                        <div
                          className={`h-4 w-full rounded-sm ${s.tipe === "FT" ? "bg-blue-500" : "bg-green-500"}`}
                        />
                      ) : (
                        <div className="h-4 w-full" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {dutyRows.length === 0 && (
                <tr>
                  <td colSpan={2 + HOURS.length} className="px-3 py-6 text-center text-zinc-400">
                    Belum ada shift terjadwal di hari ini. Isi dulu di halaman Jadwal.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50 font-medium">
                <td className="sticky left-0 bg-zinc-50 px-3 py-1.5" colSpan={2}>
                  MPP (orang bertugas)
                </td>
                {mpp.map((n, i) => (
                  <td
                    key={HOURS[i]}
                    className={`px-1 py-1.5 text-center ${n === 0 ? "bg-red-100 text-red-700" : ""}`}
                  >
                    {n}
                  </td>
                ))}
              </tr>
              <tr className="bg-zinc-50">
                <td className="sticky left-0 bg-zinc-50 px-3 py-1.5 font-medium" colSpan={2}>
                  Sales / jam (input manual)
                </td>
                {HOURS.map((h) => (
                  <td key={h} className="px-0.5 py-1.5">
                    <input
                      name={`sales_${h}`}
                      type="number"
                      defaultValue={salesByHour.get(h) ?? ""}
                      placeholder="0"
                      className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-right text-[10px]"
                    />
                  </td>
                ))}
              </tr>
              <tr className="bg-zinc-50">
                <td className="sticky left-0 bg-zinc-50 px-3 py-1.5 font-medium" colSpan={2}>
                  Labour / jam
                </td>
                {labourPerHour.map((c, i) => (
                  <td key={HOURS[i]} className="px-1 py-1.5 text-center whitespace-nowrap text-zinc-600">
                    {c > 0 ? formatRupiah(c) : "-"}
                  </td>
                ))}
              </tr>
              <tr className="bg-zinc-50">
                <td className="sticky left-0 bg-zinc-50 px-3 py-1.5 font-medium" colSpan={2}>
                  Labour %
                </td>
                {HOURS.map((h, i) => {
                  const sales = salesByHour.get(h) ?? 0;
                  const pct = sales > 0 ? (labourPerHour[i] / sales) * 100 : null;
                  return (
                    <td
                      key={h}
                      className={`px-1 py-1.5 text-center ${pct !== null && pct > 15 ? "text-red-600 font-semibold" : "text-zinc-600"}`}
                    >
                      {pct !== null ? `${pct.toFixed(1)}%` : "-"}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <SaveSalesButton />
          <span className="text-zinc-600">
            Total sales: <b>{formatRupiah(totalSales)}</b> · Total labour:{" "}
            <b>{formatRupiah(totalLabour)}</b>
            {totalSales > 0 && (
              <>
                {" "}
                · Labour%: <b>{((totalLabour / totalSales) * 100).toFixed(1)}%</b>
              </>
            )}
          </span>
        </div>
      </form>

      <p className="text-xs text-zinc-500">
        Blok biru = FT, hijau = PT (dihitung dari jam mulai/selesai kode shift di halaman Jadwal).
        MPP merah = tidak ada yang bertugas pada jam itu.
      </p>
    </div>
  );
}
