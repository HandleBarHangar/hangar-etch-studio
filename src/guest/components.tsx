import type { ReactNode } from "react";
import type { EventContext } from "../lib/types";

const BASE = import.meta.env.BASE_URL;

/** Hangar logo, or the "Hangar × Client" co-brand lockup when the event has one. */
export function BrandLockup({ ctx, compact = false }: { ctx: EventContext | null; compact?: boolean }) {
  const event = ctx?.event ?? null;
  const h = compact ? "h-8" : "h-12";
  return (
    <div className="flex items-center justify-center gap-4">
      <img
        src={`${BASE}brand/hangar-logo-primary-white.svg`}
        alt="Hangar Indy"
        className={`${h} w-auto`}
        onError={(e) => {
          // Missing asset must never break the layout — text wordmark fallback.
          const el = e.currentTarget;
          el.style.display = "none";
          el.insertAdjacentHTML(
            "afterend",
            '<span class="font-display text-gold text-2xl tracking-widest">HANGAR CUSTOMS</span>',
          );
        }}
      />
      {event?.cobrand_logo_url && (
        <>
          <span className="text-muted text-2xl font-light">×</span>
          <img
            src={event.cobrand_logo_url}
            alt={event.cobrand_client_name ?? "Client"}
            className={`${h} w-auto max-w-[140px] object-contain`}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </>
      )}
    </div>
  );
}

export function ScreenShell({
  kiosk,
  children,
}: {
  ctx: EventContext | null;
  kiosk: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`min-h-screen flex flex-col ${kiosk ? "kiosk-locked" : ""}`}>
      <main className="flex-1 w-full max-w-2xl mx-auto px-5 py-6 flex flex-col">{children}</main>
      <footer className="pb-4 text-center text-xs text-muted/60">
        www.HangarIndy.com · Ask a Hangar team member if you need help
      </footer>
    </div>
  );
}

/** Branded loading state: pulsing H-star emblem + reassuring copy. */
export function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-navy-deep/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
      <img
        src={`${BASE}brand/hangar-emblem-hstar-white.png`}
        alt=""
        className="h-20 w-20 animate-pulse"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      <p className="headline text-2xl text-gold">{label}</p>
      <p className="text-muted text-sm">Bold lines engrave best — hang tight.</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-gold/50 bg-gold/10 text-gold-soft px-4 py-3 text-sm mb-4">
      {message}
    </div>
  );
}

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-muted text-sm underline underline-offset-4 mt-6 mx-auto block">
      ← Back
    </button>
  );
}

/** Two-beat headline, second beat in gold. */
export function TwoBeat({ a, b, size = "text-5xl" }: { a: string; b: string; size?: string }) {
  return (
    <h1 className={`headline ${size} text-center`}>
      {a} <span className="text-gold">{b}</span>
    </h1>
  );
}
