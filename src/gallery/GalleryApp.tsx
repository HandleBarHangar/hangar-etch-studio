import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { fetchGallery } from "../lib/api";
import type { GalleryDesign } from "../lib/types";

const POLL_MS = 8000;
const BASE = import.meta.env.BASE_URL;

// Live design wall for a venue TV: ?page=gallery&event=<slug>.
// Polls for new designs; shows a join-QR so guests can start from the screen.
export default function GalleryApp({ eventSlug }: { eventSlug: string | null }) {
  const [designs, setDesigns] = useState<GalleryDesign[]>([]);
  const [eventName, setEventName] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  const joinUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("page");
    return url.toString();
  }, []);

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { margin: 1, width: 200, color: { dark: "#06173A", light: "#F4ECD8" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [joinUrl]);

  useEffect(() => {
    let alive = true;
    const poll = () => {
      fetchGallery(eventSlug, 30)
        .then((res) => {
          if (!alive) return;
          if (!res.ok) {
            if (res.error === "GALLERY_DISABLED") setDisabled(true);
            return;
          }
          setDesigns(res.designs);
          setEventName(res.event?.name ?? null);
        })
        .catch(() => undefined);
    };
    poll();
    const t = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [eventSlug]);

  if (disabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="headline text-3xl text-muted">The gallery is off for this event.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <img src={`${BASE}brand/hangar-logo-primary-white.svg`} alt="Hangar Indy" className="h-14" />
          <div>
            <h1 className="headline text-4xl">
              Made Here. <span className="text-gold">Tonight.</span>
            </h1>
            {eventName && <p className="text-muted">{eventName}</p>}
          </div>
        </div>
        {qr && (
          <div className="text-center">
            <img src={qr} alt="Scan to make yours" className="h-28 w-28 rounded-lg" />
            <p className="text-xs text-muted mt-1">Scan to make yours</p>
          </div>
        )}
      </header>

      {designs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="headline text-3xl text-muted animate-pulse">
            First design lands here any minute…
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {designs.map((d) => (
            <figure key={d.order_code} className="bg-cream rounded-2xl p-3 gallery-pop">
              <img src={d.design_url} alt="" className="w-full aspect-square object-contain rounded-lg" />
              <figcaption className="text-ink text-center text-sm mt-2 font-semibold truncate">
                {d.first_name ?? "Hangar guest"}
                {d.item_label ? ` · ${d.item_label.replace(/^Custom\s+/i, "")}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
