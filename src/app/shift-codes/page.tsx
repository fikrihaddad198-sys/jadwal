import { prisma } from "@/lib/prisma";
import { createShiftCode, updateShiftCode, deleteShiftCode } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["FT", "PT", "OFF", "HOLIDAY", "MEETING"] as const;

export default async function ShiftCodesPage() {
  const shiftCodes = await prisma.shiftCode.findMany({
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Kode Shift</h1>

      <form
        action={createShiftCode}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <Field label="Kode" name="code" placeholder="mis. PT8" required />
        <Field label="Mulai" name="startTime" placeholder="08:00" />
        <Field label="Selesai" name="endTime" placeholder="12:00" />
        <Field label="Jam" name="hours" type="number" step="0.25" placeholder="4" />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Kategori</label>
          <select name="category" className="rounded border border-zinc-300 px-2 py-1 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
        >
          Tambah Kode
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Mulai</th>
              <th className="px-3 py-2">Selesai</th>
              <th className="px-3 py-2">Jam</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {shiftCodes.map((sc) => {
              const update = updateShiftCode.bind(null, sc.id);
              const del = deleteShiftCode.bind(null, sc.id);
              return (
                <tr key={sc.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2" colSpan={5}>
                    <form action={update} className="flex flex-wrap items-center gap-2">
                      <input
                        name="code"
                        defaultValue={sc.code}
                        className="w-24 rounded border border-zinc-300 px-2 py-1"
                      />
                      <input
                        name="startTime"
                        defaultValue={sc.startTime ?? ""}
                        className="w-20 rounded border border-zinc-300 px-2 py-1"
                      />
                      <input
                        name="endTime"
                        defaultValue={sc.endTime ?? ""}
                        className="w-20 rounded border border-zinc-300 px-2 py-1"
                      />
                      <input
                        name="hours"
                        type="number"
                        step="0.25"
                        defaultValue={sc.hours}
                        className="w-16 rounded border border-zinc-300 px-2 py-1"
                      />
                      <select
                        name="category"
                        defaultValue={sc.category}
                        className="rounded border border-zinc-300 px-2 py-1"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Simpan
                      </button>
                    </form>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={del}>
                      <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                        Hapus
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {shiftCodes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-400">
                  Belum ada kode shift.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        placeholder={placeholder}
        required={required}
        className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
      />
    </div>
  );
}
