import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/labour";
import { PageHeader } from "../PageHeader";
import { createStaff, updateStaff, toggleAktif, deleteStaff } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await prisma.staff.findMany({
    orderBy: [{ aktif: "desc" }, { tipe: "asc" }, { nama: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Tim"
        title="Staff"
        description="Kelola daftar staff, tipe FT/PT, gaji bulanan, dan rate per jam."
      />

      <form
        action={createStaff}
        className="flex flex-wrap items-end gap-3 rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5 p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Nama</label>
          <input
            name="nama"
            required
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
            placeholder="Nama panggilan"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Nama Lengkap</label>
          <input
            name="namaLengkap"
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
            placeholder="Opsional"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Tipe</label>
          <select name="tipe" className="rounded border border-zinc-300 px-2 py-1 text-sm">
            <option value="PT">PT</option>
            <option value="FT">FT</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Gaji Bulanan (FT)</label>
          <input
            name="gajiBulanan"
            type="number"
            className="w-32 rounded border border-zinc-300 px-2 py-1 text-sm"
            placeholder="7326920"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Rate / Jam (PT)</label>
          <input
            name="rateHourly"
            type="number"
            className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
            placeholder="45475"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
        >
          Tambah Staff
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
              <th className="px-3 py-2">Data Staff</th>
              <th className="px-3 py-2 text-right">Gaji / Rate</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const update = updateStaff.bind(null, s.id);
              const toggle = toggleAktif.bind(null, s.id, !s.aktif);
              const del = deleteStaff.bind(null, s.id);
              return (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2">
                    <form action={update} className="flex flex-wrap items-center gap-2">
                      <input
                        name="nama"
                        defaultValue={s.nama}
                        className="w-28 rounded border border-zinc-300 px-2 py-1"
                      />
                      <input
                        name="namaLengkap"
                        defaultValue={s.namaLengkap ?? ""}
                        placeholder="Nama lengkap"
                        className="w-44 rounded border border-zinc-300 px-2 py-1"
                      />
                      <select
                        name="tipe"
                        defaultValue={s.tipe}
                        className="rounded border border-zinc-300 px-2 py-1"
                      >
                        <option value="PT">PT</option>
                        <option value="FT">FT</option>
                      </select>
                      <input
                        name="gajiBulanan"
                        type="number"
                        defaultValue={s.gajiBulanan ?? ""}
                        placeholder="Gaji bulanan"
                        className="w-28 rounded border border-zinc-300 px-2 py-1"
                      />
                      <input
                        name="rateHourly"
                        type="number"
                        defaultValue={s.rateHourly ?? ""}
                        placeholder="Rate/jam"
                        className="w-24 rounded border border-zinc-300 px-2 py-1"
                      />
                      <button
                        type="submit"
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Simpan
                      </button>
                    </form>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-zinc-600">
                    {s.tipe === "FT"
                      ? s.gajiBulanan
                        ? `${formatRupiah(s.gajiBulanan)} / bln`
                        : "-"
                      : s.rateHourly
                        ? `${formatRupiah(s.rateHourly)} / jam`
                        : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {s.aktif ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <form action={toggle}>
                        <button className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                          {s.aktif ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </form>
                      <form action={del}>
                        <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          Hapus
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">
                  Belum ada staff.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
