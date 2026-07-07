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
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  const run = () => {
    setConfirming(false);
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await generateWeekSchedule(periodStartISO, weekIndex);
        if (result?.ok) {
          setStatus({ ok: true, text: `✓ Jadwal dibuat (${result.count} shift)` });
          router.refresh();
        } else {
          setStatus({ ok: false, text: `Gagal: ${result?.error ?? "error tidak diketahui"}` });
        }
      } catch (e) {
        setStatus({ ok: false, text: `Gagal: ${e instanceof Error ? e.message : String(e)}` });
      }
    });
  };

  if (isPending) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        Membuat jadwal...
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm">
        <span className="font-medium text-amber-800">
          Timpa jadwal Minggu {weekIndex + 1}?
        </span>
        <button
          type="button"
          onClick={run}
          className="rounded-md bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-500"
        >
          Ya, generate
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-zinc-700 hover:bg-zinc-50"
        >
          Batal
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {status && (
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            status.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
          }`}
        >
          {status.text}
        </span>
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
      >
        ⚡ Generate Minggu Ini
      </button>
    </span>
  );
}
