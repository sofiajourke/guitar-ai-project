/**
 * Session records in Supabase. The browser names fields in camelCase
 * (exerciseId), the database in snake_case (exercise_id); these two functions
 * translate, and every row read back is checked again by parseRecord.
 */
import { parseRecord, type SessionRecord } from "../lesson/sessionStore";
import { supabase } from "./supabaseClient";

function toRow(record: SessionRecord) {
  return {
    id: record.id,
    exercise_id: record.exerciseId,
    mistakes_only: record.mistakesOnly,
    mode: record.mode,
    tempo: Math.round(record.tempo),
    started_at: new Date(record.startedAt).toISOString(),
    duration_ms: Math.round(record.durationMs),
    steps: record.steps,
    attempted: record.attempted,
    clean: record.clean,
    mistakes: record.mistakes,
    not_caught: record.notCaught,
    weak_signal: record.weakSignal,
    skipped: record.skipped,
    accuracy: record.accuracy,
    most_missed: record.mostMissed,
    timeline: record.timeline,
    latency: record.latency,
    fused_notes: record.fusedNotes,
    fused_at_target: record.fusedAtTarget,
  };
}

function fromRow(row: Record<string, unknown>): SessionRecord | null {
  return parseRecord({
    id: row.id,
    exerciseId: row.exercise_id,
    mistakesOnly: row.mistakes_only,
    mode: row.mode,
    tempo: row.tempo,
    startedAt: Date.parse(String(row.started_at)),
    durationMs: row.duration_ms,
    steps: row.steps,
    attempted: row.attempted,
    clean: row.clean,
    mistakes: row.mistakes,
    notCaught: row.not_caught,
    weakSignal: row.weak_signal,
    skipped: row.skipped,
    accuracy: row.accuracy,
    mostMissed: row.most_missed,
    timeline: row.timeline,
    latency: row.latency,
    fusedNotes: row.fused_notes,
    fusedAtTarget: row.fused_at_target,
  });
}

/** Saves (or replaces) one session for the signed-in learner. */
export async function uploadSession(record: SessionRecord): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("sessions").upsert(toRow(record), { onConflict: "user_id,id" });
  return !error;
}

/** Deletes one of the signed-in learner's sessions. */
export async function deleteRemoteSession(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  return !error;
}

/** The signed-in learner's sessions, newest first. Null when it fails. */
export async function downloadSessions(limit = 500): Promise<SessionRecord[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("sessions").select("*").order("started_at", { ascending: false }).limit(limit);
  if (error || !data) return null;
  return data.map((row) => fromRow(row as Record<string, unknown>)).filter((r): r is SessionRecord => r !== null);
}