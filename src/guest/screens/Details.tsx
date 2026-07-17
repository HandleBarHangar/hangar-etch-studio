import { useState } from "react";
import type { EtchConfig, GuestInfo } from "../../lib/types";
import { BackLink, ErrorBanner, TwoBeat } from "../components";

const CELEBRATING = [
  "Birthday",
  "Bachelorette Party",
  "Bachelor Party",
  "Graduation",
  "Anniversary",
  "Engagement/Proposal",
  "Retirement",
] as const;

interface Props {
  config: EtchConfig;
  error: string | null;
  onSubmit: (guest: GuestInfo, celebrating: string | null) => void;
  onBack: () => void;
}

export default function Details({ config, error, onSubmit, onBack }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  const nameMissing = config.capture_name && !name.trim();
  const emailMissing = config.capture_email && config.require_email && !email.trim();

  return (
    <div className="flex flex-col gap-5 pt-4">
      <TwoBeat a="Last Step." b="Make It Yours." size="text-3xl" />
      <ErrorBanner message={error} />

      <div className="card p-5 flex flex-col gap-4">
        {config.capture_name && (
          <input
            className="input-field"
            placeholder="Name (goes on the work order)"
            value={name}
            maxLength={120}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        )}
        {config.capture_email && (
          <input
            className="input-field"
            type="email"
            placeholder={config.require_email ? "Email" : "Email (optional)"}
            value={email}
            maxLength={200}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        {config.capture_phone && (
          <input
            className="input-field"
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            maxLength={40}
            autoComplete="tel"
            onChange={(e) => setPhone(e.target.value)}
          />
        )}
        {(config.capture_email || config.capture_phone) && (
          <label className="flex items-start gap-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-[#F5B921]"
            />
            <span>Drop your info and we'll keep you posted on new merch you can make. No spam.</span>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-center text-sm text-muted">Celebrating something? (optional)</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {CELEBRATING.map((c) => (
            <button
              key={c}
              className={`chip ${celebrating === c ? "chip-active" : ""}`}
              onClick={() => setCelebrating((cur) => (cur === c ? null : c))}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn-primary"
        disabled={nameMissing || emailMissing}
        onClick={() =>
          onSubmit(
            {
              name: name.trim() || undefined,
              email: email.trim() || undefined,
              phone: phone.trim() || undefined,
              marketing_opt_in: optIn,
            },
            celebrating,
          )
        }
      >
        Send My Design →
      </button>
      <BackLink onClick={onBack} />
    </div>
  );
}
