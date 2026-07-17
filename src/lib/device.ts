// Device + session identity. The device token is a random ID persisted in
// localStorage for best-effort per-person limits (no login by design). A
// session is one design attempt; Start Over begins a new session.

const DEVICE_KEY = "etch_device_token";

export function getDeviceToken(): string {
  try {
    let token = localStorage.getItem(DEVICE_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, token);
    }
    return token;
  } catch {
    // Private browsing with storage blocked — fall back to a per-load token.
    return crypto.randomUUID();
  }
}

export function newSessionId(): string {
  return crypto.randomUUID();
}

export interface UrlParams {
  eventSlug: string | null;
  kiosk: boolean;
  tableTag: string | null;
  page: "guest" | "admin" | "gallery";
}

export function readUrlParams(): UrlParams {
  const p = new URLSearchParams(window.location.search);
  const rawPage = (p.get("page") ?? "").toLowerCase();
  return {
    eventSlug: p.get("event"),
    kiosk: (p.get("mode") ?? "").toLowerCase() === "kiosk",
    tableTag: p.get("table"),
    page: rawPage === "admin" ? "admin" : rawPage === "gallery" ? "gallery" : "guest",
  };
}
