import { useEffect, useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { loadImage, renderPreview } from "../../lib/canvas";
import { BackLink, ErrorBanner, TwoBeat } from "../components";

interface Props {
  error: string | null;
  onAccept: (image: HTMLImageElement, threshold: number | null) => void;
  onBack: () => void;
}

export default function Upload({ error, onAccept, onBack }: Props) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [bwOn, setBwOn] = useState(true);
  const [threshold, setThreshold] = useState(128);
  const [loadError, setLoadError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setLoadError(null);
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      setImage(img);
    } catch {
      setLoadError("Couldn't read that image — try another one.");
    }
  };

  // Live preview: redraw on image/threshold/toggle changes.
  useEffect(() => {
    const holder = previewRef.current;
    if (!holder || !image) return;
    const canvas = renderPreview(image, bwOn ? threshold : null);
    canvas.className = "w-full h-auto rounded-xl";
    holder.replaceChildren(canvas);
  }, [image, bwOn, threshold]);

  return (
    <div className="flex flex-col gap-5 pt-4">
      <TwoBeat a="Your Art." b="Laser-Ready." size="text-4xl" />
      <ErrorBanner message={error ?? loadError} />

      {!image ? (
        <label className="card p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-gold/40 transition">
          <ImageUp className="h-12 w-12 text-gold" />
          <span className="headline text-2xl">Pick a photo</span>
          <span className="text-muted text-sm text-center">
            From your camera roll — or AirDrop it to the iPad first, then find it in Photos.
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
      ) : (
        <>
          <div ref={previewRef} className="bg-cream rounded-2xl p-3" />
          <div className="card p-4 flex flex-col gap-3">
            <label className="flex items-center justify-between">
              <span className="font-semibold">Black &amp; White</span>
              <input
                type="checkbox"
                checked={bwOn}
                onChange={(e) => setBwOn(e.target.checked)}
                className="h-6 w-6 accent-[#F5B921]"
              />
            </label>
            {bwOn && (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted">Contrast</span>
                <input
                  type="range"
                  min={40}
                  max={215}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-[#F5B921]"
                />
              </label>
            )}
            <label className="text-sm text-muted underline underline-offset-4 cursor-pointer">
              Choose a different photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          </div>
          <button className="btn-primary" onClick={() => onAccept(image, bwOn ? threshold : null)}>
            Use This Design →
          </button>
        </>
      )}
      <BackLink onClick={onBack} />
    </div>
  );
}
