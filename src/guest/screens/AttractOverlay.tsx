import { useEffect, useState } from "react";
import { fetchGallery } from "../../lib/api";
import type { GalleryDesign } from "../../lib/types";

// Kiosk idle attract loop: cycles recent designs full-screen until tapped.
export default function AttractOverlay({
  eventSlug,
  onDismiss,
}: {
  eventSlug: string | null;
  onDismiss: () => void;
}) {
  const [designs, setDesigns] = useState<GalleryDesign[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetchGallery(eventSlug, 20)
      .then((res) => {
        if (res.ok && res.designs.length > 0) setDesigns(res.designs);
        else onDismiss(); // nothing to show yet
      })
      .catch(onDismiss);
  }, [eventSlug, onDismiss]);

  useEffect(() => {
    if (designs.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % designs.length), 5000);
    return () => window.clearInterval(t);
  }, [designs]);

  if (designs.length === 0) return null;
  const current = designs[index];

  return (
    <button
      className="fixed inset-0 z-40 bg-navy-deep flex flex-col items-center justify-center gap-6 cursor-pointer"
      onClick={onDismiss}
    >
      <p className="headline text-3xl text-gold">Made here today ✦</p>
      <div className="bg-cream rounded-3xl p-6 max-w-md w-[80%] gallery-pop" key={current.order_code}>
        <img src={current.design_url} alt="" className="w-full h-auto rounded-xl" />
      </div>
      {current.first_name && (
        <p className="text-muted">
          by <span className="text-cream font-semibold">{current.first_name}</span>
          {current.item_label ? ` · ${current.item_label}` : ""}
        </p>
      )}
      <p className="headline text-2xl text-cream animate-pulse">Tap to make yours</p>
    </button>
  );
}
