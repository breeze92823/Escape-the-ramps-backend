import { matchMaker } from "colyseus";

// Pushes this pod's live public rooms to the Bloxity matchmaker every ~2 s so the game page can
// list them under "Open Rooms" (docs.bloxity.io, HTML5 > Rooms). A no-op outside a Legion
// deployment (the three env vars below are injected there). Private rooms are never listed.
const EVERY_MS = 2000;

export function installRoomReporter(): void {
  const url = process.env.MATCHMAKER_REPORT_URL;
  const token = process.env.BLOXITY_REPORT_TOKEN;
  const gameId = process.env.BLOXITY_GAME_ID;
  if (!url || !token || !gameId) return;
  const podName = process.env.POD_NAME || process.env.HOSTNAME || "pod";

  const tick = async () => {
    try {
      const all = await matchMaker.query({});
      const rooms = all
        .filter((r) => !r.private)
        .map((r) => ({
          colyseusRoomId: r.roomId,
          name: r.name,
          clients: r.clients,
          maxClients: r.maxClients,
          locked: !!r.locked,
          private: !!r.private,
          started: !!(r.metadata as { started?: boolean } | undefined)?.started,
          metadata: r.metadata ?? {},
        }));
      const players = rooms.reduce((n, r) => n + r.clients, 0);
      await fetch(`${url.replace(/\/$/, "")}/${encodeURIComponent(gameId)}/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ podName, players, rooms }),
      });
    } catch (err) {
      console.warn("[room-reporter] report failed", (err as Error)?.message ?? err);
    }
  };
  setInterval(() => void tick(), EVERY_MS).unref();
}
