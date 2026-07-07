import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [staffCount, activeStaffCount, shiftCodeCount, config] = await Promise.all([
    prisma.staff.count(),
    prisma.staff.count({ where: { aktif: true } }),
    prisma.shiftCode.count(),
    getConfig(),
  ]);

  const cards = [
    { label: "Staff Aktif", value: `${activeStaffCount} / ${staffCount}`, href: "/staff" },
    { label: "Kode Shift", value: shiftCodeCount, href: "/shift-codes" },
    { label: "Target Jam PT / Periode", value: config.targetJamPT, href: "/config" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">Kelola jadwal shift staff.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
