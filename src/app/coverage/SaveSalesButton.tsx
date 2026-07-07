"use client";

import { useFormStatus } from "react-dom";

export function SaveSalesButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
    >
      {pending && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      {pending ? "Menyimpan..." : "💾 Simpan Sales Hari Ini"}
    </button>
  );
}
