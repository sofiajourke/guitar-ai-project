/**
 * One door to everything the app saves.
 * Pages call storage.sessions.save(...) and never care where the data goes.
 */
import type { SessionRecord } from "../lesson/sessionStore";
import type { Profile } from "../lesson/profile";
import type { Settings } from "../app/settings";
import type { SongRecord } from "../song/library";

export interface Storage {
  sessions: {
    list(limit?: number): Promise<SessionRecord[]>;
    save(record: SessionRecord): Promise<boolean>;
    remove(id: string): Promise<boolean>;
  };
  profile: {
    load(): Profile | null;
    save(profile: Profile): void;
  };
  settings: {
    load(): Settings;
    save(settings: Settings): void;
  };
  songs: {
    list(): Promise<SongRecord[]>;
    get(id: string): Promise<SongRecord | null>;
    put(record: SongRecord): Promise<boolean>;
    remove(id: string): Promise<boolean>;
  };
}