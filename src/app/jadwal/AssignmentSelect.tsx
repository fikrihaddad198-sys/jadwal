"use client";

import { useTransition } from "react";
import { setAssignment } from "./actions";

type ShiftOption = { id: string; code: string };

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

  return (
    <select
      defaultValue={currentShiftCodeId ?? ""}
      disabled={isPending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          try {
            await setAssignment(staffId, dateISO, value);
          } catch (err) {
            alert(`Gagal menyimpan shift: ${err instanceof Error ? err.message : String(err)}`);
          }
        });
      }}
      className="w-full min-w-[5.5rem] rounded border border-zinc-300 bg-white px-1 py-1 text-xs disabled:opacity-50"
    >
      <option value="">-</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.code}
        </option>
      ))}
    </select>
  );
}
