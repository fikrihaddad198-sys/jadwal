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
import { PageHeader } from "../PageHeader";

export const dynamic = "force-dynamic";

type SearchParams = { period?: string };

export default async function ValidasiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const config = await getConfig();

  const refDate = params.period ? new Date(params.period) : new Date();
  const period = getPeriodForDate(refDate, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const weeks = getWeeksInPeriod(period);

  const [staff, assignments] = await Promise.all([
    prisma.staff.findMany({ where: { aktif: true }, orderBy: [{ tipe: "asc" }, { nama: "asc" }] }),
    prisma.assignment.findMany({
      where: { date: { gte: period.start, lt: period.end } },
      include: { shiftCode: { select: { category: true, hours: true } } },
    }),
  ]);

  // key: `${staffId}|${iso}` -> { off, hours }
  const byCell = new Map<string, { off: boolean; hours: number }>();
  for (const a of assignments) {
    byCell.set(`${a.staffId}|${toISODate(a.date)}`, {
      off: a.shiftCode.category === "OFF",
      hours: a.shiftCode.category === "PT" || a.shiftCode.category === "FT" ? a.shiftCode.hours : 0,
    });
  }

  // Matriks libur per staff per minggu
  const matrix = staff.map((s) => {
    const perWeek = weeks.map((w) => {
      let off = 0;
      let filled = 0;
      for (const d of w.dates) {
        const cell = byCell.get(`${s.id}|${toISODate(d)}`);
        if (!cell) continue;
        filled++;
        if (cell.off) off++;
      }
      // minggu pendek di ujung periode tidak dipaksa 2 libur
      const enforced = w.dates.length === 7 && filled > 0;
      const ok = !enforced || (off >= config.liburMinMinggu && off <= config.liburMaxMinggu);
      return { off, filled, enforced, ok };
    });
    const totalOff = perWeek.reduce((acc, w) => acc + w.off, 0);
    return { s, perWeek, totalOff };
  });

  // Libur per hari (semua staff)
  const perDay = weeks.flatMap((w) =>
    w.dates.map((d) => {
      const iso = toISODate(d);
      let off = 0;
      let filled = 0;
      for (const s of staff) {
        const cell = byCell.get(`${s.id}|${iso}`);
        if (!cell) continue;
        filled++;
        if (cell.off) off++;
      }
      const ok = filled === 0 || (off >= config.liburHarianMin && off <= config.liburHarianMax);
      return { d, iso, weekIndex: w.index, off, filled, ok };
    })
  );

  // Jam PT vs target
  const ptRows = staff
    .filter((s) => s.tipe === "PT")
    .map((s) => {
      let jam = 0;
      for (const w of weeks) {
        for (const d of w.dates) {
          jam += byCell.get(`${s.id}|${toISODate(d)}`)?.hours ?? 0;
        }
      }
      return { s, jam, sisa: config.targetJamPT - jam };
    });

  const weekViolations = matrix.reduce(
    (acc, r) => acc + r.perWeek.filter((w) => !w.ok).length,
    0
  );
  const dayViolations = perDay.filter((p) => !p.ok).length;
  const allOk = weekViolations === 0 && dayViolations === 0;

  const prevPeriod = shiftPeriod(period, -1, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const nextPeriod = shiftPeriod(period, 1, config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const periodLabel = `${formatShort(period.start)} – ${formatShort(addDays(period.end, -1))}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Check Libur"
        title="Validasi Libur"
        description={`Aturan: tiap anak libur ${config.liburMinMinggu}–${config.liburMaxMinggu}× per minggu, dan tiap hari ${config.liburHarianMin}–${config.liburHarianMax} anak libur.`}
        actions={
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-zinc-950/5">
            <Link
              href={`/validasi?period=${toISODate(prevPeriod.start)}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              ←
            </Link>
            <span className="px-2 text-sm font-semibold">{periodLabel}</span>
            <Link
              href={`/validasi?period=${toISODate(nextPeriod.start)}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              →
            </Link>
          </div>
        }
      />

      <div
        className={`rounded-xl p-4 text-sm ring-1 ${
          allOk
            ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
            : "bg-red-50 text-red-900 ring-red-100"
        }`}
      >
        {allOk ? (
          <p>
            <b>✓ Semua aturan libur terpenuhi.</b> Lanjut atur man power plan per jam di halaman
            Coverage.
          </p>
        ) : (
          <p>
            <b>
              ✗ {weekViolations + dayViolations} pelanggaran
            </b>{" "}
            — {weekViolations} di libur per minggu, {dayViolations} di libur per hari. Sel merah di
            bawah menunjukkan lokasinya; perbaiki di halaman{" "}
            <Link href={`/jadwal?period=${toISODate(period.start)}`} className="underline">
              Jadwal
            </Link>
            .
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">
          Libur per anak per minggu
        </h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                <th className="sticky left-0 bg-zinc-50 px-3 py-2">Nama</th>
                <th className="px-2 py-2">Tipe</th>
                {weeks.map((w) => (
                  <th key={w.index} className="px-2 py-2 text-center">
                    Minggu {w.index + 1}
                    <div className="font-normal text-zinc-400">
                      {formatShort(w.dates[0])}–{formatShort(w.dates[w.dates.length - 1])}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ s, perWeek, totalOff }) => (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                  <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-1.5 font-medium">
                    {s.nama}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-500">{s.tipe}</td>
                  {perWeek.map((w, i) => (
                    <td key={i} className="px-2 py-1.5 text-center">
                      {w.filled === 0 ? (
                        <span className="text-zinc-300">–</span>
                      ) : (
                        <span
                          className={`inline-block min-w-6 rounded px-1.5 py-0.5 font-semibold ${
                            !w.ok
                              ? "bg-red-100 text-red-700"
                              : w.enforced
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500"
                          }`}
                          title={
                            w.enforced
                              ? undefined
                              : "Minggu pendek / belum lengkap: aturan tidak dipaksakan"
                          }
                        >
                          {w.off}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center font-medium">{totalOff}</td>
                </tr>
              ))}
              {matrix.length === 0 && (
                <tr>
                  <td colSpan={3 + weeks.length} className="px-3 py-6 text-center text-zinc-400">
                    Belum ada staff aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          Angka = jumlah hari libur di minggu itu. Abu-abu = minggu pendek di ujung periode atau
          jadwal belum diisi (tidak divalidasi).
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">Anak libur per hari</h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5 p-3">
          <div className="flex flex-col gap-3">
            {weeks.map((w) => (
              <div key={w.index} className="flex items-center gap-1.5">
                <span className="w-16 shrink-0 text-[11px] font-semibold text-zinc-500">
                  Minggu {w.index + 1}
                </span>
                {perDay
                  .filter((p) => p.weekIndex === w.index)
                  .map((p) => (
                    <div
                      key={p.iso}
                      className={`flex w-14 flex-col items-center rounded-lg px-1 py-1.5 ring-1 ${
                        p.filled === 0
                          ? "bg-zinc-50 text-zinc-400 ring-zinc-100"
                          : p.ok
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                            : "bg-red-50 text-red-700 ring-red-200"
                      }`}
                      title={`${dayName(p.d)} ${formatShort(p.d)}: ${p.off} anak libur`}
                    >
                      <span className="text-[10px]">{dayName(p.d).slice(0, 3)}</span>
                      <span className="text-[10px] text-zinc-400">{formatShort(p.d)}</span>
                      <span className="text-sm font-bold">{p.filled === 0 ? "–" : p.off}</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          Angka = jumlah anak yang libur pada hari itu. Merah bila di luar{" "}
          {config.liburHarianMin}–{config.liburHarianMax}.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">
          Jam PT vs target ({config.targetJamPT} jam / periode)
        </h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                <th className="px-3 py-2">Nama</th>
                <th className="px-2 py-2 text-right">Total Jam</th>
                <th className="px-2 py-2 text-right">Sisa ke Target</th>
                <th className="px-2 py-2">Progres</th>
              </tr>
            </thead>
            <tbody>
              {ptRows.map(({ s, jam, sisa }) => {
                const pct = Math.min((jam / config.targetJamPT) * 100, 100);
                return (
                  <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                    <td className="whitespace-nowrap px-3 py-1.5 font-medium">{s.nama}</td>
                    <td className="px-2 py-1.5 text-right">{jam}</td>
                    <td
                      className={`px-2 py-1.5 text-right ${
                        sisa <= 0 ? "text-emerald-600" : "text-zinc-600"
                      }`}
                    >
                      {sisa <= 0 ? "✓ tercapai" : `${sisa} jam lagi`}
                    </td>
                    <td className="w-1/3 px-2 py-1.5">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full ${
                            sisa <= 0 ? "bg-emerald-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {ptRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">
                    Belum ada staff PT aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
