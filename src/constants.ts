// Keep in step with the client's src/config.js by hand.
export const ROOM_MAX_CLIENTS = 50;

// Longest accepted strings.
export const NAME_MAX = 64;
// Profile picture URL (Bloxity `pfp`).
export const PFP_MAX_LEN = 512;

// Colyseus drops the whole connection for a WebSocket message above this (default 4 KB).
export const MAX_PAYLOAD_BYTES = 128 * 1024;

// How long a dropped connection (WiFi blip, backgrounded tab) may reconnect with the same session.
export const RECONNECT_SECONDS = 20;

// Upper bounds for saved values, so a forged payload cannot store a bogus number. Generous
// ceilings, not game rules.
export const CURRENCY_MAX = 1e33; // wins, gears, gems
export const SPEED_MAX = 1e33; // the Speed stat and its XP bar
export const LEVEL_MAX = 1e6;
export const REBIRTHS_MAX = 1e9;
export const PLAY_SECONDS_MAX = 31_536_000; // ~1 year

// Client config.js: STAGES.count (20), CARS (~20), TUNING.parts, TUNING.maxSlots (20), DAILY (7).
export const STAGES_MAX = 100;
export const OWNED_MAX = 256;
export const PARTS_KINDS_MAX = 128;
export const PART_COUNT_MAX = 1e6;
export const TUNE_SLOTS_MAX = 100;
export const DAILY_DAYS = 7;
export const NITRO_BANK_MAX = 1e6; // s
export const MEDAL_MAX = 3;
export const FALLS_MAX = 1e9;

// Leaderboards (leaderboard.ts; the hub's three boards): the saved doc fields ranked (Wins, Speed,
// Playtime), rows per board and how often the lists are re-read and re-sent.
export const LEADERBOARD_STATS = ["wins", "speed", "playtime"] as const;
export type LeaderboardStat = (typeof LEADERBOARD_STATS)[number];
export const LEADERBOARD_SIZE = 10;
export const LEADERBOARD_EVERY_MS = 30 * 1000;

// One `giftPart` per sender per this long (WorldRoom); extra gifts are dropped without a reply.
export const GIFT_EVERY_MS = 2000;

// Ids from the client's catalogs (cars, tuning parts, rarities): slugs, so nothing odd is stored.
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

// The client's per-browser fallback id for players who are not signed in to Bloxity.
// Guests are never persisted.
export const GUEST_ID_PREFIX = "guest-";
