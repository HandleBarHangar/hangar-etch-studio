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

/**
 * 12-hour AM/PM time picker. Value in/out is 24-hour "HH:MM" (or "" = unset).
 * Venue events run evenings, so picking an hour with nothing set assumes PM.
 */
export function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = /^(\d{2}):(\d{2})$/.exec(value);
  const h24 = parsed ? Number(parsed[1]) : null;
  const minute = parsed ? parsed[2] : "00";
  const meridiem: "AM" | "PM" = h24 === null ? "PM" : h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === null ? "" : String(((h24 + 11) % 12) + 1);

  const emit = (hour12: string, min: string, mer: "AM" | "PM") => {
    if (hour12 === "") {
      onChange("");
      return;
    }
    let h = Number(hour12) % 12;
    if (mer === "PM") h += 12;
    onChange(`${String(h).padStart(2, "0")}:${min}`);
  };

  return (
    <div className="flex gap-2">
      <select
        className="input-field !w-auto"
        value={h12}
        onChange={(e) => emit(e.target.value, minute, meridiem)}
      >
        <option value="">—</option>
        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <select
        className="input-field !w-auto"
        value={minute}
        disabled={h12 === ""}
        onChange={(e) => emit(h12, e.target.value, meridiem)}
      >
        {["00", "15", "30", "45"].map((m) => (
          <option key={m} value={m}>:{m}</option>
        ))}
      </select>
      <select
        className="input-field !w-auto"
        value={meridiem}
        disabled={h12 === ""}
        onChange={(e) => emit(h12, minute, e.target.value as "AM" | "PM")}
      >
        <option value="PM">PM</option>
        <option value="AM">AM</option>
      </select>
    </div>
  );
}
