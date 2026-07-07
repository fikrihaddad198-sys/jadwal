"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/jadwal", label: "Jadwal", icon: "🗓️" },
  { href: "/coverage", label: "Coverage", icon: "⏰" },
  { href: "/gaji", label: "Gaji", icon: "💰" },
  { href: "/staff", label: "Staff", icon: "👥" },
  { href: "/shift-codes", label: "Kode Shift", icon: "🏷️" },
  { href: "/config", label: "Pengaturan", icon: "⚙️" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              active
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <span className="text-xs">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
