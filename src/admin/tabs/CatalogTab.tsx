import { useCallback, useEffect, useState } from "react";
import { adminCall } from "../../lib/api";
import { Field, Notice, Toggle } from "../common";

/* eslint-disable @typescript-eslint/no-explicit-any */
type CatalogItem = any;

// Real "Item Provided" dropdown options from the Afterburners ClickUp list.
const CLICKUP_OPTIONS = [
  { id: "87a8ab66-9892-46b4-8270-4a31f7318545", label: "Custom Mug" },
  { id: "8deb4daf-7a53-4bf7-a410-ced4bedf946c", label: "Custom Mug + Cocktail" },
  { id: "3290128d-b5ac-4c92-97b7-f52fe1174b08", label: "Custom Hat" },
  { id: "e35474d8-35f1-4829-ab2a-1e32f6ed0346", label: "Custom Shirt" },
  { id: "f241342a-b9fd-4fe6-ba8c-9254cbd0203e", label: "Framed Photo" },
  { id: "6c471294-40fd-47e9-a304-c548c87377d8", label: "Other Engraved Item" },
  { id: "1a7657ad-299a-4807-b905-7d55216c7723", label: "Other" },
];

const MOCKUPS = [
  { id: "", label: "No preview" },
  { id: "mug", label: "Mug preview" },
  { id: "hat", label: "Hat preview" },
  { id: "shirt", label: "Shirt preview" },
];

export default function CatalogTab({ passcode }: { passcode: string }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);

  const load = useCallback(async () => {
    const res = await adminCall<{ items: CatalogItem[] }>(passcode, "items_list");
    if (res.ok) setItems(res.items ?? []);
    else setNotice({ kind: "err", message: "Couldn't load the catalog." });
  }, [passcode]);

  useEffect(() => {
    void load();
  }, [load]);

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    await adminCall(passcode, "items_reorder", { ids: next.map((i) => i.id) });
  };

  return (
    <div>
      {notice && <Notice {...notice} />}
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted text-sm max-w-md">
          Items guests can pick. Deactivate rather than delete so past orders keep their history.
          Unmapped items land in ClickUp as "Other Engraved Item" with the label noted.
        </p>
        <button className="btn-secondary !text-base !py-2" onClick={() => setEditing("new")}>
          + Add Item
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={item.id} className={`card p-4 flex items-center gap-4 ${item.active ? "" : "opacity-50"}`}>
            <div className="flex flex-col gap-1">
              <button className="chip !px-2 !py-0.5" onClick={() => void move(i, -1)}>↑</button>
              <button className="chip !px-2 !py-0.5" onClick={() => void move(i, 1)}>↓</button>
            </div>
            <span className="text-3xl">{item.emoji ?? "✦"}</span>
            <span className="flex-1">
              <span className="font-semibold block">{item.label}</span>
              <span className="text-xs text-muted">
                {CLICKUP_OPTIONS.find((o) => o.id === item.clickup_option_id)?.label ??
                  "→ Other Engraved Item"}
                {item.mockup_type ? ` · ${item.mockup_type} preview` : ""}
                {!item.active && " · inactive"}
              </span>
            </span>
            <button className="chip" onClick={() => setEditing(item)}>Edit</button>
          </li>
        ))}
      </ul>

      {editing && (
        <ItemEditor
          passcode={passcode}
          item={editing === "new" ? null : editing}
          onClose={(changed) => {
            setEditing(null);
            if (changed) void load();
          }}
        />
      )}
    </div>
  );
}

function ItemEditor({
  passcode,
  item,
  onClose,
}: {
  passcode: string;
  item: CatalogItem | null;
  onClose: (changed: boolean) => void;
}) {
  const [label, setLabel] = useState(item?.label ?? "");
  const [emoji, setEmoji] = useState(item?.emoji ?? "");
  const [clickupId, setClickupId] = useState(item?.clickup_option_id ?? "");
  const [mockup, setMockup] = useState(item?.mockup_type ?? "");
  const [active, setActive] = useState<boolean>(item?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!label.trim()) {
      setErr("Label is required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        label: label.trim(),
        emoji: emoji.trim() || null,
        clickup_option_id: clickupId || null,
        mockup_type: mockup || null,
        active,
      };
      const res = item
        ? await adminCall(passcode, "item_update", { id: item.id, ...payload })
        : await adminCall(passcode, "item_create", payload);
      if (!res.ok) throw new Error(res.error);
      onClose(true);
    } catch (e) {
      setErr(`Save failed: ${e instanceof Error ? e.message : "unknown"}`);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-navy-deep/80 backdrop-blur-sm overflow-y-auto p-4">
      <div className="card max-w-md mx-auto my-10 p-6 flex flex-col gap-4 bg-navy">
        <div className="flex items-center justify-between">
          <h3 className="headline text-2xl">{item ? "Edit Item" : "New Item"}</h3>
          <button className="chip" onClick={() => onClose(false)}>Close</button>
        </div>
        {err && <Notice kind="err" message={err} />}
        <Field label="Guest-facing label">
          <input className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Custom Pint Glass" />
        </Field>
        <Field label="Emoji (optional)">
          <input className="input-field" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🍺" maxLength={4} />
        </Field>
        <Field label="ClickUp 'Item Provided' mapping">
          <select className="input-field" value={clickupId} onChange={(e) => setClickupId(e.target.value)}>
            <option value="">Not mapped → Other Engraved Item</option>
            {CLICKUP_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="On-product preview">
          <select className="input-field" value={mockup} onChange={(e) => setMockup(e.target.value)}>
            {MOCKUPS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Toggle label="Active (visible to guests)" checked={active} onChange={setActive} />
        <button className="btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save Item"}
        </button>
      </div>
    </div>
  );
}
