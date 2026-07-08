import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { getPeriodForDate, formatShort, addDays } from "@/lib/period";
import { labourCostFor, formatRupiah } from "@/lib/labour";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: "👥",
    title: "1. Cek Staff",
    href: "/staff",
    desc: "Pastikan daftar staff aktif, tipe FT/PT, dan gaji/rate-nya benar.",
  },
  {
    icon: "🗓️",
    title: "2. Buat Jadwal",
    href: "/jadwal",
    desc: "Ketik langsung di sel seperti di Excel, atau klik ⚡ auto per minggu lalu koreksi.",
  },
  {
    icon: "⏰",
    title: "3. Cek Coverage",
    href: "/coverage",
    desc: "Lihat siapa bertugas tiap jam dan isi sales per jam untuk hitung Labour%.",
  },
  {
    icon: "💰",
    title: "4. Rekap Gaji",
    href: "/gaji",
    desc: "Akhir periode, gaji PT terhitung otomatis dari total jam × rate.",
  },
];

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
  const totalJamPeriode = assignments.reduce((acc, a) => acc + a.shiftCode.hours, 0);

  const stats = [
    { label: "Staff Aktif", value: `${activeStaff.length}`, sub: `dari ${staffCount} total`, href: "/staff" },
    { label: "Jam Terjadwal Periode Ini", value: `${totalJamPeriode}`, sub: "jam", href: "/jadwal" },
    { label: "Labour Cost Periode Ini", value: `Rp ${formatRupiah(labourCostPeriode)}`, sub: "", href: "/gaji" },
    { label: "Kode Shift", value: `${shiftCodeCount}`, sub: "kode", href: "/shift-codes" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950 p-8 text-white shadow-lg">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-300">
            Periode berjalan
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {formatShort(period.start)} – {formatShort(addDays(period.end, -1))}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Target jam PT: <b className="text-zinc-200">{config.targetJamPT} jam</b> · Ketik jadwal
            langsung di grid seperti di Excel — tersimpan otomatis.
          </p>
          <Link
            href="/jadwal"
            className="mt-5 inline-block rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-400"
          >
            Buka Jadwal →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="text-xs text-zinc-500">{c.label}</div>
            <div className="mt-1 text-xl font-bold">{c.value}</div>
            {c.sub && <div className="text-xs text-zinc-400">{c.sub}</div>}
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Cara pakai
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5 p-4 transition-shadow hover:shadow-md"
            >
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-2 font-semibold">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
