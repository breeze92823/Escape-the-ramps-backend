import {
  CURRENCY_MAX, SPEED_MAX, LEVEL_MAX, REBIRTHS_MAX, PLAY_SECONDS_MAX, OWNED_MAX, ID_PATTERN, STAGES_MAX,
  PARTS_KINDS_MAX, PART_COUNT_MAX, TUNE_SLOTS_MAX, DAILY_DAYS, NITRO_BANK_MAX, MEDAL_MAX, FALLS_MAX,
} from "./constants.js";
import type { PlayerDoc, SavedRun } from "./db.js";

export function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
export function clampNum(v: number, max: number): number {
  return Math.min(max, Math.max(0, v));
}
export function clampInt(v: number, max: number, min = 0): number {
  return Math.min(max, Math.max(min, Math.floor(v)));
}
function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
const isId = (v: unknown): v is string => typeof v === "string" && ID_PATTERN.test(v);

// Catalog ids (trucks): slug strings, no duplicates, bounded count.
export function sanitizeIds(raw: unknown, max = OWNED_MAX): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isId))].slice(0, max);
}

// { id: n } counts (tuning parts, shop stock): slug ids, whole counts >= 1, bounded kinds.
export function sanitizeCounts(raw: unknown, max = PARTS_KINDS_MAX): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObject(raw)) return out;
  for (const [id, n] of Object.entries(raw)) {
    if (Object.keys(out).length >= max) break;
    if (isId(id) && finite(n) && n >= 1) out[id] = clampInt(n, PART_COUNT_MAX);
  }
  return out;
}

// Stage records keyed by the stage number (1..STAGES_MAX).
export function sanitizeRuns(raw: unknown): Record<string, SavedRun> {
  const out: Record<string, SavedRun> = {};
  if (!isObject(raw)) return out;
  for (const [k, r] of Object.entries(raw)) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || n > STAGES_MAX || !isObject(r)) continue;
    out[String(n)] = {
      best: finite(r.best) ? Math.min(PLAY_SECONDS_MAX, Math.max(0, r.best)) : 0,
      medal: finite(r.medal) ? clampInt(r.medal, MEDAL_MAX) : 0,
      falls: finite(r.falls) ? clampInt(r.falls, FALLS_MAX) : 0,
      clears: finite(r.clears) ? clampInt(r.clears, FALLS_MAX) : 0,
    };
  }
  return out;
}

const dateStr = (v: unknown): string => (typeof v === "string" && v.length <= 16 && /^[0-9-]*$/.test(v) ? v : "");

// The game is client-authoritative -- no server-side gameplay validation. What IS enforced:
// shape and bounds, so a malformed payload can never corrupt this player's own Mongo document.
// A forged number can only ever affect the sender's own save (and its leaderboard rows).
export function sanitizeProgress(raw: unknown): Partial<PlayerDoc> | null {
  if (!isObject(raw)) return null;
  const out: Partial<PlayerDoc> = {};

  if (finite(raw.wins)) out.wins = clampNum(raw.wins, CURRENCY_MAX);
  if (finite(raw.gears)) out.gears = clampNum(raw.gears, CURRENCY_MAX);
  if (finite(raw.gems)) out.gems = clampNum(raw.gems, CURRENCY_MAX);
  if (finite(raw.speed)) out.speed = clampNum(raw.speed, SPEED_MAX);
  if (finite(raw.xp)) out.xp = clampNum(raw.xp, SPEED_MAX);
  if (finite(raw.level)) out.level = clampInt(raw.level, LEVEL_MAX, 1);
  if (finite(raw.rebirths)) out.rebirths = clampInt(raw.rebirths, REBIRTHS_MAX);
  if (finite(raw.bestStage)) out.bestStage = clampInt(raw.bestStage, STAGES_MAX);
  if (typeof raw.magnet === "boolean") out.magnet = raw.magnet;
  if (typeof raw.chestDay === "string") out.chestDay = dateStr(raw.chestDay);
  if (finite(raw.playtime)) out.playtime = clampInt(raw.playtime, PLAY_SECONDS_MAX);
  if (finite(raw.lastSeen)) out.lastSeen = clampInt(raw.lastSeen, Date.now() + 10 * 60 * 1000);

  if (raw.owned !== undefined) out.owned = sanitizeIds(raw.owned);
  if (isId(raw.car) && (!out.owned || out.owned.includes(raw.car))) out.car = raw.car;

  if (raw.parts !== undefined) out.parts = sanitizeCounts(raw.parts);
  if (raw.equipped !== undefined) {
    // Never more equipped than owned, whatever the payload claims.
    const eq = sanitizeCounts(raw.equipped);
    if (out.parts) for (const id of Object.keys(eq)) eq[id] = Math.min(eq[id], out.parts[id] ?? 0);
    out.equipped = Object.fromEntries(Object.entries(eq).filter(([, n]) => n > 0));
  }
  if (finite(raw.tuneSlots)) out.tuneSlots = clampInt(raw.tuneSlots, TUNE_SLOTS_MAX, 1);
  if (isObject(raw.tuneShop) && finite(raw.tuneShop.period)) {
    out.tuneShop = { period: clampInt(raw.tuneShop.period, 1e12, -1), sold: sanitizeCounts(raw.tuneShop.sold, 16) };
  }
  if (isObject(raw.daily)) {
    out.daily = { next: finite(raw.daily.next) ? clampInt(raw.daily.next, DAILY_DAYS - 1) : 0, last: dateStr(raw.daily.last) };
  }
  if (finite(raw.winsBoostUntil)) out.winsBoostUntil = clampInt(raw.winsBoostUntil, Date.now() + 365 * 864e5);
  if (typeof raw.vip === "boolean") out.vip = raw.vip;
  if (finite(raw.balloonsUntil)) out.balloonsUntil = clampInt(raw.balloonsUntil, Date.now() + 365 * 864e5);
  if (finite(raw.wingsUntil)) out.wingsUntil = clampInt(raw.wingsUntil, Date.now() + 365 * 864e5);
  if (finite(raw.nitroBank)) out.nitroBank = clampNum(raw.nitroBank, NITRO_BANK_MAX);
  if (raw.runs !== undefined) out.runs = sanitizeRuns(raw.runs);
  return out;
}
