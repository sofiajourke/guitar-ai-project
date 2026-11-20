/** The store the app uses. Swap this line to change where data is saved. */
import { localStore } from "./localStore";

export const storage = localStore;
export type { Storage } from "./Storage";