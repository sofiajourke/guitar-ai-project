/** The store the app uses. Swap this line to change where data is saved. */
import { syncStore } from "./syncStore";

export const storage = syncStore;
export type { Storage } from "./Storage";
export { flush, syncAll } from "./syncStore";