import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[#F5B921]"
      />
    </label>
  );
}

export function Notice({ kind, message }: { kind: "ok" | "err"; message: string }) {
  return (
    <div
      className={`rounded-xl px-4 py-2.5 text-sm mb-4 ${
        kind === "ok"
          ? "border border-gold/40 bg-gold/10 text-gold-soft"
          : "border border-red-400/50 bg-red-400/10 text-red-200"
      }`}
    >
      {message}
    </div>
  );
}

/** Local YYYY-MM-DD (no UTC shifting — event days are venue-local). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
