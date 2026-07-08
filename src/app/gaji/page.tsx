import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { getPeriodForDate, shiftPeriod, toISODate, formatShort, addDays } from "@/lib/period";
import { hourlyRate, formatRupiah } from "@/lib/labour";
import { PageHeader } from "../PageHeader";

export const dynamic = "force-dynamic";

type SearchParams = { period?: string };

export default async function GajiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const config = await getConfig();

  const refDate = params.period ? new Date(params.period) : new Date();
  const period = getPeriodForDate(refDate, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const prevPeriod = shiftPeriod(period, -1, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const nextPeriod = shiftPeriod(period, 1, config.periodeMulaiTgl, config.periodeSelesaiTgl);

  const staff = await prisma.staff.findMany({
    where: { aktif: true },
    orderBy: [{ tipe: "asc" }, { nama: "asc" }],
  });

  const assignments = await prisma.assignment.findMany({
    where: {
      staffId: { in: staff.map((s) => s.id) },
      date: { gte: period.start, lt: period.end },
    },
    include: { shiftCode: true },
  });

  const jamByStaff = new Map<string, number>();
  for (const a of assignments) {
    jamByStaff.set(a.staffId, (jamByStaff.get(a.staffId) ?? 0) + a.shiftCode.hours);
  }

  const pt = staff.filter((s) => s.tipe === "PT");
  const ft = staff.filter((s) => s.tipe === "FT");

  const ptRows = pt.map((s) => {
    const jam = jamByStaff.get(s.id) ?? 0;
    const rate = hourlyRate(s, config);
    return { s, jam, rate, gaji: jam * rate };
  });
  const totalGajiPT = ptRows.reduce((a, r) => a + r.gaji, 0);
  const totalGajiFT = ft.reduce((a, s) => a + (s.gajiBulanan ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Payroll"
        title="Rekap Gaji"
        description="Gaji PT dihitung otomatis dari total jam terjadwal × rate per jam."
        actions={
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-zinc-950/5">
            <Link
              href={`/gaji?period=${toISODate(prevPeriod.start)}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              ←
            </Link>
            <span className="px-2 text-sm font-semibold">
              {formatShort(period.start)} – {formatShort(addDays(period.end, -1))}
            </span>
            <Link
              href={`/gaji?period=${toISODate(nextPeriod.start)}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              →
            </Link>
          </div>
        }
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-600">Part Time (jam × rate)</h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2 text-right">Total Jam Periode</th>
                <th className="px-3 py-2 text-right">Rate / Jam</th>
                <th className="px-3 py-2 text-right">Gaji</th>
              </tr>
            </thead>
            <tbody>
              {ptRows.map(({ s, jam, rate, gaji }) => (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2 font-medium">
                    {s.nama}
                    {s.namaLengkap && <span className="ml-2 text-xs text-zinc-400">{s.namaLengkap}</span>}
                  </td>
                  <td className="px-3 py-2 text-right">{jam}</td>
                  <td className="px-3 py-2 text-right">{formatRupiah(rate)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatRupiah(gaji)}</td>
                </tr>
              ))}
              {ptRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">
                    Belum ada staff PT aktif.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50 font-semibold">
                <td className="px-3 py-2" colSpan={3}>
                  Total PT
                </td>
                <td className="px-3 py-2 text-right">{formatRupiah(totalGajiPT)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-600">Full Time (gaji bulanan tetap)</h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2 text-right">Jam Periode</th>
                <th className="px-3 py-2 text-right">Gaji Bulanan</th>
              </tr>
            </thead>
            <tbody>
              {ft.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2 font-medium">
                    {s.nama}
                    {s.namaLengkap && <span className="ml-2 text-xs text-zinc-400">{s.namaLengkap}</span>}
                  </td>
                  <td className="px-3 py-2 text-right">{jamByStaff.get(s.id) ?? 0}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatRupiah(s.gajiBulanan ?? 0)}</td>
                </tr>
              ))}
              {ft.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-zinc-400">
                    Belum ada staff FT aktif.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50 font-semibold">
                <td className="px-3 py-2" colSpan={2}>
                  Total FT
                </td>
                <td className="px-3 py-2 text-right">{formatRupiah(totalGajiFT)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p className="text-sm font-semibold">
        Total gaji periode ini: {formatRupiah(totalGajiPT + totalGajiFT)}
      </p>
    </div>
  );
}
