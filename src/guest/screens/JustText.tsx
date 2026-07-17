import { useEffect, useRef, useState } from "react";
import { renderText, TEXT_FONTS, TextFontId } from "../../lib/canvas";
import { BackLink, ErrorBanner, TwoBeat } from "../components";

interface Props {
  error: string | null;
  onAccept: (text: string, fontId: TextFontId) => void;
  onBack: () => void;
}

export default function JustText({ error, onAccept, onBack }: Props) {
  const [text, setText] = useState("");
  const [fontId, setFontId] = useState<TextFontId>("bebas");
  const previewRef = useRef<HTMLDivElement>(null);

  // Debounced live preview.
  useEffect(() => {
    const holder = previewRef.current;
    if (!holder) return;
    if (!text.trim()) {
      holder.replaceChildren();
      return;
    }
    const t = window.setTimeout(() => {
      void renderText(text, fontId).then((canvas) => {
        canvas.className = "w-full h-auto rounded-xl";
        holder.replaceChildren(canvas);
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [text, fontId]);

  return (
    <div className="flex flex-col gap-5 pt-4">
      <TwoBeat a="Say It" b="In Style." size="text-4xl" />
      <p className="text-center text-muted text-sm -mt-3">
        A name, initials, a date — up to 3 lines. Instant, no waiting.
      </p>
      <ErrorBanner message={error} />

      <textarea
        className="input-field min-h-[90px] text-lg text-center"
        placeholder={"SARAH & JAKE\nEST. 2026"}
        value={text}
        maxLength={80}
        rows={3}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="grid grid-cols-3 gap-2">
        {TEXT_FONTS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFontId(f.id)}
            className={`chip text-center ${fontId === f.id ? "chip-active" : ""}`}
            style={{ fontFamily: f.css }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {text.trim() && <div ref={previewRef} className="bg-cream rounded-2xl p-3" />}

      <button className="btn-primary" disabled={!text.trim()} onClick={() => onAccept(text, fontId)}>
        Use This Design →
      </button>
      <BackLink onClick={onBack} />
    </div>
  );
}
