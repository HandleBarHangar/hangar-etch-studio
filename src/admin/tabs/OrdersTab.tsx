import { useCallback, useEffect, useState } from "react";
import { adminCall } from "../../lib/api";
import { Notice } from "../common";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Order = any;

export default function OrdersTab({ passcode }: { passcode: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const res = await adminCall<{ orders: Order[] }>(passcode, "orders_list", { limit: 25 });
    if (res.ok) setOrders(res.orders ?? []);
    else setNotice({ kind: "err", message: "Couldn't load orders." });
  }, [passcode]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = async (orderId: string) => {
    setBusyId(orderId);
    setNotice(null);
    try {
      const res = await adminCall(passcode, "clickup_retry", { order_id: orderId });
      if (!res.ok) throw new Error(res.detail || res.error);
      setNotice({ kind: "ok", message: "Work order created in ClickUp." });
      void load();
    } catch (e) {
      setNotice({ kind: "err", message: `Retry failed: ${e instanceof Error ? e.message : "unknown"}` });
    } finally {
      setBusyId(null);
    }
  };

  const testClickup = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const res = await adminCall<{ task_url: string }>(passcode, "clickup_test");
      if (!res.ok) throw new Error(res.detail || res.error);
      setNotice({ kind: "ok", message: `Test task created — check Afterburners: ${res.task_url}` });
    } catch (e) {
      setNotice({ kind: "err", message: `Test failed: ${e instanceof Error ? e.message : "unknown"}` });
    } finally {
      setTesting(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    setNotice(null);
    try {
      const res = await adminCall<{ rows: any[] }>(passcode, "orders_export", {});
      if (!res.ok) throw new Error(res.error);
      const rows = res.rows ?? [];
      const headers = [
        "order_code", "created_at", "event", "item_label", "input_mode", "guest_name",
        "guest_email", "guest_phone", "marketing_opt_in", "celebrating", "table_tag",
        "entry_mode", "design_url", "clickup_task_url",
      ];
      const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          [
            r.order_code, r.created_at, r.etch_events?.name ?? "", r.item_label ?? "", r.input_mode,
            r.guest_name ?? "", r.guest_email ?? "", r.guest_phone ?? "", r.marketing_opt_in,
            r.celebrating ?? "", r.table_tag ?? "", r.entry_mode, r.design_url ?? "",
            r.clickup_task_url ?? "",
          ].map(esc).join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `etch-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setNotice({ kind: "err", message: `Export failed: ${e instanceof Error ? e.message : "unknown"}` });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {notice && <Notice {...notice} />}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-muted text-sm">Latest 25 submissions. ✅ = ClickUp work order created.</p>
        <div className="flex gap-2">
          <button className="chip" onClick={() => void load()}>Refresh</button>
          <button className="chip" disabled={exporting} onClick={() => void exportCsv()}>
            {exporting ? "Exporting…" : "Export CSV (all)"}
          </button>
          <button className="chip" disabled={testing} onClick={() => void testClickup()}>
            {testing ? "Testing…" : "Create test ClickUp task"}
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((o) => (
            <li key={o.id} className="card p-3 flex items-center gap-4">
              {o.design_url ? (
                <img src={o.design_url} alt="" className="h-14 w-14 rounded-lg bg-white object-contain" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-navy-deep" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-gold">{o.order_code}</p>
                <p className="text-sm truncate">
                  {o.guest_name ?? "Guest"} · {o.item_label ?? "No item"} · {o.input_mode}
                  {o.etch_events?.name ? ` · ${o.etch_events.name}` : ""}
                </p>
                <p className="text-xs text-muted">
                  {new Date(o.created_at).toLocaleString()} · {o.entry_mode}
                </p>
              </div>
              {o.clickup_task_id ? (
                <a
                  href={o.clickup_task_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="chip chip-active"
                  title="Open ClickUp task"
                >
                  ✅ Task
                </a>
              ) : (
                <button
                  className="chip"
                  disabled={busyId === o.id}
                  onClick={() => void retry(o.id)}
                  title={o.clickup_error ?? "Not created yet"}
                >
                  {busyId === o.id ? "Retrying…" : "⚠ Retry ClickUp"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
