import { useCallback, useEffect, useState } from "react";
import { adminCall } from "../lib/api";
import EventsTab from "./tabs/EventsTab";
import CatalogTab from "./tabs/CatalogTab";
import DefaultsTab from "./tabs/DefaultsTab";
import OrdersTab from "./tabs/OrdersTab";

type Tab = "events" | "catalog" | "defaults" | "orders";
const PASS_KEY = "etch_admin_passcode";

// Staff admin. Separate surface (?page=admin), never linked from guest screens.
export default function AdminApp() {
  const [passcode, setPasscode] = useState<string | null>(() => sessionStorage.getItem(PASS_KEY));
  const [entry, setEntry] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<Tab>("events");

  const tryLogin = useCallback(async (code: string) => {
    setChecking(true);
    setAuthError(null);
    try {
      const res = await adminCall(code, "ping");
      if (res.ok) {
        sessionStorage.setItem(PASS_KEY, code);
        setPasscode(code);
      } else {
        setAuthError(
          res.error === "ADMIN_NOT_CONFIGURED"
            ? "Admin passcode isn't configured on the server yet."
            : "Wrong passcode.",
        );
      }
    } catch {
      setAuthError("Couldn't reach the server.");
    } finally {
      setChecking(false);
    }
  }, []);

  // Re-validate a remembered passcode once on load.
  useEffect(() => {
    if (passcode) {
      adminCall(passcode, "ping").then((res) => {
        if (!res.ok) {
          sessionStorage.removeItem(PASS_KEY);
          setPasscode(null);
        }
      }).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!passcode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form
          className="card p-8 w-full max-w-sm flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (entry) void tryLogin(entry);
          }}
        >
          <h1 className="headline text-3xl text-center">
            Hangar Customs <span className="text-gold">Admin</span>
          </h1>
          <input
            className="input-field text-center text-2xl tracking-widest"
            type="password"
            inputMode="numeric"
            placeholder="Passcode"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            autoFocus
          />
          {authError && <p className="text-gold-soft text-sm text-center">{authError}</p>}
          <button className="btn-primary" disabled={checking || !entry}>
            {checking ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="headline text-3xl">
          Hangar Customs <span className="text-gold">Admin</span>
        </h1>
        <nav className="flex gap-2 flex-wrap">
          {(
            [
              ["events", "Events"],
              ["catalog", "Item Catalog"],
              ["defaults", "Defaults"],
              ["orders", "Orders"],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`chip ${tab === id ? "chip-active" : ""}`}
            >
              {label}
            </button>
          ))}
          <button
            className="chip"
            onClick={() => {
              sessionStorage.removeItem(PASS_KEY);
              setPasscode(null);
            }}
          >
            Lock
          </button>
        </nav>
      </header>

      {tab === "events" && <EventsTab passcode={passcode} />}
      {tab === "catalog" && <CatalogTab passcode={passcode} />}
      {tab === "defaults" && <DefaultsTab passcode={passcode} />}
      {tab === "orders" && <OrdersTab passcode={passcode} />}
    </div>
  );
}
