// Run: node --env-file=.env.local scripts/db-check.mjs test@example.com yourpassword
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

// 1. Signed out: must see nothing
const outsider = await createClient(url, key).from("sessions").select("id");
const blocked = outsider.error?.message.includes("permission denied") || outsider.data?.length === 0;
console.log("signed out blocked:", blocked ? "yes" : "NO, CHECK SECURITY", "(should be yes)");
// 2. Signed in: can write and read own row
const db = createClient(url, key);
const { error: loginError } = await db.auth.signInWithPassword({ email, password });
if (loginError) throw loginError;

const id = `check-${Date.now()}`;
const insert = await db.from("sessions").insert({
  id, exercise_id: "spider", mode: "loop", tempo: 60,
  started_at: new Date().toISOString(), duration_ms: 1000, accuracy: 1,
});
console.log("insert:", insert.error?.message ?? "ok");

const read = await db.from("sessions").select("id").eq("id", id);
console.log("read back:", read.data?.length, "(should be 1)");

// 3. Clean up
await db.from("sessions").delete().eq("id", id);
await db.auth.signOut();