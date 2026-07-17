import { useEffect, useState } from "react";
import { CheckCircle2, Download, Share2 } from "lucide-react";
import type { EventContext } from "../../lib/types";
import type { SubmitOutcome } from "../GuestApp";
import { downloadCanvas, renderShareCard } from "../../lib/canvas";
import { BrandLockup } from "../components";

const KIOSK_RESET_SECONDS = 12;

interface Props {
  ctx: EventContext;
  outcome: SubmitOutcome;
  kiosk: boolean;
  onStartAnother: () => void;
}

export default function Confirm({ ctx, outcome, kiosk, onStartAnother }: Props) {
  const atLimit = outcome.perPersonRemaining !== null && outcome.perPersonRemaining <= 0;
  const [countdown, setCountdown] = useState(KIOSK_RESET_SECONDS);

  // Kiosk auto-reset (paused when the per-person limit note is showing so the
  // guest has time to read it — a team member can tap Start Anyway).
  useEffect(() => {
    if (!kiosk || atLimit) return;
    const t = window.setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearInterval(t);
  }, [kiosk, atLimit]);

  useEffect(() => {
    if (kiosk && !atLimit && countdown <= 0) onStartAnother();
  }, [countdown, kiosk, atLimit, onStartAnother]);

  const saveDesign = () => downloadCanvas(outcome.finalCanvas, `${outcome.orderCode}.png`);
  const saveShareCard = async () => {
    const card = await renderShareCard(outcome.finalCanvas, outcome.orderCode);
    downloadCanvas(card, `${outcome.orderCode}-share.png`);
  };

  return (
    <div className="flex flex-col gap-6 pt-6 items-center text-center">
      <BrandLockup ctx={ctx} />
      <CheckCircle2 className="h-20 w-20 text-gold" />
      <h1 className="headline text-5xl">
        Sent to the <span className="text-gold">Hangar!</span> ✦
      </h1>
      <p className="text-muted max-w-sm">
        Your design is on its way to our engraver. A team member will set your material and start
        the machine.
      </p>
      <p className="text-sm">
        Order code: <span className="font-mono text-gold font-semibold">{outcome.orderCode}</span>
      </p>
      {!outcome.clickupOk && (
        <p className="text-xs text-muted max-w-xs">
          Heads up: flag a team member and mention your order code — we saved your design, but the
          work-order board needs a nudge.
        </p>
      )}

      {!kiosk && (
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2" onClick={saveDesign}>
            <Download className="h-5 w-5" /> Save Design
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => void saveShareCard()}>
            <Share2 className="h-5 w-5" /> Share Card
          </button>
        </div>
      )}

      {atLimit ? (
        <div className="card p-6 max-w-sm">
          <p className="headline text-xl text-gold mb-1">That's your engraving for this event ✦</p>
          <p className="text-muted text-sm">See a Hangar team member if you'd like more.</p>
          {kiosk && (
            <button className="chip mx-auto mt-4" onClick={onStartAnother}>
              Next guest → start fresh
            </button>
          )}
        </div>
      ) : (
        <button className="btn-primary" onClick={onStartAnother}>
          Start Another
          {kiosk && <span className="ml-2 text-ink/60 text-base">({Math.max(countdown, 0)})</span>}
        </button>
      )}
    </div>
  );
}
