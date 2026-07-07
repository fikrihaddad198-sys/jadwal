import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { getPeriodForDate } from "@/lib/period";
import { labourCostFor, formatRupiah } from "@/lib/labour";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [staffCount, activeStaff, shiftCodeCount, config] = await Promise.all([
    prisma.staff.count(),
    prisma.staff.findMany({ where: { aktif: true } }),
    prisma.shiftCode.count(),
    getConfig(),
  ]);

  const period = getPeriodForDate(new Date(), config.periodeMulaiTgl, config.periodeSelesaiTgl);
  const assignments = await prisma.assignment.findMany({
    where: {
      staffId: { in: activeStaff.map((s) => s.id) },
      date: { gte: period.start, lt: period.end },
    },
    include: { shiftCode: true },
  });
  const staffById = new Map(activeStaff.map((s) => [s.id, s]));
  const labourCostPeriode = assignments.reduce((acc, a) => {
    const s = staffById.get(a.staffId);
    return s ? acc + labourCostFor(s, a.shiftCode.hours, config) : acc;
  }, 0);

  const cards = [
    { label: "Staff Aktif", value: `${activeStaff.length} / ${staffCount}`, href: "/staff" },
    { label: "Kode Shift", value: shiftCodeCount, href: "/shift-codes" },
    { label: "Target Jam PT / Periode", value: config.targetJamPT, href: "/config" },
    { label: "Labour Cost Periode Ini", value: `Rp ${formatRupiah(labourCostPeriode)}`, href: "/gaji" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">Kelola jadwal shift staff.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-400"
          >
            <div className="text-xs text-zinc-500">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold">{c.value}</div>
          </Link>
        ))}
      </div>

      <Link
        href="/jadwal"
        className="rounded-lg bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-zinc-700 sm:w-fit"
      >
        Buka Jadwal Minggu Ini →
      </Link>
    </div>
  );
}
