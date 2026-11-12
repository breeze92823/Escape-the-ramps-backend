import assert from "assert";

import { CURRENCY_MAX } from "../src/constants.js";
import { sanitizeProgress } from "../src/sanitize.js";

describe("sanitizeProgress", () => {
  it("rejects non-objects and bounds numbers", () => {
    assert.strictEqual(sanitizeProgress(null), null);
    assert.strictEqual(sanitizeProgress([1]), null);
    const out = sanitizeProgress({ wins: 1e40, gems: -5, speed: NaN, rebirths: 3.7, magnet: "yes", hack: "x" })!;
    assert.strictEqual(out.wins, CURRENCY_MAX);
    assert.strictEqual(out.gems, 0);
    assert.strictEqual(out.speed, undefined);
    assert.strictEqual(out.rebirths, 3);
    assert.strictEqual(out.magnet, undefined);
    assert.ok(!("hack" in out));
  });

  it("keeps well-formed truck ids and only equips an owned one", () => {
    const out = sanitizeProgress({ owned: ["tiger", "bull", "bull", "Bad Id!", 7], car: "bull" })!;
    assert.deepStrictEqual(out.owned, ["tiger", "bull"]);
    assert.strictEqual(out.car, "bull");
    assert.strictEqual(sanitizeProgress({ owned: ["tiger"], car: "bull" })!.car, undefined);
  });

  it("bounds tuning: equipped never exceeds owned, slots and shop are shaped", () => {
    const out = sanitizeProgress({
      parts: { oil: 2, "bad id": 1, turbo: 0 },
      equipped: { oil: 5, plug: 1 },
      tuneSlots: 9999,
      tuneShop: { period: 12, sold: { common: 2 } },
    })!;
    assert.deepStrictEqual(out.parts, { oil: 2 });
    assert.deepStrictEqual(out.equipped, { oil: 2 });
    assert.strictEqual(out.tuneSlots, 100);
    assert.deepStrictEqual(out.tuneShop, { period: 12, sold: { common: 2 } });
  });

  it("bounds stage runs, daily and dates", () => {
    const out = sanitizeProgress({
      runs: { 1: { best: 12.5, medal: 9, falls: 2, clears: 1 }, 0: {}, x: {}, 500: {} },
      daily: { next: 99, last: "2026-11-12" },
      chestDay: "<script>",
    })!;
    assert.deepStrictEqual(out.runs, { 1: { best: 12.5, medal: 3, falls: 2, clears: 1 } });
    assert.deepStrictEqual(out.daily, { next: 6, last: "2026-11-12" });
    assert.strictEqual(out.chestDay, "");
  });

  it("keeps the VIP flag and bounds the timed Balloons / Wings like the wins boost", () => {
    const far = Date.now() + 1e13;
    const out = sanitizeProgress({ vip: true, balloonsUntil: far, wingsUntil: -5, winsBoostUntil: far })!;
    assert.strictEqual(out.vip, true);
    assert.strictEqual(out.balloonsUntil, out.winsBoostUntil);
    assert.ok(out.balloonsUntil! <= Date.now() + 365 * 864e5);
    assert.strictEqual(out.wingsUntil, 0);
    const bad = sanitizeProgress({ vip: "yes", balloonsUntil: NaN, wingsUntil: "1" })!;
    assert.ok(!("vip" in bad) && !("balloonsUntil" in bad) && !("wingsUntil" in bad));
    assert.strictEqual(sanitizeProgress({ wingsUntil: 1234.7 })!.wingsUntil, 1234);
  });
});
