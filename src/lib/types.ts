// Shared types mirroring the etch-* Edge Function payloads.

export interface EtchItem {
  id: string;
  label: string;
  emoji: string | null;
  mockup_type: "mug" | "hat" | "shirt" | null;
  sort_order: number;
  quota_total: number | null;
  sold: number;
  sold_out: boolean;
}

export interface EtchEvent {
  id: string;
  name: string;
  slug: string;
  event_date: string;
  starts_at: string | null;
  ends_at: string | null;
  cobrand_client_name: string | null;
  cobrand_logo_url: string | null;
}

export interface EtchConfig {
  max_revisions: number;
  capture_contact: boolean;
  capture_name: boolean;
  capture_email: boolean;
  capture_phone: boolean;
  require_email: boolean;
  caricature_enabled: boolean;
  gallery_enabled: boolean;
  max_items_per_person: number | null;
}

export interface EventContext {
  ok: boolean;
  event: EtchEvent | null;
  config: EtchConfig;
  items: EtchItem[];
  device_orders: number;
}

export type InputMode = "describe" | "upload" | "caricature" | "text";

export interface GuestInfo {
  name?: string;
  email?: string;
  phone?: string;
  marketing_opt_in?: boolean;
}

export interface SendResult {
  ok: boolean;
  error?: string;
  limit?: number;
  order_code?: string;
  design_url?: string;
  clickup_ok?: boolean;
  per_person_remaining?: number | null;
}

export interface GenerateResult {
  ok: boolean;
  error?: string;
  design_path?: string;
  design_url?: string;
  revisions_left?: number;
}

export interface GalleryDesign {
  order_code: string;
  design_url: string;
  item_label: string | null;
  first_name: string | null;
  created_at: string;
}

// Admin-side rows (loose typing; the admin function is the authority).
// deno-lint / eslint friendly generic record
export type AdminRecord = Record<string, unknown>;
