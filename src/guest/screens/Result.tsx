import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, RotateCcw, TriangleAlert } from "lucide-react";
import type { DesignSource } from "../GuestApp";
import type { EtchItem, InputMode } from "../../lib/types";
import { loadImage, renderPreview } from "../../lib/canvas";
import { analyzeLaserability } from "../../lib/laserability";
import MockupPreview from "../MockupPreview";
import { ErrorBanner, TwoBeat } from "../components";

interface Props {
  design: DesignSource;
  item: EtchItem | null;
  mode: InputMode;
  revisionsLeft: number;
  error: string | null;
  onTweak: (tweak: string) => void;
  onRetryCaricature?: () => void;
  onLoveIt: () => void;
  onStartOver: () => void;
}

export default function Result({
  design,
  item,
  mode,
  revisionsLeft,
  error,
  onTweak,
  onRetryCaricature,
  onLoveIt,
  onStartOver,
}: Props) {
  const [tweakOpen, setTweakOpen] = useState(false);
  const [tweakText, setTweakText] = useState("");
  const [showMockup, setShowMockup] = useState(false);

  // A displayable URL for both the flat preview and the SVG mockup overlay.
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [laserWarnings, setLaserWarnings] = useState<string[]>([]);
  useEffect(() => {
    setLaserWarnings([]);
    if (design.kind === "remote") {
      setDisplayUrl(design.url);
      // AI art is already steered toward outline style, but heavy-fill results
      // still slip through — warn like the upload path does (customer feedback:
      // solid shading collapses on powder-coated tumblers).
      let alive = true;
      loadImage(design.url)
        .then((img) => {
          if (!alive) return;
          // Engraving-specific thresholds (tighter than the upload analyzer):
          // the style directive targets <20% black coverage — solid fills wash
          // out on every product we laser, worst on powder-coated drinkware.
          const { blackRatio, detailScore } = analyzeLaserability(renderPreview(img, 200, 640));
          const warnings: string[] = [];
          if (blackRatio > 0.28) {
            warnings.push(
              "Quite a lot of solid black — heavy shading washes out when engraved. Bold outlines come out best.",
            );
          }
          if (detailScore > 0.09) {
            warnings.push("Very fine detail — tiny lines tend to blur when lasered.");
          }
          setLaserWarnings(warnings);
        })
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    } else if (design.kind === "canvas") {
      setDisplayUrl(design.canvas.toDataURL("image/png"));
    } else {
      setDisplayUrl(renderPreview(design.image, design.threshold, 1024).toDataURL("image/png"));
    }
  }, [design]);

  const canTweak = useMemo(
    () => (mode === "describe" && revisionsLeft > 0) || (mode === "caricature" && revisionsLeft > 0),
    [mode, revisionsLeft],
  );
  const aiMode = mode === "describe" || mode === "caricature";

  return (
    <div className="flex flex-col gap-5 pt-4">
      <TwoBeat a="Made By You." b="Made To Last." size="text-3xl" />
      <ErrorBanner message={error} />

      {displayUrl && (
        <div className="bg-cream rounded-2xl p-4">
          {showMockup && item?.mockup_type ? (
            <MockupPreview designUrl={displayUrl} mockupType={item.mockup_type} />
          ) : (
            <img src={displayUrl} alt="Your design" className="w-full h-auto rounded-xl" />
          )}
        </div>
      )}

      {item?.mockup_type && (
        <button className="chip mx-auto" onClick={() => setShowMockup((s) => !s)}>
          {showMockup ? "See the flat art" : `See it on your ${item.label.replace(/^Custom\s+/i, "")}`}
        </button>
      )}

      {laserWarnings.length > 0 && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft flex gap-2">
          <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            {laserWarnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
            {mode === "describe" && revisionsLeft > 0 && (
              <p className="text-muted mt-1">Try a tweak like "outline style, less shading".</p>
            )}
          </div>
        </div>
      )}

      {aiMode && (
        <p className="text-center text-sm text-muted">
          Revisions left: <span className="text-gold font-semibold">{revisionsLeft}</span>
          {revisionsLeft === 0 && " — that's the last of your free tweaks. This one's a keeper!"}
        </p>
      )}

      <button className="btn-primary flex items-center justify-center gap-2" onClick={onLoveIt}>
        <Check className="h-6 w-6" /> Love It — Send to Print
      </button>

      {canTweak && mode === "describe" && !tweakOpen && (
        <button className="btn-secondary flex items-center justify-center gap-2" onClick={() => setTweakOpen(true)}>
          <Pencil className="h-5 w-5" /> Tweak It
        </button>
      )}
      {canTweak && mode === "caricature" && onRetryCaricature && (
        <button className="btn-secondary flex items-center justify-center gap-2" onClick={onRetryCaricature}>
          <Pencil className="h-5 w-5" /> Try a Different Photo
        </button>
      )}

      {tweakOpen && (
        <div className="card p-4 flex flex-col gap-3">
          <input
            className="input-field"
            placeholder="What should we change?"
            value={tweakText}
            maxLength={200}
            onChange={(e) => setTweakText(e.target.value)}
          />
          <button
            className="btn-secondary"
            disabled={!tweakText.trim()}
            onClick={() => {
              onTweak(tweakText.trim());
              setTweakOpen(false);
              setTweakText("");
            }}
          >
            Revise →
          </button>
        </div>
      )}

      <button
        className="mx-auto text-muted text-sm underline underline-offset-4 flex items-center gap-1"
        onClick={onStartOver}
      >
        <RotateCcw className="h-4 w-4" /> Start Over
      </button>
    </div>
  );
}
