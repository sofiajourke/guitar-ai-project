/**
 * The connection to Supabase, read from web/.env.local (and from Vercel's
 * environment variables when deployed). Null when the keys are missing: the
 * app then simply runs browser-only, as it always has.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;