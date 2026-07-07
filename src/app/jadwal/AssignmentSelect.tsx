"use client";

import { useState, useTransition } from "react";
import { setAssignment } from "./actions";

type ShiftOption = { id: string; code: string; category: string };

const CATEGORY_STYLE: Record<string, string> = {
  FT: "bg-blue-50 border-blue-300 text-blue-900",
  PT: "bg-green-50 border-green-300 text-green-900",
  OFF: "bg-zinc-100 border-zinc-300 text-zinc-500",
  HOLIDAY: "bg-purple-50 border-purple-300 text-purple-900",
  MEETING: "bg-amber-50 border-amber-300 text-amber-900",
};

export function AssignmentSelect({
  staffId,
  dateISO,
  currentShiftCodeId,
  options,
}: {
  staffId: string;
  dateISO: string;
  currentShiftCodeId: string | null;
  options: ShiftOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(currentShiftCodeId ?? "");
  const [error, setError] = useState(false);

  const category = options.find((o) => o.id === selectedId)?.category;
  const tint = category ? CATEGORY_STYLE[category] ?? "" : "bg-white border-zinc-300";

  return (
    <select
      value={selectedId}
      disabled={isPending}
      onChange={(e) => {
        const value = e.target.value;
        setSelectedId(value);
        setError(false);
        startTransition(async () => {
          try {
            await setAssignment(staffId, dateISO, value);
          } catch {
            setError(true);
          }
        });
      }}
      title={error ? "Gagal menyimpan — coba lagi" : undefined}
      className={`w-full min-w-[5.5rem] rounded-md border px-1 py-1 text-xs font-medium disabled:opacity-50 ${
        error ? "border-red-500 bg-red-50" : tint
      }`}
    >
      <option value="">–</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.code}
        </option>
      ))}
    </select>
  );
}
