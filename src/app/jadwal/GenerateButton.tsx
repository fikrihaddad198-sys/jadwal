"use client";

import { useTransition } from "react";
import { generateWeekSchedule } from "./actions";

export function GenerateButton({
  periodStartISO,
  weekIndex,
}: {
  periodStartISO: string;
  weekIndex: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
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
        startTransition(() => {
          generateWeekSchedule(periodStartISO, weekIndex);
        });
      }}
      className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
    >
      {isPending ? "Membuat jadwal..." : "⚡ Generate Minggu Ini"}
    </button>
  );
}
