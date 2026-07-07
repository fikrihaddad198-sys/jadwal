import { getConfig } from "@/lib/config";
import { updateConfig } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const config = await getConfig();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pengaturan</h1>
      <form
        action={updateConfig}
        className="grid max-w-xl grid-cols-2 gap-4 rounded-lg border border-zinc-200 bg-white p-6"
      >
        <NumberField
          label="Target Jam PT / periode"
          name="targetJamPT"
          defaultValue={config.targetJamPT}
        />
        <NumberField
          label="Tanggal Mulai Periode"
          name="periodeMulaiTgl"
          defaultValue={config.periodeMulaiTgl}
        />
        <NumberField
          label="Tanggal Selesai Periode"
          name="periodeSelesaiTgl"
          defaultValue={config.periodeSelesaiTgl}
        />
        <NumberField
          label="Libur Min / Minggu"
          name="liburMinMinggu"
          defaultValue={config.liburMinMinggu}
        />
        <NumberField
          label="Libur Max / Minggu"
          name="liburMaxMinggu"
          defaultValue={config.liburMaxMinggu}
        />
        <NumberField
          label="Libur Harian Min (orang)"
          name="liburHarianMin"
          defaultValue={config.liburHarianMin}
        />
        <NumberField
          label="Libur Harian Max (orang)"
          name="liburHarianMax"
          defaultValue={config.liburHarianMax}
        />
        <div className="col-span-2 mt-2">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        name={name}
        type="number"
        step="any"
        defaultValue={defaultValue}
        className="rounded border border-zinc-300 px-2 py-1"
      />
    </label>
  );
}
