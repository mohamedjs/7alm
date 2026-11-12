/** Push an event to every signed-in admin browser (socket.io via Redis). */
export const REALTIME = Symbol("REALTIME");
export interface Realtime {
  toAdmins(event: string, payload: unknown): void;
}
