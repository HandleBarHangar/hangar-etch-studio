import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { adminCall } from "../../lib/api";
import { Field, Notice, Toggle, fmtTime, toLocalDateString } from "../common";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AdminEvent = any;
type CatalogItem = any;

interface OfferDraft {
  item_id: string;
  offered: boolean;
  quota: string; // keep as string for the input; "" = unlimited
}

function guestUrl(slug: string): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return `${base}?event=${encodeURIComponent(slug)}`;
}

export default function EventsTab({ passcode }: { passcode: string }) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [editing, setEditing] = useState<AdminEvent | "new" | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, items] = await Promise.all([
        adminCall<{ events: AdminEvent[] }>(passcode, "events_list"),
        adminCall<{ items: CatalogItem[] }>(passcode, "items_list"),
      ]);
      if (ev.ok) setEvents(ev.events ?? []);
      if (items.ok) setCatalog((items.items ?? []).filter((i: CatalogItem) => i.active));
    } catch {
      setNotice({ kind: "err", message: "Couldn't load events." });
    } finally {
      setLoading(false);
    }
  }, [passcode]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, AdminEvent[]>();
    for (const e of events) {
      const list = map.get(e.event_date) ?? [];
      list.push(e);
      map.set(e.event_date, list);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const today = toLocalDateString(new Date());
    return events.filter((e) => e.event_date >= today).slice(0, 10);
  }, [events]);

  // Calendar grid for the shown month.
  const weeks = useMemo(() => {
    const first = new Date(month);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [month]);

  const monthLabel = month.toLocaleDateString([], { month: "long", year: "numeric" });
  const todayStr = toLocalDateString(new Date());

  return (
    <div>
      {notice && <Notice {...notice} />}

      <div className="card p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button className="chip" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            ←
          </button>
          <h2 className="headline text-2xl">{monthLabel}</h2>
          <button className="chip" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            →
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.map((d) => {
            const ds = toLocalDateString(d);
            const inMonth = d.getMonth() === month.getMonth();
            const dayEvents = byDay.get(ds) ?? [];
            return (
              <div
                key={ds}
                className={`min-h-[64px] rounded-lg p-1 text-xs border ${
                  inMonth ? "border-white/5 bg-navy-deep/40" : "border-transparent opacity-30"
                } ${ds === todayStr ? "ring-1 ring-gold/60" : ""}`}
              >
                <div className="text-muted">{d.getDate()}</div>
                {dayEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEditing(e)}
                    className={`block w-full truncate text-left rounded px-1 py-0.5 mt-0.5 ${
                      e.is_active ? "bg-gold/20 text-gold-soft" : "bg-white/5 text-muted line-through"
                    }`}
                    title={e.name}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="headline text-xl">Upcoming</h3>
        <button className="btn-secondary !text-base !py-2" onClick={() => setEditing("new")}>
          + New Event
        </button>
      </div>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-muted text-sm">No upcoming events — create one to generate its QR link.</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-6">
          {upcoming.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => setEditing(e)}
                className="card w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left hover:border-gold/40"
              >
                <span>
                  <span className="font-semibold">{e.name}</span>
                  {!e.is_active && <span className="text-muted text-xs ml-2">(inactive)</span>}
                  <span className="block text-sm text-muted">
                    {e.event_date}
                    {e.starts_at ? ` · ${fmtTime(e.starts_at)}` : ""}
                    {e.ends_at ? `–${fmtTime(e.ends_at)}` : ""}
                  </span>
                </span>
                <span className="text-sm text-muted">
                  {e.total_orders ?? 0} orders ·{" "}
                  {(e.etch_event_items ?? [])
                    .filter((ei: any) => ei.active)
                    .map((ei: any) =>
                      `${ei.etch_items?.label ?? "?"} ${ei.sold}${ei.quota_total !== null ? `/${ei.quota_total}` : ""}`,
                    )
                    .join(" · ") || "no items"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EventEditor
          passcode={passcode}
          event={editing === "new" ? null : editing}
          catalog={catalog}
          onClose={(changed) => {
            setEditing(null);
            if (changed) void load();
          }}
        />
      )}
    </div>
  );
}

function EventEditor({
  passcode,
  event,
  catalog,
  onClose,
}: {
  passcode: string;
  event: AdminEvent | null;
  catalog: CatalogItem[];
  onClose: (changed: boolean) => void;
}) {
  const [name, setName] = useState(event?.name ?? "");
  const [date, setDate] = useState(event?.event_date ?? toLocalDateString(new Date()));
  const [startTime, setStartTime] = useState(event?.starts_at ? isoToTime(event.starts_at) : "");
  const [endTime, setEndTime] = useState(event?.ends_at ? isoToTime(event.ends_at) : "");
  const [active, setActive] = useState<boolean>(event?.is_active ?? true);
  const [maxPer, setMaxPer] = useState<string>(event?.max_items_per_person?.toString() ?? "1");
  const [revisions, setRevisions] = useState<string>(event?.max_revisions?.toString() ?? "3");
  const [captureContact, setCaptureContact] = useState<boolean>(event?.capture_contact ?? false);
  const [captureName, setCaptureName] = useState<boolean>(event?.capture_name ?? true);
  const [captureEmail, setCaptureEmail] = useState<boolean>(event?.capture_email ?? true);
  const [capturePhone, setCapturePhone] = useState<boolean>(event?.capture_phone ?? false);
  const [requireEmail, setRequireEmail] = useState<boolean>(event?.require_email ?? true);
  const [caricature, setCaricature] = useState<boolean>(event?.caricature_enabled ?? true);
  const [gallery, setGallery] = useState<boolean>(event?.gallery_enabled ?? true);
  const [clientName, setClientName] = useState(event?.cobrand_client_name ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(event?.cobrand_logo_url ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [offers, setOffers] = useState<OfferDraft[]>(() =>
    catalog.map((c) => {
      const existing = (event?.etch_event_items ?? []).find(
        (ei: any) => ei.item_id === c.id && ei.active,
      );
      return {
        item_id: c.id,
        offered: !!existing,
        quota: existing?.quota_total?.toString() ?? "",
      };
    }),
  );
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (event?.slug) {
      QRCode.toDataURL(guestUrl(event.slug), {
        margin: 1,
        width: 480,
        color: { dark: "#06173A", light: "#FFFFFF" },
      })
        .then(setQr)
        .catch(() => setQr(null));
    }
  }, [event?.slug]);

  const save = async () => {
    if (!name.trim() || !date) {
      setErr("Name and date are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const fields = {
        name: name.trim(),
        event_date: date,
        starts_at: startTime ? new Date(`${date}T${startTime}`).toISOString() : null,
        ends_at: endTime ? new Date(`${date}T${endTime}`).toISOString() : null,
        is_active: active,
        max_items_per_person: maxPer.trim() === "" ? null : Number(maxPer),
        max_revisions: Number(revisions) || 3,
        capture_contact: captureContact,
        capture_name: captureName,
        capture_email: captureEmail,
        capture_phone: capturePhone,
        require_email: requireEmail,
        caricature_enabled: caricature,
        gallery_enabled: gallery,
        cobrand_client_name: clientName.trim() || null,
      };
      const items = offers
        .filter((o) => o.offered)
        .map((o) => ({ item_id: o.item_id, quota_total: o.quota.trim() === "" ? null : Number(o.quota) }));

      let eventId = event?.id as string | undefined;
      if (!eventId) {
        const res = await adminCall<{ event: AdminEvent }>(passcode, "event_create", { ...fields, items });
        if (!res.ok) throw new Error(res.error);
        eventId = res.event.id;
      } else {
        const res = await adminCall(passcode, "event_update", { id: eventId, ...fields });
        if (!res.ok) throw new Error(res.error);
        const itemsRes = await adminCall(passcode, "event_items_set", { event_id: eventId, items });
        if (!itemsRes.ok) throw new Error(itemsRes.error);
      }

      if (logoFile && eventId) {
        const b64 = await fileToBase64(logoFile);
        const up = await adminCall(passcode, "branding_upload", {
          event_id: eventId,
          filename: logoFile.name,
          content_type: logoFile.type,
          content_base64: b64,
        });
        if (!up.ok) throw new Error(up.error);
      }
      onClose(true);
    } catch (e) {
      setErr(`Save failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    if (!event?.id) return;
    setBusy(true);
    try {
      const res = await adminCall(passcode, "event_duplicate", { id: event.id });
      if (!res.ok) throw new Error(res.error);
      onClose(true);
    } catch (e) {
      setErr(`Duplicate failed: ${e instanceof Error ? e.message : "unknown"}`);
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!event?.slug) return;
    await navigator.clipboard.writeText(guestUrl(event.slug));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-40 bg-navy-deep/80 backdrop-blur-sm overflow-y-auto p-4">
      <div className="card max-w-2xl mx-auto my-6 p-6 flex flex-col gap-5 bg-navy">
        <div className="flex items-center justify-between">
          <h3 className="headline text-2xl">{event ? "Edit Event" : "New Event"}</h3>
          <button className="chip" onClick={() => onClose(false)}>Close</button>
        </div>
        {err && <Notice kind="err" message={err} />}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Event name">
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Date">
            <input className="input-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Start time">
            <input className="input-field" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="End time">
            <input className="input-field" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>

        <div className="border-t border-white/10 pt-4">
          <h4 className="headline text-lg mb-2">Items offered + advance quotas</h4>
          <div className="flex flex-col gap-2">
            {offers.map((o) => {
              const item = catalog.find((c) => c.id === o.item_id);
              return (
                <div key={o.item_id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={o.offered}
                    onChange={(e) =>
                      setOffers((os) =>
                        os.map((x) => (x.item_id === o.item_id ? { ...x, offered: e.target.checked } : x)),
                      )
                    }
                    className="h-5 w-5 accent-[#F5B921]"
                  />
                  <span className="flex-1">
                    {item?.emoji} {item?.label}
                  </span>
                  {o.offered && (
                    <input
                      className="input-field !w-28 !py-2"
                      type="number"
                      min={0}
                      placeholder="Unlimited"
                      value={o.quota}
                      onChange={(e) =>
                        setOffers((os) =>
                          os.map((x) => (x.item_id === o.item_id ? { ...x, quota: e.target.value } : x)),
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
            {catalog.length === 0 && (
              <p className="text-muted text-sm">No active catalog items — add some in Item Catalog.</p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-8 border-t border-white/10 pt-4">
          <Field label="Max items per person (blank = unlimited)">
            <input className="input-field" type="number" min={0} value={maxPer} onChange={(e) => setMaxPer(e.target.value)} />
          </Field>
          <Field label="Revisions per guest">
            <input className="input-field" type="number" min={0} max={10} value={revisions} onChange={(e) => setRevisions(e.target.value)} />
          </Field>
          <div className="pt-3">
            <Toggle label="Event active" checked={active} onChange={setActive} />
            <Toggle label="Capture contact info" checked={captureContact} onChange={setCaptureContact} />
            {captureContact && (
              <div className="pl-4 border-l border-white/10">
                <Toggle label="Name" checked={captureName} onChange={setCaptureName} />
                <Toggle label="Email" checked={captureEmail} onChange={setCaptureEmail} />
                {captureEmail && <Toggle label="Require email" checked={requireEmail} onChange={setRequireEmail} />}
                <Toggle label="Phone" checked={capturePhone} onChange={setCapturePhone} />
              </div>
            )}
          </div>
          <div className="pt-3">
            <Toggle label="Crew Caricature" checked={caricature} onChange={setCaricature} />
            <Toggle label="Live gallery wall" checked={gallery} onChange={setGallery} />
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <h4 className="headline text-lg mb-2">Co-branding</h4>
          <div className="flex flex-wrap items-center gap-4">
            <Field label="Client name (for the '× Client' lockup)">
              <input className="input-field" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </Field>
            <label className="chip cursor-pointer">
              {logoFile ? logoFile.name : logoUrl ? "Replace logo" : "Upload client logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {logoUrl && !logoFile && (
              <span className="flex items-center gap-2">
                <img src={logoUrl} alt="Client logo" className="h-10 bg-white/90 rounded p-1" />
                <button
                  className="text-muted text-xs underline"
                  onClick={async () => {
                    const res = await adminCall(passcode, "branding_remove", { event_id: event!.id });
                    if (res.ok) {
                      setLogoUrl(null);
                      setClientName("");
                    }
                  }}
                >
                  remove
                </button>
              </span>
            )}
          </div>
        </div>

        {event?.slug && (
          <div className="border-t border-white/10 pt-4">
            <h4 className="headline text-lg mb-2">This event's link + QR</h4>
            <p className="text-sm text-muted break-all mb-3">{guestUrl(event.slug)}</p>
            <div className="flex items-center gap-4">
              {qr && <img src={qr} alt="Event QR" className="h-32 w-32 rounded-lg bg-white p-1" />}
              <div className="flex flex-col gap-2">
                <button className="btn-secondary !text-base !py-2" onClick={() => void copyLink()}>
                  {copied ? "Copied ✦" : "Copy link"}
                </button>
                {qr && (
                  <a className="btn-secondary !text-base !py-2 text-center" href={qr} download={`etch-${event.slug}-qr.png`}>
                    Download QR
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-end border-t border-white/10 pt-4">
          {event?.id && (
            <button className="btn-secondary !text-base" disabled={busy} onClick={() => void duplicate()}>
              Duplicate Event
            </button>
          )}
          <button className="btn-primary !text-xl" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function isoToTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",", 2)[1] ?? "");
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
