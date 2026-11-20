/** The browser-only store: the functions the app already had, behind one interface. */
import type { Storage } from "./Storage";
import { deleteSession, listSessions, saveSession } from "../lesson/sessionStore";
import { loadProfile, saveProfile } from "../lesson/profile";
import { loadSettings, saveSettings } from "../app/settings";
import { deleteSong, getSong, listSongs, putSong } from "../song/library";

export const localStore: Storage = {
  sessions: { list: listSessions, save: saveSession, remove: deleteSession },
  profile: { load: loadProfile, save: saveProfile },
  settings: { load: loadSettings, save: saveSettings },
  songs: { list: listSongs, get: getSong, put: putSong, remove: deleteSong },
};