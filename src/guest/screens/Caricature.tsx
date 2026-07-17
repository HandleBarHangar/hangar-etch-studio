import { Camera } from "lucide-react";
import { BackLink, ErrorBanner, TwoBeat } from "../components";

interface Props {
  error: string | null;
  onCapture: (file: File) => void;
  onBack: () => void;
}

export default function Caricature({ error, onCapture, onBack }: Props) {
  return (
    <div className="flex flex-col gap-6 pt-4">
      <TwoBeat a="The Crew." b="Cartooned." size="text-4xl" />
      <ErrorBanner message={error} />

      <label className="card p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-gold/40 transition">
        <Camera className="h-12 w-12 text-gold" />
        <span className="headline text-2xl">Snap the group</span>
        <span className="text-muted text-sm text-center">
          We'll turn each person into a clean engraved character. Best with a clear, well-lit photo
          of everyone facing the camera.
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onCapture(f);
          }}
        />
      </label>

      <label className="text-center text-muted text-sm underline underline-offset-4 cursor-pointer">
        Or upload an existing group photo
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onCapture(f);
          }}
        />
      </label>
      <BackLink onClick={onBack} />
    </div>
  );
}
