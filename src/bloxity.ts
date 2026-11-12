import { GUEST_ID_PREFIX } from "./constants.js";

// Bloxity (Legion) platform calls the game server makes. Degrades to a no-op locally.
//   BLOXITY_API_URL  platform API base (injected by Legion hosting)
//   BLOXITY_GAME_ID  this game's id (= the client's GAME_SLUG)
// Docs: https://docs.bloxity.io/#html5 (server token verification).
const apiUrl = () => (process.env.BLOXITY_API_URL || "").replace(/\/$/, "");
const gameId = () => process.env.BLOXITY_GAME_ID || "escape-the-ramps";

// True when deployed: only a verified game token then counts as an identity. Locally (no API URL)
// the client-sent id is used, for development only.
export const canVerify = () => !!apiUrl();

export interface VerifiedUser {
  id: string; // the account id (user._id): the only id the server trusts
  username: string;
  pfp: string;
}

// POST {BLOXITY_API_URL}/v1/auth/game-token/verify -> { valid, user: { _id, username, displayName, pfp } }.
// null = not valid (a guest) or the check failed.
export async function verifyToken(token: unknown): Promise<VerifiedUser | null> {
  const base = apiUrl();
  if (!base || typeof token !== "string" || !token || token.length > 4096) return null;
  try {
    const res = await fetch(`${base}/v1/auth/game-token/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ gameSlug: gameId() }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { valid?: boolean; user?: { _id?: unknown; username?: unknown; displayName?: unknown; pfp?: unknown } };
    const id = body?.user?._id;
    if (!body?.valid || typeof id !== "string" || !id || id.startsWith(GUEST_ID_PREFIX)) return null;
    const name = body.user?.displayName || body.user?.username;
    return { id, username: typeof name === "string" ? name : "", pfp: typeof body.user?.pfp === "string" ? body.user.pfp : "" };
  } catch (err) {
    console.warn("[bloxity] token verify failed", err);
    return null;
  }
}
