import type { EtchItem } from "../../lib/types";
import { BackLink, ErrorBanner, TwoBeat } from "../components";

interface Props {
  items: EtchItem[];
  error: string | null;
  onPick: (item: EtchItem) => void;
  onBack: () => void;
}

export default function ItemPicker({ items, error, onPick, onBack }: Props) {
  const allSoldOut = items.length > 0 && items.every((i) => i.sold_out);
  return (
    <div className="flex flex-col gap-6 pt-4">
      <TwoBeat a="What Are" b="We Making?" size="text-4xl" />
      <ErrorBanner message={error} />

      {allSoldOut ? (
        <div className="card p-8 text-center">
          <p className="headline text-2xl text-gold mb-2">All claimed! ✦</p>
          <p className="text-muted">
            This event's engravings are spoken for — see a Hangar team member.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              disabled={item.sold_out}
              onClick={() => onPick(item)}
              className={`card p-6 flex flex-col items-center gap-2 transition ${
                item.sold_out
                  ? "opacity-40 grayscale pointer-events-none"
                  : "active:scale-[0.97] hover:border-gold/40"
              }`}
            >
              <span className="text-5xl">{item.emoji ?? "✦"}</span>
              <span className="headline text-xl text-center">{item.label}</span>
              {item.sold_out ? (
                <span className="text-xs uppercase tracking-widest text-muted">Sold out</span>
              ) : (
                item.quota_total !== null && (
                  <span className="text-xs text-muted">
                    {Math.max(0, item.quota_total - item.sold)} left
                  </span>
                )
              )}
            </button>
          ))}
        </div>
      )}
      <BackLink onClick={onBack} />
    </div>
  );
}
