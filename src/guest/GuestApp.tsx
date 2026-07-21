import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UrlParams } from "../lib/device";
import { getDeviceToken, newSessionId } from "../lib/device";
import {
  fetchEventContext,
  generateCaricature,
  generateDesign,
  sendToPrint,
  uploadToBucket,
} from "../lib/api";
import type { EventContext, EtchItem, GuestInfo, InputMode } from "../lib/types";
import {
  canvasToBlob,
  canvasToSvgBlob,
  loadImage,
  renderFinal,
  renderText,
  TextFontId,
} from "../lib/canvas";
import { LoadingOverlay, ScreenShell } from "./components";
import Welcome from "./screens/Welcome";
import ItemPicker from "./screens/ItemPicker";
import Describe from "./screens/Describe";
import Upload from "./screens/Upload";
import JustText from "./screens/JustText";
import Caricature from "./screens/Caricature";
import Result from "./screens/Result";
import Details from "./screens/Details";
import Confirm from "./screens/Confirm";
import AttractOverlay from "./screens/AttractOverlay";

type Step =
  | "welcome"
  | "item"
  | "describe"
  | "upload"
  | "text"
  | "caricature"
  | "result"
  | "details"
  | "confirm";

// What the Result screen will finalize at submit time.
export type DesignSource =
  | { kind: "remote"; url: string }
  | { kind: "canvas"; canvas: HTMLCanvasElement }
  | { kind: "image"; image: HTMLImageElement; threshold: number | null };

export interface SubmitOutcome {
  orderCode: string;
  clickupOk: boolean;
  perPersonRemaining: number | null;
  finalCanvas: HTMLCanvasElement;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  SOLD_OUT: "That item just sold out for this event — pick another and you're back in business.",
  PER_PERSON_LIMIT: "You've hit this event's per-person limit. A Hangar team member can help with more.",
  ITEM_NOT_OFFERED: "That item isn't offered at this event — pick another.",
  ITEM_REQUIRED: "Pick what we're making first — then send it to print.",
  REVISIONS_EXHAUSTED: "That's the last of your free tweaks — this one's a keeper!",
  RATE_LIMITED: "Whoa, speed racer — give it a few minutes and try again.",
  MODERATION_BLOCKED: "Let's try a different idea — that one's not something we can engrave.",
  GENERATION_NOT_CONFIGURED: "AI design isn't switched on yet — try Upload or Just Text, or grab a team member.",
  CARICATURE_DISABLED: "Caricatures aren't enabled for this event.",
  GENERATION_FAILED: "The sketchpad jammed — give it another try.",
  DESIGN_NOT_FOUND: "We lost track of that design — please try again.",
  NAME_REQUIRED: "We need a name for the work order.",
  EMAIL_REQUIRED: "We need an email for this one.",
  INVALID_EMAIL: "That email doesn't look right.",
  EVENT_INACTIVE: "This event link isn't active — see a Hangar team member.",
};

export function friendlyError(code: string | undefined): string {
  return (code && FRIENDLY_ERRORS[code]) || "Something hiccuped — please try again.";
}

export default function GuestApp({ params }: { params: UrlParams }) {
  const deviceToken = useMemo(getDeviceToken, []);
  const [ctx, setCtx] = useState<EventContext | null>(null);
  const [ctxError, setCtxError] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [mode, setMode] = useState<InputMode>("describe");
  const [item, setItem] = useState<EtchItem | null>(null);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [prompt, setPrompt] = useState("");
  const [design, setDesign] = useState<DesignSource | null>(null);
  const [revisionsLeft, setRevisionsLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [attract, setAttract] = useState(false);
  const pendingGuest = useRef<GuestInfo>({});
  const pendingCelebrating = useRef<string | null>(null);

  const loadContext = useCallback(() => {
    setCtxError(false);
    fetchEventContext(params.eventSlug, deviceToken)
      .then((c) => {
        if (c.ok) setCtx(c);
        else setCtxError(true);
      })
      .catch(() => setCtxError(true));
  }, [params.eventSlug, deviceToken]);

  useEffect(loadContext, [loadContext]);

  // Kiosk idle attract loop: show recent designs after 60s of inactivity on
  // the welcome screen.
  useEffect(() => {
    if (!params.kiosk || step !== "welcome" || !ctx?.config.gallery_enabled) return;
    let timer = window.setTimeout(() => setAttract(true), 60_000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAttract(true), 60_000);
    };
    window.addEventListener("pointerdown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
    };
  }, [params.kiosk, step, ctx?.config.gallery_enabled]);

  const resetAll = useCallback(() => {
    setSessionId(newSessionId());
    setItem(null);
    setPrompt("");
    setDesign(null);
    setRevisionsLeft(null);
    setError(null);
    setOutcome(null);
    pendingGuest.current = {};
    pendingCelebrating.current = null;
    setStep("welcome");
    loadContext(); // refresh sold-out state for the next guest
  }, [loadContext]);

  if (ctxError) {
    return (
      <ScreenShell ctx={null} kiosk={params.kiosk}>
        <div className="card p-8 text-center max-w-md mx-auto mt-16">
          <h1 className="headline text-3xl text-gold mb-3">We hit turbulence</h1>
          <p className="text-muted mb-6">Couldn't reach the studio. Check the connection and try again.</p>
          <button className="btn-primary" onClick={loadContext}>Retry</button>
        </div>
      </ScreenShell>
    );
  }
  if (!ctx) {
    return (
      <ScreenShell ctx={null} kiosk={params.kiosk}>
        <LoadingOverlay label="Opening the studio…" />
      </ScreenShell>
    );
  }

  const config = ctx.config;
  const availableItems = ctx.items.filter((i) => !i.sold_out);
  const atPersonalLimit =
    config.max_items_per_person !== null && ctx.device_orders >= config.max_items_per_person;

  const chooseMode = (m: InputMode) => {
    setMode(m);
    setError(null);
    // Smart skip: one available item auto-selects; none configured → proceed
    // with no item ("Other Engraved Item" on the work order).
    if (availableItems.length === 1) {
      setItem(availableItems[0]);
      setStep(m);
    } else if (availableItems.length === 0 && ctx.items.length === 0) {
      setItem(null);
      setStep(m);
    } else {
      setStep("item");
    }
  };

  const chooseItem = (i: EtchItem) => {
    setItem(i);
    setError(null);
    setStep(mode);
  };

  const runGenerate = async (rawPrompt: string, isTweak: boolean) => {
    const fullPrompt = isTweak && prompt ? `${prompt}. Change: ${rawPrompt}` : rawPrompt;
    setBusy("Sketching your design…");
    setError(null);
    try {
      const res = await generateDesign({
        sessionId,
        deviceToken,
        prompt: fullPrompt,
        eventSlug: params.eventSlug,
      });
      if (!res.ok || !res.design_url) {
        setError(friendlyError(res.error));
        if (res.error === "REVISIONS_EXHAUSTED") setRevisionsLeft(0);
        return;
      }
      setPrompt(fullPrompt);
      setDesign({ kind: "remote", url: res.design_url });
      setRevisionsLeft(res.revisions_left ?? null);
      setStep("result");
    } catch {
      setError(friendlyError(undefined));
    } finally {
      setBusy(null);
    }
  };

  const runCaricature = async (file: File, style: "caricature" | "lineart" = "caricature") => {
    setBusy(style === "lineart" ? "Redrawing for the laser…" : "Scanning the crew…");
    setError(null);
    try {
      const path = `crew/${sessionId}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
      await uploadToBucket(path, file);
      if (style === "caricature") setBusy("Drawing your caricatures…");
      const res = await generateCaricature({
        sessionId,
        deviceToken,
        uploadPath: path,
        eventSlug: params.eventSlug,
        style,
      });
      if (!res.ok || !res.design_url) {
        setError(friendlyError(res.error));
        return;
      }
      setDesign({ kind: "remote", url: res.design_url });
      setRevisionsLeft(res.revisions_left ?? null);
      setStep("result");
    } catch {
      setError(friendlyError(undefined));
    } finally {
      setBusy(null);
    }
  };

  const acceptUpload = (image: HTMLImageElement, threshold: number | null) => {
    setDesign({ kind: "image", image, threshold });
    setRevisionsLeft(revisionsLeft ?? config.max_revisions);
    setStep("result");
  };

  const acceptText = async (text: string, fontId: TextFontId) => {
    setBusy("Setting your type…");
    try {
      const canvas = await renderText(text, fontId);
      setPrompt(text);
      setDesign({ kind: "canvas", canvas });
      setRevisionsLeft(revisionsLeft ?? config.max_revisions);
      setStep("result");
    } finally {
      setBusy(null);
    }
  };

  const finalizeDesign = async (): Promise<HTMLCanvasElement> => {
    if (!design) throw new Error("no design");
    if (design.kind === "canvas") return renderFinal(design.canvas, { threshold: 160 });
    if (design.kind === "image") return renderFinal(design.image, { threshold: design.threshold });
    const img = await loadImage(design.url);
    // AI output should already be B&W; a firm threshold guarantees pure 1-bit.
    return renderFinal(img, { threshold: 200 });
  };

  const submit = async (guest: GuestInfo, celebrating: string | null) => {
    setBusy("Sending to the Hangar…");
    setError(null);
    try {
      const finalCanvas = await finalizeDesign();
      const blob = await canvasToBlob(finalCanvas);
      const finalPath = `final/${sessionId}/${crypto.randomUUID()}.png`;
      await uploadToBucket(finalPath, blob);
      // Vector twin for the engraver — best-effort; never blocks the order.
      let finalSvgPath: string | null = null;
      try {
        const svgBlob = await canvasToSvgBlob(finalCanvas);
        finalSvgPath = `final/${sessionId}/${crypto.randomUUID()}.svg`;
        await uploadToBucket(finalSvgPath, svgBlob);
      } catch {
        finalSvgPath = null;
      }
      const res = await sendToPrint({
        sessionId,
        deviceToken,
        finalPath,
        finalSvgPath,
        inputMode: mode,
        prompt: mode === "describe" || mode === "text" ? prompt : null,
        itemId: item?.id ?? null,
        eventSlug: params.eventSlug,
        tableTag: params.tableTag,
        entryMode: params.kiosk ? "kiosk" : "personal",
        guest,
        celebrating,
      });
      if (!res.ok || !res.order_code) {
        setError(friendlyError(res.error));
        if (res.error === "SOLD_OUT" || res.error === "ITEM_NOT_OFFERED") {
          loadContext();
          setStep("item");
        }
        return;
      }
      setOutcome({
        orderCode: res.order_code,
        clickupOk: res.clickup_ok ?? false,
        perPersonRemaining: res.per_person_remaining ?? null,
        finalCanvas,
      });
      setStep("confirm");
    } catch {
      setError(friendlyError(undefined));
    } finally {
      setBusy(null);
    }
  };

  const onLoveIt = () => {
    setError(null);
    if (config.capture_contact) setStep("details");
    else void submit({}, pendingCelebrating.current);
  };

  return (
    <ScreenShell ctx={ctx} kiosk={params.kiosk}>
      {busy && <LoadingOverlay label={busy} />}
      {attract && (
        <AttractOverlay eventSlug={params.eventSlug} onDismiss={() => setAttract(false)} />
      )}

      {step === "welcome" && (
        <Welcome
          ctx={ctx}
          atLimit={atPersonalLimit}
          onPick={chooseMode}
        />
      )}
      {step === "item" && (
        <ItemPicker
          items={ctx.items}
          error={error}
          onPick={chooseItem}
          onBack={() => setStep("welcome")}
        />
      )}
      {step === "describe" && (
        <Describe
          error={error}
          onGenerate={(p) => void runGenerate(p, false)}
          onBack={() => setStep("welcome")}
        />
      )}
      {step === "upload" && (
        <Upload
          error={error}
          designerUrl={ctx.designer_gpt_url}
          onAccept={acceptUpload}
          onRedraw={(file) => void runCaricature(file, "lineart")}
          onBack={() => setStep("welcome")}
        />
      )}
      {step === "text" && (
        <JustText error={error} onAccept={(t, f) => void acceptText(t, f)} onBack={() => setStep("welcome")} />
      )}
      {step === "caricature" && (
        <Caricature error={error} onCapture={(f) => void runCaricature(f)} onBack={() => setStep("welcome")} />
      )}
      {step === "result" && design && (
        <Result
          design={design}
          item={item}
          mode={mode}
          revisionsLeft={revisionsLeft ?? config.max_revisions}
          error={error}
          onTweak={(t) => void runGenerate(t, true)}
          onRetryCaricature={mode === "caricature" ? () => setStep("caricature") : undefined}
          onLoveIt={onLoveIt}
          onStartOver={resetAll}
        />
      )}
      {step === "details" && (
        <Details
          config={config}
          error={error}
          onSubmit={(guest, celebrating) => {
            pendingGuest.current = guest;
            pendingCelebrating.current = celebrating;
            void submit(guest, celebrating);
          }}
          onBack={() => setStep("result")}
        />
      )}
      {step === "confirm" && outcome && (
        <Confirm
          ctx={ctx}
          outcome={outcome}
          kiosk={params.kiosk}
          onStartAnother={resetAll}
        />
      )}
    </ScreenShell>
  );
}
