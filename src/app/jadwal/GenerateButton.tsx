"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateWeekSchedule } from "./actions";

export function GenerateButton({
  periodStartISO,
  weekIndex,
}: {
  periodStartISO: string;
  weekIndex: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {status && (
        <span className={`text-xs ${status.ok ? "text-green-700" : "text-red-600"}`}>
          {status.text}
        </span>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            !confirm(
              `Generate jadwal Minggu ${weekIndex + 1}? Jadwal yang sudah ada di minggu ini akan ditimpa.`
            )
          )
            return;
          setStatus(null);
          startTransition(async () => {
            try {
              const result = await generateWeekSchedule(periodStartISO, weekIndex);
              if (result?.ok) {
                setStatus({ ok: true, text: `✓ ${result.count} shift dibuat` });
                router.refresh();
              } else {
                setStatus({ ok: false, text: `Gagal: ${result?.error ?? "error tidak diketahui"}` });
              }
            } catch (e) {
              setStatus({ ok: false, text: `Gagal: ${e instanceof Error ? e.message : String(e)}` });
            }
          });
        }}
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {isPending ? "Membuat jadwal..." : "⚡ Generate Minggu Ini"}
      </button>
    </div>
  );
}
