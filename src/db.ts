import { MongoClient, type Collection } from "mongodb";

import { LEADERBOARD_STATS } from "./constants.js";

// Bloxity Legion hosting injects MONGODB_URI per game+channel -- an isolated database with
// scoped credentials. A local `npm start` normally has no Mongo reachable, so a missing or
// unreachable URI must degrade to "no persistence" rather than crash the room.

// The persisted client state (what `saveProgress` carries, see sanitize.ts). The client keeps
// nothing in the browser: this document is the player's only save.
export interface PlayerDoc {
  _id: string; // Bloxity user id (guests are never saved)
  username?: string; // display name as of the last save
  wins?: number; // leaderboard
  gears?: number;
  gems?: number;
  speed?: number; // the Speed stat (leaderboard)
  level?: number;
  xp?: number;
  rebirths?: number;
  bestStage?: number;
  owned?: string[]; // owned truck ids (client CARS)
  car?: string; // equipped truck
  magnet?: boolean;
  chestDay?: string;
  parts?: Record<string, number>; // tuning part id -> owned count
  equipped?: Record<string, number>; // tuning part id -> equipped count
  tuneSlots?: number;
  tuneShop?: { period: number; sold: Record<string, number> };
  daily?: { next: number; last: string };
  winsBoostUntil?: number; // epoch ms
  vip?: boolean; // VIP pass (permanent)
  balloonsUntil?: number; // epoch ms (timed Balloons: low gravity)
  wingsUntil?: number; // epoch ms (timed Wings: glide)
  nitroBank?: number; // s
  runs?: Record<string, SavedRun>; // stage k -> record
  playtime?: number; // s with the game visible (leaderboard)
  lastSeen?: number; // epoch ms
  version: number;
  updatedAt: Date;
}

export interface SavedRun {
  best: number;
  medal: number;
  falls: number;
  clears: number;
}

let client: MongoClient | null = null;
let players: Collection<PlayerDoc> | null = null;

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[db] MONGODB_URI not set -- player progress will not persist");
    return;
  }
  try {
    client = new MongoClient(uri);
    await client.connect();
    // No dbName passed to .db() -- the injected URI already points at this game+channel's database.
    players = client.db().collection<PlayerDoc>("players");
    console.log("[db] connected to MongoDB");
    // The leaderboards sort and count by these (leaderboard.ts).
    for (const stat of LEADERBOARD_STATS) {
      players.createIndex({ [stat]: -1 }).catch((err) => console.warn(`[db] index on ${stat} failed`, err));
    }
  } catch (err) {
    console.warn("[db] connect failed -- player progress will not persist:", err);
    client = null;
    players = null;
  }
}

// Null whenever Mongo is unset/unreachable -- every caller must treat that as "skip persistence".
export function getPlayers(): Collection<PlayerDoc> | null {
  return players;
}

// Test-only seam: exercise the save/load logic against an in-memory fake collection.
export function __setPlayersForTest(fake: Collection<PlayerDoc> | null): void {
  players = fake;
}
