// Thin client for the etch-* Edge Functions. All enforcement is server-side;
// these helpers just shape requests/responses.

import { supabase } from "./supabase";
import type {
  AdminRecord,
  EventContext,
  GalleryDesign,
  GenerateResult,
  GuestInfo,
  InputMode,
  SendResult,
} from "./types";

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // FunctionsHttpError carries the response; surface the server's error code.
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        return (await ctx.json()) as T;
      } catch {
        /* fall through */
      }
    }
    throw error;
  }
  return data as T;
}

export function fetchEventContext(
  eventSlug: string | null,
  deviceToken: string,
): Promise<EventContext> {
  return invoke<EventContext>("etch-event-context", {
    event_slug: eventSlug,
    device_token: deviceToken,
  });
}

export function generateDesign(args: {
  sessionId: string;
  deviceToken: string;
  prompt: string;
  eventSlug: string | null;
}): Promise<GenerateResult> {
  return invoke<GenerateResult>("etch-generate-design", {
    session_id: args.sessionId,
    device_token: args.deviceToken,
    prompt: args.prompt,
    event_slug: args.eventSlug,
  });
}

export function generateCaricature(args: {
  sessionId: string;
  deviceToken: string;
  uploadPath: string;
  eventSlug: string | null;
  style?: "caricature" | "lineart";
}): Promise<GenerateResult> {
  return invoke<GenerateResult>("etch-caricature", {
    session_id: args.sessionId,
    device_token: args.deviceToken,
    upload_path: args.uploadPath,
    event_slug: args.eventSlug,
    style: args.style ?? "caricature",
  });
}

export async function uploadToBucket(path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from("etch-uploads").upload(path, blob, {
    contentType: blob.type || "image/png",
  });
  if (error) throw new Error(error.message);
}

export function sendToPrint(args: {
  sessionId: string;
  deviceToken: string;
  finalPath: string;
  finalSvgPath: string | null;
  inputMode: InputMode;
  prompt: string | null;
  itemId: string | null;
  eventSlug: string | null;
  tableTag: string | null;
  entryMode: "personal" | "kiosk";
  guest: GuestInfo;
  celebrating: string | null;
}): Promise<SendResult> {
  return invoke<SendResult>("etch-send-to-print", {
    session_id: args.sessionId,
    device_token: args.deviceToken,
    final_path: args.finalPath,
    final_svg_path: args.finalSvgPath,
    input_mode: args.inputMode,
    prompt: args.prompt,
    item_id: args.itemId,
    event_slug: args.eventSlug,
    table_tag: args.tableTag,
    entry_mode: args.entryMode,
    guest: args.guest,
    celebrating: args.celebrating,
  });
}

export function fetchGallery(
  eventSlug: string | null,
  limit = 30,
): Promise<{ ok: boolean; error?: string; event: { name: string } | null; designs: GalleryDesign[] }> {
  return invoke("etch-gallery", { event_slug: eventSlug, limit });
}

// ── Admin ──────────────────────────────────────────────────────────────────

export function adminCall<T = AdminRecord>(
  passcode: string,
  action: string,
  payload: AdminRecord = {},
): Promise<T & { ok: boolean; error?: string; detail?: string }> {
  return invoke("etch-admin", { passcode, action, payload });
}
