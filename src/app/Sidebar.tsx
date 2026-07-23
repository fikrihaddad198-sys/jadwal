"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◱" },
  { href: "/jadwal", label: "Jadwal", icon: "▦" },
  { href: "/coverage", label: "Coverage", icon: "◷" },
  { href: "/validasi", label: "Validasi Libur", icon: "✓" },
  { href: "/gaji", label: "Gaji", icon: "◈" },
  { href: "/staff", label: "Staff", icon: "◉" },
  { href: "/shift-codes", label: "Kode Shift", icon: "❖" },
  { href: "/config", label: "Pengaturan", icon: "✦" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-zinc-950 text-zinc-400 lg:flex">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
          J
        </span>
        <div>
          <div className="text-sm font-semibold tracking-tight text-white">Jadwal</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Shift Planner</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-indigo-400" />
              )}
              <span className={`w-4 text-center text-xs ${active ? "text-indigo-300" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[10px] leading-relaxed text-zinc-600">
        Pengganti spreadsheet jadwal
        <br />
        MPP · Labour% · Gaji PT
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-30 border-b border-zinc-200 bg-zinc-950 lg:hidden">
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500 text-xs font-bold text-white">
          J
        </span>
        <span className="text-sm font-semibold text-white">Jadwal</span>
      </div>
      <nav className="grid-scroll flex gap-1 overflow-x-auto px-3 py-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
