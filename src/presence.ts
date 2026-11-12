import { ID_PATTERN, POSE_BOUNDS } from "./constants.js";
import type { PlayerState } from "./rooms/schema/WorldState.js";

// Presence: what the other clients need to draw a player's truck (client remotePlayers.js).
// Relayed through the roster as sent, only bounded here -- like the rest of the game it is
// client-authoritative and purely cosmetic.

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// `pose` { x, y, z, yaw, speed, steer, car, air }, ~10x/s.
export function applyPose(p: PlayerState, msg: unknown): void {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;
  const b = POSE_BOUNDS;
  if (!finite(m.x) || !finite(m.y) || !finite(m.z)) return;
  p.x = clamp(m.x, -b.xy, b.xy);
  p.y = clamp(m.y, -b.xy, b.xy);
  p.z = clamp(m.z, -b.xy, b.xy);
  if (finite(m.yaw)) p.yaw = Math.atan2(Math.sin(m.yaw), Math.cos(m.yaw));
  if (finite(m.speed)) p.speed = clamp(m.speed, -b.speed, b.speed);
  if (finite(m.steer)) p.steer = clamp(m.steer, -1, 1);
  if (m.car === "" || (typeof m.car === "string" && ID_PATTERN.test(m.car))) p.car = m.car;
  if (typeof m.air === "boolean") p.air = m.air;
  p.spawned = true;
}
