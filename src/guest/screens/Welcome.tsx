import { Mic, Upload, Users, Type } from "lucide-react";
import type { EventContext, InputMode } from "../../lib/types";
import { BrandLockup, TwoBeat } from "../components";

interface Props {
  ctx: EventContext;
  atLimit: boolean;
  onPick: (mode: InputMode) => void;
}

export default function Welcome({ ctx, atLimit, onPick }: Props) {
  const limit = ctx.config.max_items_per_person;
  return (
    <div className="flex flex-col gap-6 pt-4">
      <BrandLockup ctx={ctx} />
      <TwoBeat a="Your Idea." b="Engraved." />
      {ctx.event && (
        <p className="text-center text-muted -mt-2">
          Welcome, <span className="text-cream font-semibold">{ctx.event.name}</span>! ✦
        </p>
      )}

      {atLimit ? (
        <div className="card p-8 text-center mt-4">
          <p className="headline text-2xl text-gold mb-2">
            That's your {limit === 1 ? "one" : limit} for this event ✦
          </p>
          <p className="text-muted">See a Hangar team member if you'd like to make more.</p>
        </div>
      ) : (
        <div className="grid gap-4 mt-2">
          <ModeCard
            icon={<Mic className="h-8 w-8" />}
            title="Describe It"
            sub="Say or type what you want — we'll draw it."
            onClick={() => onPick("describe")}
          />
          <ModeCard
            icon={<Type className="h-8 w-8" />}
            title="Just Text"
            sub="A name, a date, a motto — instant and sharp."
            onClick={() => onPick("text")}
          />
          <ModeCard
            icon={<Upload className="h-8 w-8" />}
            title="Upload My Design"
            sub="Pick a photo from your device (or AirDrop to the iPad first)."
            onClick={() => onPick("upload")}
          />
          {ctx.config.caricature_enabled && (
            <ModeCard
              icon={<Users className="h-8 w-8" />}
              title="Crew Caricature"
              sub="Turn a group photo into engraved characters."
              onClick={() => onPick("caricature")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ModeCard({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card flex items-center gap-5 p-5 text-left active:scale-[0.98] transition hover:border-gold/40"
    >
      <span className="shrink-0 rounded-2xl bg-gold/15 text-gold p-4">{icon}</span>
      <span>
        <span className="headline text-2xl block">{title}</span>
        <span className="text-muted text-sm">{sub}</span>
      </span>
    </button>
  );
}
