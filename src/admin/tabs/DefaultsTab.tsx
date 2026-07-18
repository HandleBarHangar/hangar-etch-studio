import { useEffect, useState } from "react";
import { adminCall } from "../../lib/api";
import { Field, Notice, Toggle } from "../common";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Global defaults: inherited by new events, used directly by walk-up guests.
export default function DefaultsTab({ passcode }: { passcode: string }) {
  const [settings, setSettings] = useState<any>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminCall<{ settings: any }>(passcode, "settings_get").then((res) => {
      if (res.ok) setSettings(res.settings);
      else setNotice({ kind: "err", message: "Couldn't load defaults." });
    });
  }, [passcode]);

  if (!settings) return <p className="text-muted">Loading…</p>;

  const set = (key: string, value: unknown) => setSettings((s: any) => ({ ...s, [key]: value }));

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminCall(passcode, "settings_update", {
        max_revisions: Number(settings.max_revisions) || 0,
        default_max_items_per_person:
          settings.default_max_items_per_person === "" || settings.default_max_items_per_person === null
            ? null
            : Number(settings.default_max_items_per_person),
        designer_gpt_url: (settings.designer_gpt_url ?? "").trim() || null,
        capture_contact: settings.capture_contact,
        capture_name: settings.capture_name,
        capture_email: settings.capture_email,
        capture_phone: settings.capture_phone,
        require_email: settings.require_email,
        caricature_enabled: settings.caricature_enabled,
        gallery_enabled: settings.gallery_enabled,
      });
      if (!res.ok) throw new Error(res.error);
      setNotice({ kind: "ok", message: "Defaults saved. New events inherit these; walk-up guests use them now." });
    } catch (e) {
      setNotice({ kind: "err", message: `Save failed: ${e instanceof Error ? e.message : "unknown"}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg">
      {notice && <Notice {...notice} />}
      <div className="card p-6 flex flex-col gap-4">
        <Field label="Revisions per guest">
          <input
            className="input-field"
            type="number"
            min={0}
            max={10}
            value={settings.max_revisions}
            onChange={(e) => set("max_revisions", e.target.value)}
          />
        </Field>
        <Field label="Default max items per person (blank = unlimited)">
          <input
            className="input-field"
            type="number"
            min={0}
            value={settings.default_max_items_per_person ?? ""}
            onChange={(e) => set("default_max_items_per_person", e.target.value)}
          />
        </Field>
        <Toggle label="Capture contact info" checked={settings.capture_contact} onChange={(v) => set("capture_contact", v)} />
        {settings.capture_contact && (
          <div className="pl-4 border-l border-white/10">
            <Toggle label="Name" checked={settings.capture_name} onChange={(v) => set("capture_name", v)} />
            <Toggle label="Email" checked={settings.capture_email} onChange={(v) => set("capture_email", v)} />
            {settings.capture_email && (
              <Toggle label="Require email" checked={settings.require_email} onChange={(v) => set("require_email", v)} />
            )}
            <Toggle label="Phone" checked={settings.capture_phone} onChange={(v) => set("capture_phone", v)} />
          </div>
        )}
        <Field label="ChatGPT designer link (shown to guests when set; blank = hidden)">
          <input
            className="input-field"
            type="url"
            placeholder="https://chatgpt.com/g/g-…"
            value={settings.designer_gpt_url ?? ""}
            onChange={(e) => set("designer_gpt_url", e.target.value)}
          />
        </Field>
        <Toggle label="Crew Caricature mode" checked={settings.caricature_enabled} onChange={(v) => set("caricature_enabled", v)} />
        <Toggle label="Live gallery wall" checked={settings.gallery_enabled} onChange={(v) => set("gallery_enabled", v)} />
        <button className="btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save Defaults"}
        </button>
      </div>
    </div>
  );
}
